import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Modal, StatusBadge } from '@/foundation';
import { useAsyncData } from '@/hooks/useAsyncData.js';
import { listExperienceBookings, updateExperienceBookingStatus } from '@/services/partners.api.js';
import { compareSlots, formatCurrency, formatDate, todayIso } from '@/lib/datetime.js';
import { STATUS_FILTERS, bookingStatusMeta } from '@/lib/bookingStatus.js';
import { EmptyState, ErrorNotice, LoadingBlock } from '@/components/experience/Feedback.jsx';

const PAGE = 8;
const WHEN = [
  { value: 'upcoming', label: 'Upcoming & today' },
  { value: 'past', label: 'Past' },
  { value: 'all', label: 'All dates' },
];

export default function ExperienceBookings() {
  const [params] = useSearchParams();
  const { data, error, loading, reload, mutate } = useAsyncData(listExperienceBookings);
  const [experienceId, setExperienceId] = useState(params.get('experience') || 'all');
  const [status, setStatus] = useState('all');
  const [when, setWhen] = useState('upcoming');
  const [limit, setLimit] = useState(PAGE);
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

  const groups = useMemo(() => {
    const filtered = bookings.filter((b) => {
      if (experienceId !== 'all' && b.experienceId !== experienceId) return false;
      if (status !== 'all' && bookingStatusMeta(b.status).group !== status) return false;
      if (when === 'upcoming' && b.date < today) return false;
      if (when === 'past' && b.date >= today) return false;
      return true;
    });
    const byKey = new Map();
    filtered.forEach((b) => {
      const key = `${b.experienceId}|${b.date}|${b.time}`;
      if (!byKey.has(key)) byKey.set(key, { key, title: b.experience?.title ?? 'Experience', date: b.date, time: b.time, items: [] });
      byKey.get(key).items.push(b);
    });
    const list = [...byKey.values()].sort(compareSlots);
    return when === 'past' ? list.reverse() : list;
  }, [bookings, experienceId, status, when, today]);

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

  if (!data && loading) return <LoadingBlock label="Loading bookings…" />;
  if (!data && error) return <ErrorNotice error={error} onRetry={reload} />;

  const reset = (setter) => (event) => {
    setter(event.target.value);
    setLimit(PAGE);
  };

  return (
    <div className="exp-page">
      <header className="exp-page-header">
        <div>
          <p className="exp-eyebrow">Guest management</p>
          <h1>Bookings</h1>
          <p className="exp-muted">Check guests in and close out finished sessions.</p>
        </div>
      </header>

      <ErrorNotice error={error} onRetry={reload} />
      <ErrorNotice error={actionError} />

      <div className="exp-filters">
        <label>
          <span>Experience</span>
          <select value={experienceId} onChange={reset(setExperienceId)}>
            <option value="all">All experiences</option>
            {experienceOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.title}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Status</span>
          <select value={status} onChange={reset(setStatus)}>
            {STATUS_FILTERS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span>When</span>
          <select value={when} onChange={reset(setWhen)}>
            {WHEN.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>

      {bookings.length === 0 ? (
        <EmptyState title="No bookings yet">Once travellers book one of your sessions, they will appear here.</EmptyState>
      ) : groups.length === 0 ? (
        <EmptyState title="No bookings match these filters">Try a different status or date range.</EmptyState>
      ) : (
        <>
          <div className="exp-stack">
            {groups.slice(0, limit).map((group) => {
              const guests = group.items.reduce((sum, b) => sum + (b.status === 'CANCELLED' ? 0 : b.participants), 0);
              return (
                <article key={group.key} className="exp-card" aria-label={`${group.title} on ${group.date} at ${group.time}`}>
                  <header className="exp-card-head">
                    <div>
                      <h2>{group.title}</h2>
                      <p className="exp-muted">{formatDate(group.date)} · {group.time}</p>
                    </div>
                    <div className="exp-right">
                      <StatusBadge tone="info">{group.items.length} booking{group.items.length === 1 ? '' : 's'}</StatusBadge>
                      <p><strong>{guests}</strong> guests attending</p>
                    </div>
                  </header>
                  <ul className="exp-list">
                    {group.items.map((b) => {
                      const meta = bookingStatusMeta(b.status);
                      const busy = busyId === b.id;
                      return (
                        <li key={b.id} className="exp-list-row">
                          <div>
                            <strong>{b.guestName}</strong>
                            <p className="exp-muted">{b.id} · {b.participants} guest{b.participants === 1 ? '' : 's'}</p>
                          </div>
                          <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                          <div className="exp-row-actions">
                            <button type="button" className="exp-btn exp-btn-ghost" onClick={() => setDetails(b)}>
                              View details
                            </button>
                            {b.status === 'CONFIRMED' ? (
                              <button type="button" className="exp-btn exp-btn-primary" disabled={busy} onClick={() => changeStatus(b, 'CHECKED_IN')}>
                                {busy ? 'Saving…' : 'Mark check-in'}
                              </button>
                            ) : null}
                            {b.status === 'CHECKED_IN' ? (
                              <button type="button" className="exp-btn exp-btn-outline" disabled={busy} onClick={() => changeStatus(b, 'END_REQUESTED')}>
                                {busy ? 'Saving…' : 'Request end'}
                              </button>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </article>
              );
            })}
          </div>
          {groups.length > limit ? (
            <div className="exp-center">
              <button type="button" className="exp-btn exp-btn-ghost" onClick={() => setLimit((n) => n + PAGE)}>
                Show more ({groups.length - limit} sessions left)
              </button>
            </div>
          ) : null}
        </>
      )}

      <Modal
        open={Boolean(details)}
        title="Booking details"
        onClose={() => setDetails(null)}
        footer={
          <button type="button" className="exp-btn exp-btn-ghost" onClick={() => setDetails(null)}>
            Close
          </button>
        }
      >
        {details ? (
          <dl className="exp-details">
            <dt>Booking</dt><dd>{details.id}</dd>
            <dt>Guest</dt><dd>{details.guestName}</dd>
            <dt>Email</dt><dd>{details.email}</dd>
            <dt>Phone</dt><dd>{details.phone}</dd>
            <dt>Experience</dt><dd>{details.experience?.title ?? 'Experience'}</dd>
            <dt>Session</dt><dd>{formatDate(details.date)} · {details.time}</dd>
            <dt>Party size</dt><dd>{details.participants} guest{details.participants === 1 ? '' : 's'}</dd>
            <dt>Booking total</dt><dd>{formatCurrency(details.totalAmount)}</dd>
            <dt>Status</dt><dd><StatusBadge tone={bookingStatusMeta(details.status).tone}>{bookingStatusMeta(details.status).label}</StatusBadge></dd>
          </dl>
        ) : null}
      </Modal>
    </div>
  );
}
