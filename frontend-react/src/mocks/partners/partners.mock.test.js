// The server rules the mocks must enforce (M2 guide §5, §8): 401 without login, 403 for wrong role /
// owner / region, 400 for extra or invalid fields, full slots unavailable, conflicting slots rejected.
import { beforeAll, describe, expect, it } from 'vitest';
import { request } from '@/foundation';
import { loadMocks } from '@/dev-stubs/mock/loadMocks.js';
import { storeIdentity } from '@/dev-stubs/auth/session.js';
import { dayOffset } from './db.js';

const as = (id) => storeIdentity(id);
async function failure(promise) {
  try {
    await promise;
    return null;
  } catch (error) {
    return error;
  }
}
const validBody = (over = {}) => ({
  title: 'Test Experience', description: 'A test experience for the suite', destination: 'Goa',
  category: 'culture', price: 500, durationHours: 2, capacity: 8, ...over,
});

beforeAll(async () => {
  await loadMocks();
});

describe('login, role and ownership', () => {
  it('answers 401 to a signed-out call', async () => {
    as('none');
    expect((await failure(request('/experience-bookings'))).status).toBe(401);
  });

  it('answers 403 to a guide asking for experience bookings', async () => {
    as('guide-jpr-1');
    expect((await failure(request('/experience-bookings'))).status).toBe(403);
  });

  it('only returns the signed-in partner’s own experiences, in their region', async () => {
    const counts = {};
    for (const id of ['exp-goa-1', 'exp-goa-2', 'exp-del-1', 'exp-ker-1', 'exp-mum-1']) {
      as(id);
      const list = await request('/experiences');
      counts[id] = list.length;
      list.forEach((e) => expect(e.partnerId).toBe(id));
    }
    expect(counts).toEqual({ 'exp-goa-1': 8, 'exp-goa-2': 2, 'exp-del-1': 1, 'exp-ker-1': 0, 'exp-mum-1': 3 });
  });

  it('seeds the empty / one-item / many-items cases', async () => {
    as('exp-ker-1');
    expect(await request('/experience-bookings')).toHaveLength(0);
    as('exp-del-1');
    expect(await request('/experience-bookings')).toHaveLength(1);
    as('exp-goa-1');
    expect((await request('/experience-bookings')).length).toBeGreaterThan(50);
  });

  it('partner B (same region) cannot edit or delete partner A’s experience', async () => {
    as('exp-goa-1');
    const [mine] = await request('/experiences');
    as('exp-goa-2');
    expect((await failure(request(`/experiences/${mine.id}`, { method: 'PATCH', body: { title: 'Hijacked' } }))).status).toBe(403);
    expect((await failure(request(`/experiences/${mine.id}`, { method: 'DELETE' }))).status).toBe(403);
    expect((await failure(request(`/experiences/${mine.id}`))).status).toBe(403);
  });

  it('locks creation to the partner’s own region', async () => {
    as('exp-goa-1');
    const error = await failure(request('/experiences', { method: 'POST', body: validBody({ destination: 'Delhi' }) }));
    expect(error.status).toBe(403);
  });

  it('refuses to create an experience on behalf of another partner', async () => {
    as('exp-goa-1');
    const error = await failure(request('/experiences', { method: 'POST', body: validBody({ partnerId: 'exp-goa-2' }) }));
    expect(error.status).toBe(403);
  });
});

describe('payload validation', () => {
  it('rejects extra fields with a 400 naming the field', async () => {
    as('exp-goa-1');
    const error = await failure(request('/experiences', { method: 'POST', body: validBody({ isFeatured: true }) }));
    expect(error.status).toBe(400);
    expect(error.fieldErrors.isFeatured).toMatch(/should not exist/);
  });

  it('rejects invalid values with per-field errors', async () => {
    as('exp-goa-1');
    const error = await failure(request('/experiences', { method: 'POST', body: validBody({ price: -1, durationHours: 0 }) }));
    expect(error.status).toBe(400);
    expect(Object.keys(error.fieldErrors).sort()).toEqual(['durationHours', 'price']);
  });
});

