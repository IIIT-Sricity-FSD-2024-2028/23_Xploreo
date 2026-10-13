// The server rules the guide mocks must enforce: 401 without login, 403 for the wrong role / owner,
// 400 for invalid or extra fields, the server (not the page) deciding applications and job state.
import { beforeAll, describe, expect, it } from 'vitest';
import { request } from '@/foundation';
import { loadMocks } from '@/dev-stubs/mock/loadMocks.js';
import { storeIdentity } from '@/dev-stubs/auth/session.js';

const as = (id) => storeIdentity(id);
async function failure(promise) {
  try {
    await promise;
    return null;
  } catch (error) {
    return error;
  }
}
const scheduleBody = (over = {}) => ({
  guideId: 'guide-jpr-1', title: 'Test walk', date: '2031-01-10', startTime: '09:00', endTime: '11:00',
  status: 'available', location: 'Jaipur', capacity: 4, notes: '', ...over,
});

beforeAll(async () => {
  await loadMocks();
});

describe('login and role', () => {
  it('answers 401 to a signed-out call and 403 to the wrong role', async () => {
    as('none');
    expect((await failure(request('/guide-assignments/guide/guide-jpr-1'))).status).toBe(401);
    expect((await failure(request('/plans'))).status).toBe(401);
    as('exp-goa-1');
    expect((await failure(request('/guide-assignments/guide/guide-jpr-1'))).status).toBe(403);
    expect((await failure(request('/trips/guide/guide-jpr-1'))).status).toBe(403);
    expect((await failure(request('/schedule'))).status).toBe(403);
  });

  it('lets a guide read only their own rows', async () => {
    as('guide-jpr-1');
    expect((await failure(request('/guide-assignments/guide/guide-del-1'))).status).toBe(403);
    expect((await failure(request('/guide-applications/guide/guide-del-1'))).status).toBe(403);
    expect((await failure(request('/trips/guide/guide-del-1'))).status).toBe(403);
    expect((await failure(request('/schedule', { params: { guideId: 'guide-del-1' } }))).status).toBe(403);
    (await request('/guide-assignments/guide/guide-jpr-1')).forEach((a) => expect(a.guideId).toBe('guide-jpr-1'));
    (await request('/tickets')).forEach((t) => expect(t.userId).toBe('guide-jpr-1'));
  });

  it('seeds a busy guide and an empty one', async () => {
    as('guide-jpr-1');
    expect((await request('/guide-assignments/guide/guide-jpr-1')).map((a) => a.status).sort()).toEqual(
      ['cancelled', 'confirmed', 'confirmed', 'confirmed', 'pending_guide_confirm', 'pending_guide_confirm', 'rejected_by_guide'],
    );
    as('guide-goa-1');
    expect(await request('/guide-assignments/guide/guide-goa-1')).toEqual([]);
    expect(await request('/trips/guide/guide-goa-1')).toEqual([]);
    expect(await request('/schedule')).toEqual([]);
    expect(await request('/tickets')).toEqual([]);
  });
});

describe('applications', () => {
  it('accepts a plan in the guide’s own region and rejects one elsewhere, decided by the server', async () => {
    as('guide-goa-1');
    const ok = await request('/guide-applications', { method: 'POST', body: { planId: 'plan-goa-1', guidePricePerPerson: 1800 } });
    expect(ok.status).toBe('accepted');
    expect(ok.autoDecisionReason).toMatch(/Goa/);
    const wrong = await request('/guide-applications', { method: 'POST', body: { planId: 'plan-ker-1', guidePricePerPerson: 1800 } });
    expect(wrong.status).toBe('rejected');
  });

  it('refuses a second application, a bad price and extra fields', async () => {
    as('guide-goa-1');
    expect((await failure(request('/guide-applications', { method: 'POST', body: { planId: 'plan-goa-1', guidePricePerPerson: 900 } }))).status).toBe(400);
    const bad = await failure(request('/guide-applications', { method: 'POST', body: { planId: 'plan-goa-2', guidePricePerPerson: -5 } }));
    expect(bad.status).toBe(400);
    expect(bad.fieldErrors.guidePricePerPerson).toMatch(/not be less than 0/);
    const extra = await failure(request('/guide-applications', { method: 'POST', body: { planId: 'plan-goa-2', guidePricePerPerson: 10, status: 'accepted' } }));
    expect(extra.status).toBe(400);
    expect((await failure(request('/guide-applications', { method: 'POST', body: { planId: 'nope', guidePricePerPerson: 10 } }))).status).toBe(404);
  });
});

describe('jobs', () => {
  it('moves a pending job to confirmed, once, and only for its own guide', async () => {
    as('guide-del-1');
    expect((await failure(request('/guide-assignments/asg-1/confirm', { method: 'PATCH' }))).status).toBe(403);
    as('guide-jpr-1');
    const confirmed = await request('/guide-assignments/asg-1/confirm', { method: 'PATCH' });
    expect(confirmed.status).toBe('confirmed');
    expect((await failure(request('/guide-assignments/asg-1/confirm', { method: 'PATCH' }))).status).toBe(400);
    expect((await failure(request('/guide-assignments/nope/confirm', { method: 'PATCH' }))).status).toBe(404);
  });

  it('rejects a job and keeps it rejected', async () => {
    as('guide-jpr-1');
    const rejected = await request('/guide-assignments/asg-2/reject', { method: 'PATCH' });
    expect(rejected.status).toBe('rejected_by_guide');
    expect((await failure(request('/guide-assignments/asg-2/reject', { method: 'PATCH' }))).status).toBe(400);
  });

  it('lets a guide read a traveller only when that traveller is on one of their jobs', async () => {
    as('guide-jpr-1');
    expect((await request('/traveller/trav-203')).fname).toBe('Sneha');
    expect((await failure(request('/traveller/trav-208'))).status).toBe(403);
    expect((await failure(request('/traveller/trav-999'))).status).toBe(404);
  });
});

