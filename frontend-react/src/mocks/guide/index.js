// Mock domain "guide": plans, applications, jobs (assignments), trips + live tracking, travellers,
// schedule and support tickets, for the guide portal. Mirrors backend/src/{plans, guide-applications,
// guide-assignments, trips, traveller, schedule, tickets, reviews}.
//
// The real backend is looser than this in a few places (see MERGE_NOTES.md "Known backend gaps"):
// the mock enforces what the server SHOULD enforce, so the pages are built against the safe behaviour.
import { ApiError, registerMock, requireRole, requireUser, whitelist } from '@/foundation';
import { users } from '../partners/db.js';
import {
  applications, assignments, findAssignment, findPlan, findTrip, newApplicationId, newScheduleId, newTicketId,
  plans, scheduleItems, tickets, travellers, trips,
} from './db.js';

const sameRegion = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
const nowIso = () => new Date().toISOString();
const fieldError = (field, text) => new ApiError(400, text, { [field]: text });

// ── Plans (public to signed-in users; the guide's own region is what they may apply to) ──
registerMock('GET', '/plans', (ctx) => {
  requireUser(ctx);
  const destination = ctx.query.destination;
  return plans.filter((p) => p.isActive && (!destination || sameRegion(p.destination, destination)));
});

registerMock('GET', '/plans/:id', (ctx) => {
  requireUser(ctx);
  const found = findPlan(ctx.params.id);
  if (!found) throw new ApiError(404, `Plan ${ctx.params.id} not found`);
  return found;
});

