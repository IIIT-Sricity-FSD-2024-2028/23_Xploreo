// Mock domain "schedule": earnings and reviews for experience partners (guide pages come later).
// Earnings are CALCULATED HERE, on the "server", from the same mock bookings the partner sees.
// The real backend has no earnings endpoint yet, so this domain has no real counterpart.
import { registerMock, requireRole } from '@/foundation';
import { bookings, experiences, reviews } from '../partners/db.js';

const PLATFORM_FEE = 0.04;
const round2 = (n) => Math.round(n * 100) / 100;
const sameRegion = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

function earningsStatus(booking) {
  if (booking.status === 'CANCELLED') return 'refunded';
  if (booking.status === 'COMPLETED') return 'completed';
  return 'pending';
}

registerMock('GET', '/experience-bookings/earnings', (ctx) => {
  const user = requireRole(ctx, 'experience');
  const days = ctx.query.days === 'all' ? null : Number(ctx.query.days || 30);
  const mine = new Map(
    experiences.filter((e) => e.partnerId === user.id && sameRegion(e.destination, user.region)).map((e) => [e.id, e]),
  );
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  if (days) cutoff.setDate(cutoff.getDate() - days);
  const cutoffIso = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;

  const rows = bookings
    .filter((b) => mine.has(b.experienceId) && (!days || b.date >= cutoffIso))
    .map((b) => {
      const status = earningsStatus(b);
      const fee = status === 'refunded' ? 0 : round2(b.totalAmount * PLATFORM_FEE);
      return {
        bookingId: b.id,
        guestName: b.guestName,
        experienceId: b.experienceId,
        title: mine.get(b.experienceId).title,
        date: b.date,
        gross: b.totalAmount,
        platformFee: fee,
        net: status === 'refunded' ? 0 : round2(b.totalAmount - fee),
        status,
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const live = rows.filter((r) => r.status !== 'refunded');
  const sum = (list, key) => round2(list.reduce((s, r) => s + r[key], 0));
  const byExp = new Map();
  live.forEach((r) => byExp.set(r.experienceId, (byExp.get(r.experienceId) ?? 0) + r.net));
  const totalNet = sum(live, 'net');
  const weekday = new Map();
  live.forEach((r) => {
    const d = new Date(`${r.date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' });
    weekday.set(d, (weekday.get(d) ?? 0) + 1);
  });
  const top = [...byExp.entries()].sort((a, b) => b[1] - a[1])[0];
  const refundedGross = round2(rows.filter((r) => r.status === 'refunded').reduce((s, r) => s + r.gross, 0));
  const liveGross = sum(live, 'gross');
  const todayIso = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  const heldSlots = [...mine.values()].flatMap((e) => e.slots).filter((s) => s.date <= todayIso && (!days || s.date >= cutoffIso));
  const seatsOffered = heldSlots.reduce((n, s) => n + s.capacity, 0);
  const seatsBooked = heldSlots.reduce((n, s) => n + s.booked, 0);
  const best = [...weekday.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    currency: 'INR',
    platformFeeRate: PLATFORM_FEE,
    window: days ? { days } : { days: null },
    summary: {
      bookingsCount: rows.length,
      cancelledCount: rows.length - live.length,
      cancelRate: rows.length ? round2(((rows.length - live.length) / rows.length) * 100) : 0,
      gross: sum(live, 'gross'),
      platformFee: sum(live, 'platformFee'),
      net: totalNet,
      paidOut: sum(live.filter((r) => r.status === 'completed'), 'net'),
      pending: sum(live.filter((r) => r.status === 'pending'), 'net'),
      refunded: refundedGross,
      refundPercent: liveGross + refundedGross ? round2((refundedGross / (liveGross + refundedGross)) * 100) : 0,
      utilizationPercent: seatsOffered ? Math.round((seatsBooked / seatsOffered) * 100) : 0,
      avgBookingNet: live.length ? round2(totalNet / live.length) : 0,
      topExperience: top ? mine.get(top[0]).title : null,
      bestDay: best ? best[0] : null,
    },
    byExperience: [...byExp.entries()]
      .map(([id, net]) => ({ experienceId: id, title: mine.get(id).title, net: round2(net), sharePercent: totalNet ? Math.round((net / totalNet) * 100) : 0 }))
      .sort((a, b) => b.net - a.net),
    transactions: rows,
  };
});

registerMock('GET', '/reviews', (ctx) => {
  const user = requireRole(ctx, 'experience', 'guide');
  if (user.role === 'guide') return reviews.filter((r) => r.targetType === 'guide' && r.targetId === user.id);
  const mine = new Set(experiences.filter((e) => e.partnerId === user.id).map((e) => e.id));
  return reviews.filter((r) => r.targetType === 'experience' && mine.has(r.targetId));
});