describe('slots', () => {
  async function pickExperience(title) {
    as('exp-goa-1');
    return (await request('/experiences')).find((e) => e.title === title);
  }

  it('shows a full slot as unavailable, and keeps it unavailable if a client tries to reopen it', async () => {
    const kayak = await pickExperience('Backwater Kayak Safari');
    const full = kayak.slots.find((s) => s.booked >= s.capacity);
    expect(full).toBeDefined();
    expect(full.available).toBe(false);
    const reopened = await request(`/experiences/${kayak.id}`, {
      method: 'PATCH',
      body: { slots: kayak.slots.map((s) => (s.id === full.id ? { ...s, available: true } : s)) },
    });
    expect(reopened.slots.find((s) => s.id === full.id).available).toBe(false);
  });

  it('rejects a conflicting slot with a 400 field error', async () => {
    const exp = await pickExperience('Sunset Beach Photography Walk');
    const existing = exp.slots[0];
    const error = await failure(
      request(`/experiences/${exp.id}`, {
        method: 'PATCH',
        body: { slots: [...exp.slots, { id: 'clash', date: existing.date, time: existing.time, booked: 0, capacity: 5, available: true }] },
      }),
    );
    expect(error.status).toBe(400);
    expect(error.fieldErrors.slots).toMatch(/already exists/);
  });

  it('rejects capacity below the guests already booked', async () => {
    const exp = await pickExperience('Sunset Beach Photography Walk');
    const booked = exp.slots.find((s) => s.booked > 1);
    const error = await failure(
      request(`/experiences/${exp.id}`, {
        method: 'PATCH',
        body: { slots: exp.slots.map((s) => (s.id === booked.id ? { ...s, capacity: 1 } : s)) },
      }),
    );
    expect(error.status).toBe(400);
    expect(error.fieldErrors.slots).toMatch(/cannot be lower/);
  });

  it('adds a slot, and recomputes booked on the server instead of trusting the client', async () => {
    const exp = await pickExperience('Night Market Food Trail');
    const date = dayOffset(20);
    const updated = await request(`/experiences/${exp.id}`, {
      method: 'PATCH',
      body: { slots: [{ id: 'new-1', date, time: '07:00 PM', booked: 99, capacity: 10, available: true }] },
    });
    expect(updated.slots).toHaveLength(1);
    expect(updated.slots[0].booked).toBe(0);
    expect(updated.availability).toBe('available');
    expect(updated.nextSlot).toBe(`${date} 07:00 PM`);
  });

  it('will not remove or move a session that has bookings', async () => {
    const exp = await pickExperience('Sunset Beach Photography Walk');
    const withBookings = exp.slots.find((s) => s.booked > 0);
    const removal = await failure(
      request(`/experiences/${exp.id}`, { method: 'PATCH', body: { slots: exp.slots.filter((s) => s.id !== withBookings.id) } }),
    );
    expect(removal.status).toBe(400);
    const move = await failure(
      request(`/experiences/${exp.id}`, {
        method: 'PATCH',
        body: { slots: exp.slots.map((s) => (s.id === withBookings.id ? { ...s, date: dayOffset(40) } : s)) },
      }),
    );
    expect(move.status).toBe(400);
  });
});

describe('booking status', () => {
  it('lets the owner check a guest in, and no one else', async () => {
    as('exp-goa-1');
    const confirmed = (await request('/experience-bookings')).find((b) => b.status === 'CONFIRMED');
    as('exp-goa-2');
    expect((await failure(request(`/experience-bookings/${confirmed.id}/status`, { method: 'PATCH', body: { status: 'CHECKED_IN' } }))).status).toBe(403);
    as('exp-mum-1');
    expect((await failure(request(`/experience-bookings/${confirmed.id}/status`, { method: 'PATCH', body: { status: 'CHECKED_IN' } }))).status).toBe(403);
    as('exp-goa-1');
    const done = await request(`/experience-bookings/${confirmed.id}/status`, { method: 'PATCH', body: { status: 'CHECKED_IN' } });
    expect(done.status).toBe('CHECKED_IN');
  });

  it('does not let a partner complete a booking, and rejects unknown statuses', async () => {
    as('exp-goa-1');
    const any = (await request('/experience-bookings'))[0];
    expect((await failure(request(`/experience-bookings/${any.id}/status`, { method: 'PATCH', body: { status: 'COMPLETED' } }))).status).toBe(403);
    const bad = await failure(request(`/experience-bookings/${any.id}/status`, { method: 'PATCH', body: { status: 'PAID' } }));
    expect(bad.status).toBe(400);
    expect(bad.fieldErrors.status).toBeDefined();
  });
});

describe('earnings (calculated by the server)', () => {
  it('is empty for a partner with no bookings and only visible to partners', async () => {
    as('exp-ker-1');
    expect((await request('/experience-bookings/earnings', { params: { days: 'all' } })).summary.bookingsCount).toBe(0);
    as('none');
    expect((await failure(request('/experience-bookings/earnings'))).status).toBe(401);
  });

  it('is internally consistent: net = gross - fee, refunds excluded', async () => {
    as('exp-goa-1');
    const data = await request('/experience-bookings/earnings', { params: { days: 'all' } });
    const live = data.transactions.filter((t) => t.status !== 'refunded');
    const round = (n) => Math.round(n * 100) / 100;
    expect(data.summary.net).toBeCloseTo(live.reduce((s, t) => s + t.net, 0), 1);
    expect(data.summary.gross - data.summary.platformFee).toBeCloseTo(data.summary.net, 0);
    expect(data.summary.paidOut + data.summary.pending).toBeCloseTo(data.summary.net, 1);
    expect(round(data.summary.platformFee)).toBeGreaterThan(0);
    data.transactions.filter((t) => t.status === 'refunded').forEach((t) => expect(t.net).toBe(0));
  });
});

describe('partner profile', () => {
  it('saves your own details but not another partner’s, and never a role or region change', async () => {
    as('exp-goa-1');
    const saved = await request('/auth/users/exp-goa-1', { method: 'PATCH', body: { phone: '+91 90000 11111' } });
    expect(saved.phone).toBe('+91 90000 11111');
    expect((await failure(request('/auth/users/exp-goa-2', { method: 'PATCH', body: { phone: '+91 1' } }))).status).toBe(403);
    expect((await failure(request('/auth/users/exp-goa-1', { method: 'PATCH', body: { role: 'superadmin' } }))).status).toBe(403);
    expect((await failure(request('/auth/users/exp-goa-1', { method: 'PATCH', body: { location: 'Delhi' } }))).status).toBe(403);
    expect((await failure(request('/auth/users/exp-goa-1', { method: 'PATCH', body: { name: 'x', sneaky: 1 } }))).status).toBe(400);
  });

  it('keeps GET /auth/users/:id admin-only, as the real API does', async () => {
    as('exp-goa-1');
    expect((await failure(request('/auth/users/exp-goa-1'))).status).toBe(403);
  });
});