// ── Guide applications ────────────────────────────────────────────────────────
registerMock('POST', '/guide-applications', (ctx) => {
  const user = requireRole(ctx, 'guide');
  const body = whitelist(ctx.body, ['planId', 'guidePricePerPerson']);
  if (typeof body.planId !== 'string' || !body.planId) throw fieldError('planId', 'planId must be a string');
  const price = body.guidePricePerPerson;
  if (typeof price !== 'number' || !Number.isFinite(price)) throw fieldError('guidePricePerPerson', 'guidePricePerPerson must be a number');
  if (price < 0) throw fieldError('guidePricePerPerson', 'guidePricePerPerson must not be less than 0');
  const target = findPlan(body.planId);
  if (!target) throw new ApiError(404, `Plan ${body.planId} not found`);
  if (applications.some((a) => a.guideId === user.id && a.planId === body.planId && a.status !== 'rejected')) {
    throw new ApiError(400, 'You have already applied for this plan');
  }
  // The server decides, not the page: a guide is accepted only for plans in their own region.
  const match = sameRegion(user.region, target.destination);
  const application = {
    id: newApplicationId(),
    guideId: user.id,
    planId: target.id,
    guidePricePerPerson: price,
    status: match ? 'accepted' : 'rejected',
    autoDecisionReason: match
      ? `Auto-accepted: Guide location '${user.region}' matches plan destination '${target.destination}'`
      : `Auto-rejected: Guide location '${user.region}' does not match plan destination '${target.destination}'`,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  applications.push(application);
  return structuredClone(application);
});

registerMock('GET', '/guide-applications/guide/:guideId', (ctx) => {
  const user = requireRole(ctx, 'guide');
  if (ctx.params.guideId !== user.id) throw new ApiError(403, 'You can only view your own applications.');
  return structuredClone(applications.filter((a) => a.guideId === user.id));
});

// ── Guide assignments (jobs) ──────────────────────────────────────────────────
registerMock('GET', '/guide-assignments/guide/:guideId', (ctx) => {
  const user = requireRole(ctx, 'guide');
  if (ctx.params.guideId !== user.id) throw new ApiError(403, 'You can only view your own jobs.');
  return structuredClone(assignments.filter((a) => a.guideId === user.id));
});

function loadOwnAssignment(ctx) {
  const user = requireRole(ctx, 'guide');
  const found = findAssignment(ctx.params.id);
  if (!found) throw new ApiError(404, `Assignment ${ctx.params.id} not found`);
  if (found.guideId !== user.id) throw new ApiError(403, 'You are not assigned to this booking');
  return found;
}

registerMock('PATCH', '/guide-assignments/:id/confirm', (ctx) => {
  const found = loadOwnAssignment(ctx);
  if (found.status !== 'pending_guide_confirm') {
    throw new ApiError(400, `Only pending assignments can be confirmed (current: ${found.status})`);
  }
  found.status = 'confirmed';
  found.updatedAt = nowIso();
  return structuredClone(found);
});

registerMock('PATCH', '/guide-assignments/:id/reject', (ctx) => {
  const found = loadOwnAssignment(ctx);
  if (found.status !== 'pending_guide_confirm' && found.status !== 'confirmed') {
    throw new ApiError(400, `Cannot reject at this stage (current: ${found.status})`);
  }
  found.status = 'rejected_by_guide';
  found.updatedAt = nowIso();
  return {
    ...structuredClone(found),
    refundAmount: found.paidAmount,
    message: 'Guide has rejected this assignment. Traveller can rebook or cancel.',
  };
});

// ── Travellers: a guide may only read the people on their own jobs ────────────
registerMock('GET', '/traveller/:id', (ctx) => {
  const user = requireRole(ctx, 'guide');
  const found = travellers.find((t) => t.userId === ctx.params.id);
  if (!found) throw new ApiError(404, `Traveller ${ctx.params.id} not found`);
  const onMyJobs = assignments.some((a) => a.guideId === user.id && a.travellerId === found.userId && a.status !== 'cancelled');
  if (!onMyJobs) throw new ApiError(403, 'You can only view travellers who booked you.');
  return structuredClone(found);
});

// ── Trips + live tracking ─────────────────────────────────────────────────────
registerMock('GET', '/trips/guide/:guideId', (ctx) => {
  const user = requireRole(ctx, 'guide');
  if (ctx.params.guideId !== user.id) throw new ApiError(403, 'You can only view your own trips.');
  return structuredClone(trips.filter((t) => t.guideId === user.id));
});

const TRACKING_STATUSES = ['not_started', 'ongoing', 'paused', 'completed'];

registerMock('PATCH', '/trips/:id/tracking', (ctx) => {
  const user = requireRole(ctx, 'guide');
  const trip = findTrip(ctx.params.id);
  if (!trip) throw new ApiError(404, `Trip ${ctx.params.id} not found`);
  if (trip.guideId !== user.id) throw new ApiError(403, 'Only the assigned guide can update tracking');
  const body = whitelist(ctx.body, ['currentDay', 'currentStop', 'currentLocation', 'trackingStatus', 'progressPercentage']);
  if (body.trackingStatus !== undefined && !TRACKING_STATUSES.includes(body.trackingStatus)) {
    throw fieldError('trackingStatus', `trackingStatus must be one of: ${TRACKING_STATUSES.join(', ')}`);
  }
  if (body.progressPercentage !== undefined && !(typeof body.progressPercentage === 'number' && body.progressPercentage >= 0 && body.progressPercentage <= 100)) {
    throw fieldError('progressPercentage', 'progressPercentage must be a number between 0 and 100');
  }
  if (body.currentDay !== undefined && !(Number.isInteger(body.currentDay) && body.currentDay >= 1)) {
    throw fieldError('currentDay', 'currentDay must be a whole number of 1 or more');
  }
  // Mock-only rule: a finished trip is closed.
  if (trip.trackingStatus === 'completed') throw new ApiError(400, 'This trip is already completed.');

  const trackingStatus = body.trackingStatus ?? trip.trackingStatus;
  Object.assign(trip, {
    status: trackingStatus === 'completed' ? 'completed' : trackingStatus === 'ongoing' ? 'started' : trip.status,
    currentDay: body.currentDay ?? trip.currentDay,
    currentStop: body.currentStop ?? trip.currentStop,
    currentLocation: body.currentLocation ?? trip.currentLocation,
    trackingStatus,
    progressPercentage: trackingStatus === 'completed' ? 100 : (body.progressPercentage ?? trip.progressPercentage),
    lastUpdatedAt: nowIso(),
  });
  return structuredClone(trip);
});

// ── Schedule (the real endpoints have no ownership check; the mock does) ──────
const SCHEDULE_FIELDS = ['guideId', 'title', 'date', 'startTime', 'endTime', 'status', 'location', 'capacity', 'notes'];
const SCHEDULE_STATUSES = ['available', 'booked', 'blocked'];

function validateSchedule(body, { partial }) {
  const errors = {};
  const has = (k) => body[k] !== undefined;
  const need = (k) => !partial || has(k);
  if (need('title') && (typeof body.title !== 'string' || !body.title.trim())) errors.title = 'title should not be empty';
  if (need('date') && !/^\d{4}-\d{2}-\d{2}$/.test(String(body.date ?? ''))) errors.date = 'date must be a valid ISO 8601 date string';
  if (need('startTime') && !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(body.startTime ?? ''))) errors.startTime = 'startTime must be a time as HH:MM';
  if (need('endTime') && !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(body.endTime ?? ''))) errors.endTime = 'endTime must be a time as HH:MM';
  if (need('status') && !SCHEDULE_STATUSES.includes(body.status)) errors.status = `status must be one of: ${SCHEDULE_STATUSES.join(', ')}`;
  if (need('location') && (typeof body.location !== 'string' || !body.location.trim())) errors.location = 'location should not be empty';
  if (has('capacity') && !(Number.isInteger(body.capacity) && body.capacity >= 1)) errors.capacity = 'capacity must be a whole number of 1 or more';
  if (Object.keys(errors).length) throw new ApiError(400, Object.values(errors)[0], errors);
}

