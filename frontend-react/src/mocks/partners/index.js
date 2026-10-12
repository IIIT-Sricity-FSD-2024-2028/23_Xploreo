// Mock domain "partners": experience catalog, partner bookings, partner profile.
// Enforces the server's rules: 401 without login, 403 for wrong role / owner / region,
// 400 for extra or invalid fields. Mirrors backend/src/experiences, experience-bookings, auth.
import { ApiError, registerMock, requireRole, requireUser, assertRegion, assertOwner, whitelist } from '@/foundation';
import {
  ACTIVE, bookings, embedExperience, experiences, findBooking, findExperience, findGuideProfile, findUser,
  newExperienceId, refreshExperience,
} from './db.js';
import { EXPERIENCE_FIELDS, validateExperience } from './validate.js';

const sameRegion = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

function ownExperiences(user) {
  return experiences.filter((e) => e.partnerId === user.id && sameRegion(e.destination, user.region));
}

function loadExperience(ctx) {
  const exp = findExperience(ctx.params.id);
  if (!exp) throw new ApiError(404, `Experience ${ctx.params.id} not found`);
  return exp;
}

// The server owns booked / available / availability / nextSlot. Clients may send them
// (the DTO allows it) but they are recomputed from real bookings.
function applySlots(exp, incoming) {
  const message = (text) => new ApiError(400, text, { slots: text });
  const keys = new Set();
  const ids = new Set();
  for (const slot of incoming) {
    const key = `${slot.date}|${slot.time}`;
    if (keys.has(key)) throw message(`A session already exists on ${slot.date} at ${slot.time}.`);
    if (ids.has(slot.id)) throw message(`Duplicate slot id ${slot.id}.`);
    keys.add(key);
    ids.add(slot.id);
  }
  const previous = new Map(exp.slots.map((s) => [s.id, s]));
  for (const old of exp.slots) {
    if (ids.has(old.id)) continue;
    const held = bookings.filter((b) => b.experienceId === exp.id && b.slotId === old.id && ACTIVE.includes(b.status)).length;
    if (held) throw message(`The ${old.date} ${old.time} session has ${held} booking(s) and cannot be removed.`);
  }
  for (const slot of incoming) {
    const old = previous.get(slot.id);
    if (!old) continue;
    const guests = bookings
      .filter((b) => b.experienceId === exp.id && b.slotId === old.id && ACTIVE.includes(b.status))
      .reduce((sum, b) => sum + b.participants, 0);
    if (guests && (old.date !== slot.date || old.time !== slot.time)) {
      throw message(`The ${old.date} ${old.time} session has bookings and cannot be moved.`);
    }
    if (slot.capacity < guests) {
      throw message(`Capacity for ${slot.date} at ${slot.time} cannot be lower than the ${guests} guests already booked.`);
    }
  }
  exp.slots = incoming.map((s) => ({ id: s.id, date: s.date, time: s.time, booked: 0, capacity: s.capacity, available: s.available }));
}

// ── Experiences ───────────────────────────────────────────────────────────────
registerMock('GET', '/experiences', (ctx) => {
  // Public for travellers; an experience partner only ever gets their own (and only their region's).
  if (ctx.user.role === 'experience') {
    const user = requireUser(ctx);
    return ownExperiences(user).filter((e) => !e.isDeleted);
  }
  return experiences.filter((e) => !e.isDeleted && e.status === 'active');
});

registerMock('POST', '/experiences', (ctx) => {
  const user = requireRole(ctx, 'experience');
  const body = whitelist(ctx.body, EXPERIENCE_FIELDS);
  validateExperience(body, { partial: false });
  if (body.partnerId && body.partnerId !== user.id) throw new ApiError(403, 'You can only create experiences for yourself.');
  assertRegion(ctx, body.destination);
  const exp = {
    id: body.id ?? newExperienceId(user.id),
    partnerId: user.id,
    title: body.title.trim(),
    description: body.description,
    destination: user.region,
    category: body.category,
    availability: 'unavailable',
    price: body.price,
    durationHours: body.durationHours,
    capacity: body.capacity ?? 0,
    booked: 0,
    image: body.image ?? '',
    nextSlot: '',
    slots: [],
    status: body.status ?? 'active',
    isDeleted: false,
  };
  if (body.slots) applySlots(exp, body.slots);
  experiences.push(exp);
  return refreshExperience(exp);
});

registerMock('GET', '/experiences/:id', (ctx) => {
  const exp = loadExperience(ctx);
  if (ctx.user.role === 'experience') {
    assertRegion(ctx, exp.destination);
    assertOwner(ctx, exp.partnerId);
  }
  return exp;
});

registerMock('PATCH', '/experiences/:id', (ctx) => {
  requireRole(ctx, 'experience');
  const exp = loadExperience(ctx);
  assertRegion(ctx, exp.destination);
  assertOwner(ctx, exp.partnerId);
  const body = whitelist(ctx.body, EXPERIENCE_FIELDS);
  validateExperience(body, { partial: true });
  if (body.partnerId && body.partnerId !== exp.partnerId) throw new ApiError(403, 'You cannot transfer an experience to another partner.');
  if (body.destination !== undefined) assertRegion(ctx, body.destination);
  ['title', 'description', 'category', 'price', 'durationHours', 'capacity', 'image', 'status'].forEach((field) => {
    if (body[field] !== undefined) exp[field] = field === 'title' ? body.title.trim() : body[field];
  });
  if (body.slots !== undefined) applySlots(exp, body.slots);
  return refreshExperience(exp);
});

