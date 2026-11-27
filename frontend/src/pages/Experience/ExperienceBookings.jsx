import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { checkInExperienceBooking, requestExperienceBookingEnd, selectExperienceBooking, selectExperienceBookings } from '@/store/experience/bookingsSlice.js';
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
};
const statusStyle = (className) => STATUS_COLORS[className] ?? STATUS_COLORS.cancelled;

export default function ExperienceBookings() {
  const dispatch = useDispatch();
  const [params] = useSearchParams();
  const { data, error, loading, reload } = useExperienceBookings();
  const [experienceId, setExperienceId] = useState(params.get('experience') || 'all');
  const [status, setStatus] = useState('all');
  const [detailsId, setDetailsId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const details = useSelector((state) => selectExperienceBooking(state, detailsId));
  const saving = useSelector((state) => selectExperienceBookings(state).saving);

  const bookings = useMemo(() => data ?? [], [data]);
  const today = todayIso();

  const experienceOptions = useMemo(() => {
    const seen = new Map();
    bookings.forEach((b) => seen.set(b.experienceId, b.experience?.title ?? 'Experience'));
    return [...seen.entries()].map(([id, title]) => ({ id, title }));
  }, [bookings]);

  // One card per session (experience + date + time), upcoming sessions first, then past ones (newest first).
  const groups = useMemo(() => {
    const byKey = new Map();
    bookings
      .filter((b) => (experienceId === 'all' || b.experienceId === experienceId) && (status === 'all' || bookingStatusMeta(b.status).group === status))
      .forEach((b) => {
        const timeVal = b.time || null;
        const key = `${b.experienceId}|${b.date}|${timeVal || 'standard'}`;
        if (!byKey.has(key)) byKey.set(key, { key, title: b.experience?.title ?? 'Experience', date: b.date, time: timeVal, items: [] });
        byKey.get(key).items.push(b);
      });
    const list = [...byKey.values()].sort(compareSlots);
    return [...list.filter((g) => g.date >= today), ...list.filter((g) => g.date < today).reverse()];
  }, [bookings, experienceId, status, today]);

  async function saveStatus(thunk) {
    setActionError(null);
    try {
      await dispatch(thunk);
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

          <section className="gd-card">
            <div className="ep-filter-bar">
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
                  return (
                    <article key={group.key} className="ep-booking-card" aria-label={`${group.title} on ${group.date}${group.time ? ` at ${group.time}` : ''}`}>
                      <header className="ep-booking-card-header">
                        <div>
                          <h2>{group.title}</h2>
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
                            <div><span className="gd-chip" style={{ ...statusStyle(meta.className), borderColor: 'transparent' }}>{meta.label}</span></div>
                            <div className="ep-row-actions">
                              <button type="button" className="gd-btn gd-btn-secondary gd-btn-sm" onClick={() => setDetailsId(b.id)}>View Details</button>
                              {b.status === 'CONFIRMED' ? (
                                <button type="button" className="gd-btn gd-btn-primary gd-btn-sm" disabled={busy} onClick={() => saveStatus(checkInExperienceBooking(b.id))}>
                                  {busy ? 'Saving…' : 'Mark Check-in'}
                                </button>
                              ) : null}
                              {b.status === 'CHECKED_IN' ? (
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
                  {bookings.length ? 'Try changing your filters.' : 'Once travellers book one of your sessions, they will appear here.'}
                </div>
              )}
            </section>
          ) : null}

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
                  <div><p className="label">Time</p><p id="modalTime">{details.time}</p></div>
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
        </main>
      </div>
    </ExperiencePage>
  );
}