describe('trip tracking', () => {
  it('updates the live status and closes a finished trip', async () => {
    as('guide-jpr-1');
    const moved = await request('/trips/trip-1/tracking', { method: 'PATCH', body: { currentStop: 'Hawa Mahal Photo Stop', currentDay: 1, progressPercentage: 60 } });
    expect(moved.currentStop).toBe('Hawa Mahal Photo Stop');
    expect(moved.progressPercentage).toBe(60);
    const paused = await request('/trips/trip-1/tracking', { method: 'PATCH', body: { trackingStatus: 'paused' } });
    expect(paused.trackingStatus).toBe('paused');
    const done = await request('/trips/trip-1/tracking', { method: 'PATCH', body: { trackingStatus: 'completed' } });
    expect(done.progressPercentage).toBe(100);
    expect(done.status).toBe('completed');
    expect((await failure(request('/trips/trip-1/tracking', { method: 'PATCH', body: { currentDay: 2 } }))).status).toBe(400);
  });

  it('refuses another guide, bad values and extra fields', async () => {
    as('guide-del-1');
    expect((await failure(request('/trips/trip-2/tracking', { method: 'PATCH', body: { trackingStatus: 'ongoing' } }))).status).toBe(403);
    as('guide-jpr-1');
    expect((await failure(request('/trips/trip-2/tracking', { method: 'PATCH', body: { trackingStatus: 'flying' } }))).status).toBe(400);
    expect((await failure(request('/trips/trip-2/tracking', { method: 'PATCH', body: { progressPercentage: 150 } }))).status).toBe(400);
    expect((await failure(request('/trips/trip-2/tracking', { method: 'PATCH', body: { guideId: 'guide-del-1' } }))).status).toBe(400);
    expect((await failure(request('/trips/nope/tracking', { method: 'PATCH', body: {} }))).status).toBe(404);
  });
});

describe('schedule', () => {
  it('creates, edits and deletes the guide’s own item', async () => {
    as('guide-jpr-1');
    const created = await request('/schedule', { method: 'POST', body: scheduleBody() });
    expect(created.guideId).toBe('guide-jpr-1');
    const edited = await request(`/schedule/${created.id}`, { method: 'PATCH', body: { title: 'Renamed walk' } });
    expect(edited.title).toBe('Renamed walk');
    await request(`/schedule/${created.id}`, { method: 'DELETE' });
    expect((await request('/schedule')).some((s) => s.id === created.id)).toBe(false);
  });

  it('validates fields and answers with per-field messages', async () => {
    as('guide-jpr-1');
    const error = await failure(request('/schedule', { method: 'POST', body: scheduleBody({ title: '', startTime: '25:00', capacity: 0 }) }));
    expect(error.status).toBe(400);
    expect(Object.keys(error.fieldErrors).sort()).toEqual(['capacity', 'startTime', 'title']);
    expect((await failure(request('/schedule', { method: 'POST', body: { ...scheduleBody(), admin: true } }))).status).toBe(400);
  });

  it('does not let a guide write to another guide’s schedule', async () => {
    as('guide-jpr-1');
    expect((await failure(request('/schedule', { method: 'POST', body: scheduleBody({ guideId: 'guide-del-1' }) }))).status).toBe(403);
    as('guide-del-1');
    const [theirs] = await request('/schedule');
    as('guide-jpr-1');
    expect((await failure(request(`/schedule/${theirs.id}`, { method: 'PATCH', body: { title: 'Hijacked' } }))).status).toBe(403);
    expect((await failure(request(`/schedule/${theirs.id}`, { method: 'DELETE' }))).status).toBe(403);
  });
});

describe('tickets and reviews', () => {
  it('creates a ticket for the signed-in guide and validates it', async () => {
    as('guide-goa-1');
    const ticket = await request('/tickets', { method: 'POST', body: { subject: 'Cannot log in', message: 'The login page shows an error.', category: 'Technical Issue' } });
    expect(ticket.userId).toBe('guide-goa-1');
    expect(ticket.status).toBe('OPEN');
    expect(await request('/tickets')).toHaveLength(1);
    const bad = await failure(request('/tickets', { method: 'POST', body: { subject: 'x', message: 'short' } }));
    expect(bad.status).toBe(400);
    expect(Object.keys(bad.fieldErrors).sort()).toEqual(['message', 'subject']);
    as('exp-goa-1');
    expect((await failure(request('/tickets', { method: 'POST', body: { subject: 'Hello there', message: 'A long enough message.' } }))).status).toBe(403);
  });

  it('shows a guide only the reviews written about them', async () => {
    as('guide-jpr-1');
    const mine = await request('/reviews');
    expect(mine.length).toBeGreaterThanOrEqual(5);
    mine.forEach((r) => expect(r.targetId).toBe('guide-jpr-1'));
    expect(new Set(mine.map((r) => r.id)).size).toBe(mine.length);
  });
});