registerMock('DELETE', '/experiences/:id', (ctx) => {
  requireRole(ctx, 'experience');
  const exp = loadExperience(ctx);
  assertRegion(ctx, exp.destination);
  assertOwner(ctx, exp.partnerId);
  experiences.splice(experiences.indexOf(exp), 1);
  return { message: `Experience ${exp.id} deleted` };
});

// ── Experience bookings (partner side) ────────────────────────────────────────
registerMock('GET', '/experience-bookings', (ctx) => {
  const user = requireRole(ctx, 'experience');
  const mine = new Map(ownExperiences(user).map((e) => [e.id, e]));
  return bookings
    .filter((b) => mine.has(b.experienceId))
    .map((b) => ({ ...b, experience: embedExperience(mine.get(b.experienceId)) }));
});

const BOOKING_STATUSES = ['CONFIRMED', 'CANCELLED', 'CHECKED_IN', 'END_REQUESTED', 'COMPLETED'];

registerMock('PATCH', '/experience-bookings/:id/status', (ctx) => {
  const user = requireRole(ctx, 'experience', 'traveller');
  const body = whitelist(ctx.body, ['status']);
  if (!BOOKING_STATUSES.includes(body.status)) {
    const text = `status must be one of the following values: ${BOOKING_STATUSES.join(', ')}`;
    throw new ApiError(400, text, { status: text });
  }
  const booking = findBooking(ctx.params.id);
  if (!booking) throw new ApiError(404, `Booking ${ctx.params.id} not found`);
  const exp = findExperience(booking.experienceId);
  if (user.role === 'experience' && exp) assertRegion(ctx, exp.destination);

  if (body.status === 'COMPLETED') {
    if (user.role !== 'traveller' || booking.travellerId !== user.id) throw new ApiError(403, 'Only the traveller can complete the booking.');
  } else if (body.status === 'CANCELLED') {
    const isTraveller = user.role === 'traveller' && booking.travellerId === user.id;
    const isHost = user.role === 'experience' && exp && exp.partnerId === user.id;
    if (!isTraveller && !isHost) throw new ApiError(403, 'Not authorized to cancel this booking.');
  } else if (user.role !== 'experience' || !exp || exp.partnerId !== user.id) {
    throw new ApiError(403, 'Not authorized to update this booking status.');
  }

  booking.status = body.status;
  if (exp) refreshExperience(exp);
  return { ...booking, experience: embedExperience(exp) };
});

// ── Partner profile (PATCH only: GET /auth/users/:id is admin-only on the real API) ──
const PROFILE_FIELDS = ['username', 'password', 'name', 'email', 'phone', 'role', 'location', 'businessName', 'taxId', 'bankAccount', 'isHighLevelAdmin'];

registerMock('GET', '/auth/users/:id', (ctx) => {
  requireRole(ctx, 'superadmin', 'techadmin', 'nontechadmin');
  const target = findUser(ctx.params.id);
  if (!target) throw new ApiError(404, `User ${ctx.params.id} not found`);
  return target;
});

registerMock('PATCH', '/auth/users/:id', (ctx) => {
  requireUser(ctx);
  const target = findUser(ctx.params.id);
  if (!target) throw new ApiError(404, `User ${ctx.params.id} not found`);
  assertOwner(ctx, target.userId);
  const body = whitelist(ctx.body, PROFILE_FIELDS);
  if (body.role !== undefined || body.location !== undefined || body.isHighLevelAdmin !== undefined) {
    throw new ApiError(403, 'You cannot change your account type or region.');
  }
  const errors = {};
  if (body.name !== undefined && !String(body.name).trim()) errors.name = 'name should not be empty';
  if (body.email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) errors.email = 'email must be an email';
  if (body.phone !== undefined && !String(body.phone).trim()) errors.phone = 'phone should not be empty';
  if (Object.keys(errors).length) throw new ApiError(400, Object.values(errors)[0], errors);
  ['name', 'email', 'phone', 'businessName'].forEach((field) => {
    if (body[field] !== undefined) target[field] = String(body[field]).trim();
  });
  return { ...target };
});

// ── Guide professional details (GET /guide/:id is readable by a signed-in user; PATCH is the guide only) ──
const GUIDE_FIELDS = ['years_exp', 'bio', 'lang_spoken', 'prof_title'];

registerMock('GET', '/guide/:id', (ctx) => {
  requireUser(ctx);
  const guide = findGuideProfile(ctx.params.id);
  if (!guide) throw new ApiError(404, `Guide ${ctx.params.id} not found`);
  return { ...guide };
});

registerMock('PATCH', '/guide/:id', (ctx) => {
  requireRole(ctx, 'guide');
  const guide = findGuideProfile(ctx.params.id);
  if (!guide) throw new ApiError(404, `Guide ${ctx.params.id} not found`);
  assertOwner(ctx, guide.id);
  assertRegion(ctx, guide.location);
  const body = whitelist(ctx.body, GUIDE_FIELDS);
  const errors = {};
  if (body.years_exp !== undefined && !(Number.isInteger(body.years_exp) && body.years_exp >= 0)) errors.years_exp = 'years_exp must not be less than 0';
  if (body.bio !== undefined && String(body.bio).trim().length < 10) errors.bio = 'bio must be longer than or equal to 10 characters';
  if (body.lang_spoken !== undefined && !(Array.isArray(body.lang_spoken) && body.lang_spoken.length && body.lang_spoken.every((l) => typeof l === 'string' && l.trim()))) {
    errors.lang_spoken = 'lang_spoken must be a list of languages';
  }
  if (Object.keys(errors).length) throw new ApiError(400, Object.values(errors)[0], errors);
  Object.assign(guide, body);
  return { ...guide };
});
