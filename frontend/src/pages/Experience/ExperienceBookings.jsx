import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import {
  cancelExperienceBookingThunk,
  checkInExperienceBooking,
  requestExperienceBookingEnd,
  selectExperienceBooking,
  selectExperienceBookings,
} from '@/store/experience/bookingsSlice.js';
import { useExperienceBookings } from '@/store/experience/useExperienceBookings.js';
import { compareSlots, formatCurrency, formatDate, todayIso } from '@/lib/datetime.js';
import { STATUS_FILTERS, bookingStatusMeta } from '@/lib/bookingStatus.js';
import ExperiencePage from '@/components/experience/ExperiencePage.jsx';
import ModalFrame, { CloseButton } from '@/components/experience/ModalFrame.jsx';
import { ErrorNotice, LoadingBlock } from '@/components/experience/Feedback.jsx';
import './experienceShared.css';

const longDate = (iso) => formatDate(iso, { month: 'long', day: 'numeric', year: 'numeric' });

const STATUS_COLORS = {
  confirmed: { background: '#dbeafe', color: '#1e40af' },
  checked: { background: '#dcfce7', color: '#166534' },
  pending: { background: '#fef3c7', color: '#92400e' },
  completed: { background: '#dcfce7', color: '#166534' },
  cancelled: { background: '#fee2e2', color: '#991b1b' },
  concluded: { background: '#f1f5f9', color: '#64748b' },
};
const statusStyle = (className) => STATUS_COLORS[className] ?? STATUS_COLORS.cancelled;