function loadOwnSchedule(ctx) {
  const user = requireRole(ctx, 'guide');
  const found = scheduleItems.find((s) => String(s.id) === String(ctx.params.id));
  if (!found) throw new ApiError(404, `Schedule item ${ctx.params.id} not found`);
  if (found.guideId !== user.id) throw new ApiError(403, 'This schedule item belongs to another guide.');
  return found;
}

registerMock('GET', '/schedule', (ctx) => {
  const user = requireRole(ctx, 'guide');
  if (ctx.query.guideId && ctx.query.guideId !== user.id) throw new ApiError(403, 'You can only view your own schedule.');
  return structuredClone(scheduleItems.filter((s) => s.guideId === user.id));
});

registerMock('POST', '/schedule', (ctx) => {
  const user = requireRole(ctx, 'guide');
  const body = whitelist(ctx.body, SCHEDULE_FIELDS);
  validateSchedule(body, { partial: false });
  if (body.guideId !== user.id) throw new ApiError(403, 'You can only add items to your own schedule.');
  const item = {
    id: newScheduleId(),
    guideId: user.id,
    title: body.title.trim(),
    date: body.date,
    startTime: body.startTime,
    endTime: body.endTime,
    status: body.status,
    location: body.location.trim(),
    capacity: body.capacity ?? 1,
    notes: (body.notes ?? '').trim(),
    createdAt: nowIso(),
  };
  scheduleItems.push(item);
  return structuredClone(item);
});

registerMock('PATCH', '/schedule/:id', (ctx) => {
  const found = loadOwnSchedule(ctx);
  const body = whitelist(ctx.body, SCHEDULE_FIELDS);
  validateSchedule(body, { partial: true });
  if (body.guideId !== undefined && body.guideId !== found.guideId) throw new ApiError(403, 'A schedule item cannot be moved to another guide.');
  const { guideId: _ignored, ...changes } = body;
  Object.assign(found, changes);
  return structuredClone(found);
});

registerMock('DELETE', '/schedule/:id', (ctx) => {
  const found = loadOwnSchedule(ctx);
  scheduleItems.splice(scheduleItems.indexOf(found), 1);
  return { message: `Schedule item ${found.id} deleted` };
});

// ── Support tickets ───────────────────────────────────────────────────────────
registerMock('GET', '/tickets', (ctx) => {
  const user = requireUser(ctx);
  return structuredClone(tickets.filter((t) => t.userId === user.id));
});

registerMock('POST', '/tickets', (ctx) => {
  const user = requireRole(ctx, 'guide');
  const body = whitelist(ctx.body, ['subject', 'message', 'category', 'priority']);
  const errors = {};
  if (typeof body.subject !== 'string' || body.subject.trim().length < 3 || body.subject.length > 140) {
    errors.subject = 'subject must be between 3 and 140 characters';
  }
  if (typeof body.message !== 'string' || body.message.trim().length < 10 || body.message.length > 1200) {
    errors.message = 'message must be between 10 and 1200 characters';
  }
  if (body.priority !== undefined && !['LOW', 'MEDIUM', 'HIGH'].includes(body.priority)) errors.priority = 'priority must be one of: LOW, MEDIUM, HIGH';
  if (Object.keys(errors).length) throw new ApiError(400, Object.values(errors)[0], errors);
  const ticket = {
    id: newTicketId(),
    userId: user.id,
    userName: users.find((u) => u.userId === user.id)?.name ?? user.id,
    userRole: 'GUIDE',
    travellerId: user.id,
    subject: body.subject.trim(),
    category: body.category || 'General',
    message: body.message.trim(),
    priority: body.priority || 'MEDIUM',
    status: 'OPEN',
    createdAt: nowIso(),
  };
  tickets.push(ticket);
  return structuredClone(ticket);
});
