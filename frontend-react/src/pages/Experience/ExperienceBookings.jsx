import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAsyncData } from '@/hooks/useAsyncData.js';
import { listExperienceBookings, updateExperienceBookingStatus } from '@/services/partners.api.js';
import { compareSlots, formatCurrency, formatDate, todayIso } from '@/lib/datetime.js';
import { STATUS_FILTERS, bookingStatusMeta } from '@/lib/bookingStatus.js';
import ExperiencePage from '@/components/experience/ExperiencePage.jsx';
import ModalFrame, { CloseButton } from '@/components/experience/ModalFrame.jsx';
import { ErrorNotice, LoadingBlock } from '@/components/experience/Feedback.jsx';

const longDate = (iso) => formatDate(iso, { month: 'long', day: 'numeric', year: 'numeric' });

export default function ExperienceBookings() {
  const [params] = useSearchParams();
  const { data, error, loading, reload, mutate } = useAsyncData(listExperienceBookings);
  const [experienceId, setExperienceId] = useState(params.get('experience') || 'all');
  const [status, setStatus] = useState('all');
  const [details, setDetails] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);

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
        const key = `${b.experienceId}|${b.date}|${b.time}`;
        if (!byKey.has(key)) byKey.set(key, { key, title: b.experience?.title ?? 'Experience', date: b.date, time: b.time, items: [] });
        byKey.get(key).items.push(b);
      });
    const list = [...byKey.values()].sort(compareSlots);
    return [...list.filter((g) => g.date >= today), ...list.filter((g) => g.date < today).reverse()];
  }, [bookings, experienceId, status, today]);

  async function changeStatus(booking, next) {
    setBusyId(booking.id);
    setActionError(null);
    try {
      const updated = await updateExperienceBookingStatus(booking.id, next);
      mutate((list) => list.map((b) => (b.id === updated.id ? { ...b, status: updated.status } : b)));
    } catch (err) {
      setActionError(err);
    } finally {
      setBusyId(null);
    }
  }

  const detailsMeta = details ? bookingStatusMeta(details.status) : null;

  return (
    <ExperiencePage pageClass="experience-bookings-page" title="Bookings">
      <section className="page-header experience-toolbar">
        <div>
          <p className="experience-eyebrow">Guest Operations</p>
          <h1 className="page-title">Bookings</h1>
          <p className="page-subtitle">Manage all your experience bookings with quick filters and status actions.</p>
        </div>
      </section>

      <section className="content-card experience-card filter-panel">
        <div className="filter-bar bookings-filter-bar">
          <label className="experience-select-shell" htmlFor="experienceFilter">
            <span>Experience</span>
            <select id="experienceFilter" value={experienceId} onChange={(event) => setExperienceId(event.target.value)}>
              <option value="all">All Experiences</option>
              {experienceOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.title}</option>
              ))}
            </select>
          </label>

          <label className="experience-select-shell" htmlFor="statusFilter">
            <span>Status</span>
            <select id="statusFilter" value={status} onChange={(event) => setStatus(event.target.value)}>
              {STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {!data && loading ? <LoadingBlock label="Loading bookings…" /> : null}
      <ErrorNotice error={error} onRetry={reload} />
      <ErrorNotice error={actionError} />

      {data ? (
        <section id="bookingList" className="experience-bookings-stack">
          {groups.length ? (
            groups.map((group) => {
              const guests = group.items.reduce((sum, b) => sum + (b.status === 'CANCELLED' ? 0 : b.participants), 0);
              return (
                <article key={group.key} className="card booking-card" aria-label={`${group.title} on ${group.date} at ${group.time}`}>
                  <header className="booking-card-header">
                    <div>
                      <h2>{group.title}</h2>
                      <p>{longDate(group.date)} • {group.time}</p>
                    </div>
                    <div className="booking-card-summary">
                      <span className="section-chip">{group.items.length} bookings</span>
                      <strong>Total Guests: {guests}</strong>
                    </div>
                  </header>
                  <div className="booking-table-head">
                    <span>Guest</span>
                    <span>Party Size</span>
                    <span>Status</span>
                    <span>Actions</span>
                  </div>
                  {group.items.map((b) => {
                    const meta = bookingStatusMeta(b.status);
                    const busy = busyId === b.id;
                    return (
                      <div key={b.id} className="booking-user-row">
                        <div>
                          <strong>{b.guestName}</strong>
                          <br />
                          <span className="booking-subtext">{b.id}</span>
                        </div>
                        <div>{b.participants} guests</div>
                        <div>
                          <span className={`status ${meta.className}`}>{meta.label}</span>
                        </div>
                        <div className="booking-actions">
                          <button type="button" onClick={() => setDetails(b)}>View Details</button>
                          {b.status === 'CONFIRMED' ? (
                            <button type="button" className="primary-btn" disabled={busy} onClick={() => changeStatus(b, 'CHECKED_IN')}>
                              {busy ? 'Saving…' : 'Mark Check-in'}
                            </button>
                          ) : null}
                          {b.status === 'CHECKED_IN' ? (
                            <button type="button" className="btn-outline-blue" disabled={busy} onClick={() => changeStatus(b, 'END_REQUESTED')}>
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
            <div className="empty-state">
              <h3>No bookings found</h3>
              <p>{bookings.length ? 'Try changing your filters.' : 'Once travellers book one of your sessions, they will appear here.'}</p>
            </div>
          )}
        </section>
      ) : null}

      {details ? (
        <ModalFrame id="bookingModal" boxClass="booking-modal-box" labelledBy="modalName" onClose={() => setDetails(null)}>
          <div className="modal-header">
            <div>
              <h2 id="modalName">{details.guestName}</h2>
              <div className="modal-sub">
                <span id="modalId">{details.id}</span>
                <span id="modalStatus" className={`status-badge ${detailsMeta.className}`}>{detailsMeta.label}</span>
              </div>
            </div>
            <CloseButton label="Close booking details" glyph="✕" onClick={() => setDetails(null)} />
          </div>

          <hr />

          <div className="section">
            <h3>Experience Details</h3>
            <p className="label">Experience</p>
            <p id="modalExperience">{details.experience?.title ?? 'Experience'}</p>
            <div className="grid-3">
              <div>
                <p className="label">Date</p>
                <p id="modalDate">{longDate(details.date)}</p>
              </div>
              <div>
                <p className="label">Time</p>
                <p id="modalTime">{details.time}</p>
              </div>
              <div>
                <p className="label">Guests</p>
                <p id="modalGuests">{details.participants} guests</p>
              </div>
            </div>
          </div>

          <div className="section">
            <h3>Customer Information</h3>
            <p className="label">Name</p>
            <p id="modalCustomer">{details.guestName}</p>
            <div className="grid-2">
              <div>
                <p className="label">Phone</p>
                <p id="modalPhone">{details.phone}</p>
              </div>
              <div>
                <p className="label">Email</p>
                <p id="modalEmail">{details.email}</p>
              </div>
            </div>
          </div>

          <div className="section">
            <h3>Payment</h3>
            <div className="payment-box">
              <div>
                <p className="label">Total Amount</p>
                <h2 id="modalAmount">{formatCurrency(details.totalAmount)}</h2>
              </div>
              <span id="modalPaymentStatus" className="paid-badge">{details.status === 'CANCELLED' ? 'Refunded' : 'Paid'}</span>
            </div>
          </div>
        </ModalFrame>
      ) : null}
    </ExperiencePage>
  );
}