export default function ExperienceBookings() {
  const dispatch = useDispatch();
  const [params] = useSearchParams();
  const { data, error, loading, reload } = useExperienceBookings();
  const [experienceId, setExperienceId] = useState(params.get('experience') || 'all');
  const [status, setStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [detailsId, setDetailsId] = useState(null);
  const [confirmCancelBooking, setConfirmCancelBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState('Cancelled by partner due to operational adjustment');
  const [actionError, setActionError] = useState(null);
  const details = useSelector((state) => selectExperienceBooking(state, detailsId));
  const saving = useSelector((state) => selectExperienceBookings(state).saving);

  const bookings = useMemo(() => data ?? [], [data]);
  const today = todayIso();

  const counts = useMemo(() => {
    const list = bookings;
    return {
      total: list.length,
      confirmed: list.filter((b) => b.status === 'CONFIRMED' && b.date >= today).length,
      completed: list.filter((b) => b.status === 'COMPLETED').length,
      revenue: list.filter((b) => b.status === 'COMPLETED').reduce((s, b) => s + (b.totalAmount || 0), 0),
    };
  }, [bookings, today]);

  const experienceOptions = useMemo(() => {
    const seen = new Map();
    bookings.forEach((b) => seen.set(b.experienceId, b.experience?.title ?? 'Experience'));
    return [...seen.entries()].map(([id, title]) => ({ id, title }));
  }, [bookings]);

  // One card per session (experience + date + time), upcoming sessions first, then past ones (newest first).
  const groups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const byKey = new Map();
    bookings
      .filter((b) => {
        if (experienceId !== 'all' && b.experienceId !== experienceId) return false;
        if (status !== 'all' && bookingStatusMeta(b.status).group !== status) return false;
        if (q) {
          const match = [b.guestName, b.email, b.phone, b.id, b.experience?.title]
            .some((v) => String(v ?? '').toLowerCase().includes(q));
          if (!match) return false;
        }
        return true;
      })
      .forEach((b) => {
        const timeVal = b.time || null;
        const key = `${b.experienceId}|${b.date}|${timeVal || 'standard'}`;
        if (!byKey.has(key)) byKey.set(key, { key, title: b.experience?.title ?? 'Experience', date: b.date, time: timeVal, items: [] });
        byKey.get(key).items.push(b);
      });
    const list = [...byKey.values()].sort(compareSlots);
    return [...list.filter((g) => g.date >= today), ...list.filter((g) => g.date < today).reverse()];
  }, [bookings, experienceId, status, searchQuery, today]);

  async function saveStatus(thunk) {
    setActionError(null);
    try {
      await dispatch(thunk);
    } catch (err) {
      setActionError(err);
    }
  }

  async function handleConfirmCancel() {
    if (!confirmCancelBooking) return;
    setActionError(null);
    try {
      await dispatch(cancelExperienceBookingThunk(confirmCancelBooking.id, cancelReason));
      setConfirmCancelBooking(null);
    } catch (err) {
      setActionError(err);
    }
  }

  const detailsMeta = details ? bookingStatusMeta(details.status) : null;

  return (
    <ExperiencePage pageClass="experience-bookings-page" title="Bookings">
      <div className="gd-page-wrapper">
        <main className="gd-page">
          <header className="gd-header">
            <div className="gd-header-text">
              <span className="gd-eyebrow">Experience Portal</span>
              <h1 className="gd-title">Bookings</h1>
              <p className="gd-subtitle">Manage all your experience bookings with quick filters and status actions.</p>
            </div>
          </header>

          {/* Hotel-quality Summary Metrics Strip */}
          <section
            className="gd-card ep-summary-strip"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
              marginBottom: '1.25rem',
              padding: '1.15rem 1.4rem',
              background: '#ffffff',
              borderRadius: '1rem',
              border: '1px solid #e2e8f0',
            }}
          >
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>
                Total Bookings
              </span>
              <strong style={{ display: 'block', fontSize: '1.5rem', color: '#0f172a', marginTop: '0.2rem' }}>
                {counts.total}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>
                Upcoming Confirmed
              </span>
              <strong style={{ display: 'block', fontSize: '1.5rem', color: '#2563eb', marginTop: '0.2rem' }}>
                {counts.confirmed}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>
                Completed Stays
              </span>
              <strong style={{ display: 'block', fontSize: '1.5rem', color: '#16a34a', marginTop: '0.2rem' }}>
                {counts.completed}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>
                Earned Revenue
              </span>
              <strong style={{ display: 'block', fontSize: '1.5rem', color: '#0f172a', marginTop: '0.2rem' }}>
                {formatCurrency(counts.revenue)}
              </strong>
            </div>
          </section>

          <section className="gd-card" style={{ marginBottom: '1.25rem' }}>
            <div className="ep-filter-bar" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <label className="ep-select-shell" htmlFor="searchQuery" style={{ minWidth: 200, flex: 1 }}>
                Search Guests
                <input
                  id="searchQuery"
                  type="text"
                  className="gd-select"
                  placeholder="Search by name, ID, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ height: '2.5rem', background: '#fff' }}
                />
              </label>
              <label className="ep-select-shell" htmlFor="experienceFilter">
                Experience
                <select id="experienceFilter" className="gd-select" value={experienceId} onChange={(event) => setExperienceId(event.target.value)}>
                  <option value="all">All Experiences</option>
                  {experienceOptions.map((option) => <option key={option.id} value={option.id}>{option.title}</option>)}
                </select>
              </label>
              <label className="ep-select-shell" htmlFor="statusFilter">
                Status
                <select id="statusFilter" className="gd-select" value={status} onChange={(event) => setStatus(event.target.value)}>
                  {STATUS_FILTERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'flex-end' }}>
                <button
                  type="button"
                  className="gd-btn gd-btn-secondary gd-btn-sm"
                  onClick={reload}
                  disabled={loading}
                >
                  {loading ? 'Refreshing…' : '↻ Refresh Bookings'}
                </button>
              </div>
            </div>
          </section>

          {!data && loading ? <LoadingBlock label="Loading bookings…" /> : null}
          <ErrorNotice error={error} onRetry={reload} />
          <ErrorNotice error={actionError} />

          {data ? (
            <section className="ep-booking-stack">
              {groups.length ? (
                groups.map((group) => {
                  const guests = group.items.reduce((sum, b) => sum + (b.status === 'CANCELLED' ? 0 : b.participants), 0);
                  const isPastGroup = group.date < today;
                  return (
                    <article key={group.key} className="ep-booking-card" aria-label={`${group.title} on ${group.date}${group.time ? ` at ${group.time}` : ''}`}>
                      <header className="ep-booking-card-header">
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <h2 style={{ margin: 0 }}>{group.title}</h2>
                            {isPastGroup ? (
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: '#f1f5f9', color: '#64748b' }}>
                                Past Session
                              </span>
                            ) : null}
                          </div>
                          <p>{longDate(group.date)}{group.time ? ` • ${group.time}` : ''}</p>
                        </div>
                        <div className="ep-booking-summary">
                          <span className="gd-header-badge">{group.items.length} bookings</span>
                          <strong style={{ color: '#0f172a' }}>Total Guests: {guests}</strong>
                        </div>
                      </header>
                      <div className="ep-booking-table-head">
                        <span>Guest</span><span>Party Size</span><span>Status</span><span>Actions</span>
                      </div>
                      {group.items.map((b) => {
                        const meta = bookingStatusMeta(b.status);
                        const busy = Object.hasOwn(saving, b.id);
                        const isPast = b.date < today;
                        const tooEarly = b.date > today;
                        const isConcluded = isPast && b.status === 'CONFIRMED';
                        return (
                          <div key={b.id} className="ep-booking-user-row">
                            <div>
                              <strong style={{ color: '#0f172a' }}>{b.guestName}</strong>
                              {b.isPackageComponent ? (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    marginLeft: 8,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    padding: '2px 8px',
                                    borderRadius: 999,
                                    background: '#eff6ff',
                                    color: '#1d4ed8',
                                    border: '1px solid #bfdbfe',
                                  }}
                                >
                                  Part of Holiday Package
                                </span>
                              ) : null}
                              <br />
                              <small>{b.id}{b.isPackageComponent && b.tripId ? ` · Trip #${b.tripId}` : ''}</small>
                            </div>
                            <div>{b.participants} guests</div>
                            <div>
                              <span
                                className="gd-chip"
                                style={{
                                  ...(isConcluded ? statusStyle('concluded') : statusStyle(meta.className)),
                                  borderColor: 'transparent',
                                }}
                              >
                                {isConcluded ? 'Session Concluded' : meta.label}
                              </span>
                            </div>
                            <div className="ep-row-actions">
                              <button type="button" className="gd-btn gd-btn-secondary gd-btn-sm" onClick={() => setDetailsId(b.id)}>
                                View Details
                              </button>

                              {/* Hotel-style guard: Back-dated bookings cannot be checked in today */}
                              {b.status === 'CONFIRMED' && !isPast ? (
                                <>
                                  <button
                                    type="button"
                                    className="gd-btn gd-btn-primary gd-btn-sm"
                                    disabled={busy || tooEarly}
                                    title={tooEarly ? `Check-in opens on ${longDate(b.date)}` : undefined}
                                    onClick={() => saveStatus(checkInExperienceBooking(b.id))}
                                    style={tooEarly ? { opacity: 0.65, cursor: 'not-allowed' } : undefined}
                                  >
                                    {busy ? 'Saving…' : tooEarly ? 'Check-in Pending' : 'Mark Check-in'}
                                  </button>
                                  <button
                                    type="button"
                                    className="gd-btn gd-btn-sm"
                                    disabled={busy}
                                    onClick={() => setConfirmCancelBooking(b)}
                                    style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : null}

                              {b.status === 'CHECKED_IN' && !isPast ? (
                                <button type="button" className="gd-btn gd-btn-secondary gd-btn-sm" disabled={busy} onClick={() => saveStatus(requestExperienceBookingEnd(b.id))}>
                                  {busy ? 'Saving…' : 'Request End'}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </article>
                  );
                })
              ) : (
                <div className="gd-empty">
                  <strong style={{ display: 'block', color: '#0f172a', marginBottom: '0.3rem' }}>No bookings found</strong>
                  {bookings.length ? 'Try changing your filters or search term.' : 'Once travellers book one of your sessions, they will appear here.'}
                </div>
              )}
            </section>
          ) : null}

          {/* Details Modal */}
          {details ? (
            <ModalFrame id="bookingModal" boxClass="booking-modal-box" labelledBy="modalName" onClose={() => setDetailsId(null)}>
              <div className="modal-header">
                <div>
                  <h2 id="modalName">{details.guestName}</h2>
                  <div className="modal-sub">
                    <span id="modalId">{details.id}</span>
                    <span id="modalStatus" className={`status-badge ${detailsMeta.className}`}>{detailsMeta.label}</span>
                  </div>
                  {details.isPackageComponent ? (
                    <p style={{ margin: '6px 0 0', fontSize: 12, fontWeight: 600, color: '#1d4ed8' }}>
                      Part of Holiday Package · Trip #{details.tripId}{details.packagePlanId ? ` (Plan ${details.packagePlanId})` : ''}
                    </p>
                  ) : null}
                </div>
                <CloseButton label="Close booking details" glyph="✕" onClick={() => setDetailsId(null)} />
              </div>

              <hr />

              <div className="section">
                <h3>Experience Details</h3>
                <p className="label">Experience</p>
                <p id="modalExperience">{details.experience?.title ?? 'Experience'}</p>
                <div className="grid-3">
                  <div><p className="label">Date</p><p id="modalDate">{longDate(details.date)}</p></div>
                  <div><p className="label">Time</p><p id="modalTime">{details.time || '—'}</p></div>
                  <div><p className="label">Guests</p><p id="modalGuests">{details.participants} guests</p></div>
                </div>
              </div>

              <div className="section">
                <h3>Customer Information</h3>
                <p className="label">Name</p>
                <p id="modalCustomer">{details.guestName}</p>
                <div className="grid-2">
                  <div><p className="label">Phone</p><p id="modalPhone">{details.phone}</p></div>
                  <div><p className="label">Email</p><p id="modalEmail">{details.email}</p></div>
                </div>
              </div>

              <div className="section">
                <h3>Payment</h3>
                <div className="payment-box">
                  <div>
                    <p className="label">Total Amount</p>
                    <h2 id="modalAmount">
                      {details.isPackageComponent && !details.totalAmount
                        ? 'Included in Package'
                        : formatCurrency(details.totalAmount)}
                    </h2>
                  </div>
                  <span id="modalPaymentStatus" className="paid-badge">
                    {details.status === 'CANCELLED'
                      ? 'Refunded'
                      : details.isPackageComponent
                        ? 'Package Component'
                        : 'Paid'}
                  </span>
                </div>
              </div>
            </ModalFrame>
          ) : null}

          {/* Cancel Confirmation Modal */}
          {confirmCancelBooking ? (
            <ModalFrame id="cancelBookingModal" boxClass="booking-modal-box" labelledBy="cancelModalTitle" onClose={() => setConfirmCancelBooking(null)}>
              <div className="modal-header">
                <div>
                  <h2 id="cancelModalTitle" style={{ color: '#991b1b' }}>Cancel Reservation</h2>
                  <div className="modal-sub">
                    <span>Booking #{confirmCancelBooking.id}</span>
                  </div>
                </div>
                <CloseButton label="Close cancel dialog" glyph="✕" onClick={() => setConfirmCancelBooking(null)} />
              </div>

              <hr />

              <div className="section">
                <p style={{ margin: '0 0 1rem 0', color: '#475569', fontSize: '0.9rem' }}>
                  Are you sure you want to cancel the reservation for <strong>{confirmCancelBooking.guestName}</strong> ({confirmCancelBooking.participants} guests) on {longDate(confirmCancelBooking.date)}?
                </p>
                <label className="ep-select-shell" style={{ width: '100%' }}>
                  Reason for Cancellation
                  <input
                    type="text"
                    className="gd-select"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    style={{ width: '100%', marginTop: '0.4rem', height: '2.5rem', background: '#fff' }}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="gd-btn gd-btn-secondary"
                  onClick={() => setConfirmCancelBooking(null)}
                >
                  Keep Reservation
                </button>
                <button
                  type="button"
                  className="gd-btn gd-btn-danger"
                  onClick={handleConfirmCancel}
                >
                  Yes, Cancel Reservation
                </button>
              </div>
            </ModalFrame>
          ) : null}
        </main>
      </div>
    </ExperiencePage>
  );
}
