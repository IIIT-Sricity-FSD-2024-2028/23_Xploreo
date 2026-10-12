import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { StatCard, StatusBadge } from '@/foundation';
import { useAsyncData } from '@/hooks/useAsyncData.js';
import { listExperienceBookings, listMyExperiences } from '@/services/partners.api.js';
import { listReviews } from '@/services/schedule.api.js';
import { compareSlots, formatDate, slotState, timeToMinutes, todayIso } from '@/lib/datetime.js';
import { EmptyState, ErrorNotice, LoadingBlock } from '@/components/experience/Feedback.jsx';

const loadHome = () => Promise.all([listMyExperiences(), listExperienceBookings(), listReviews()]);

function alertFor(slot) {
  const percent = slot.capacity ? (slot.booked / slot.capacity) * 100 : 0;
  if (percent >= 100) {
    return { tone: 'high', text: `${slot.title} (${slot.time}) is fully booked. Demand is high: consider adding another session.` };
  }
  if (percent > 85) return { tone: 'medium', text: `${slot.title} (${slot.time}) is nearly full. Consider adding an extra slot.` };
  if (percent < 40 && slot.booked < 2) {
    return { tone: 'low', text: `${slot.title} (${slot.time}) has low bookings. Consider a promotion or a pricing change.` };
  }
  return null;
}

const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

export default function ExperienceHome() {
  const { data, error, loading, reload } = useAsyncData(loadHome);
  const [experiences, bookings, reviews] = data ?? [[], [], []];
  const today = todayIso();

  const view = useMemo(() => {
    const live = bookings.filter((b) => b.status !== 'CANCELLED');
    const todaySlots = experiences
      .flatMap((e) => e.slots.filter((s) => s.date === today).map((s) => ({ ...s, title: e.title, experienceId: e.id })))
      .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
    return {
      todayGuests: live.filter((b) => b.date === today).reduce((sum, b) => sum + b.participants, 0),
      upcomingSessions: experiences.reduce((sum, e) => sum + e.slots.filter((s) => s.date > today).length, 0),
      totalBookings: live.length,
      rating: reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '—',
      todaySlots,
      alerts: todaySlots.map(alertFor).filter(Boolean),
      upcoming: live.filter((b) => b.date >= today).sort(compareSlots).slice(0, 4),
      latestReviews: [...reviews].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 3),
    };
  }, [experiences, bookings, reviews, today]);

  if (!data && loading) return <LoadingBlock label="Loading your dashboard…" />;
  if (!data && error) return <ErrorNotice error={error} onRetry={reload} />;

  return (
    <div className="exp-page">
      <header className="exp-page-header">
        <div>
          <p className="exp-eyebrow">Experience partner</p>
          <h1>Home</h1>
          <p className="exp-muted">{formatDate(today, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </header>

      <ErrorNotice error={error} onRetry={reload} />

      <section className="exp-stats" aria-label="Summary">
        <StatCard label="Guests today" value={view.todayGuests} hint="Guests arriving today" tone="blue" />
        <StatCard label="Upcoming sessions" value={view.upcomingSessions} hint="Future sessions scheduled" tone="green" />
        <StatCard label="Total bookings" value={view.totalBookings} hint="Excluding cancelled" tone="green" />
        <StatCard label="Average rating" value={view.rating} hint={`${reviews.length} review${reviews.length === 1 ? '' : 's'}`} tone="orange" />
      </section>

      <div className="exp-grid-2">
        <section className="exp-card" aria-labelledby="exp-today-heading">
          <h2 id="exp-today-heading">Today&rsquo;s schedule</h2>
          {view.alerts.length ? (
            <div className="exp-alerts">
              {view.alerts.map((alert) => (
                <p key={alert.text} className={`exp-alert exp-alert-${alert.tone}`}>
                  {alert.text}
                </p>
              ))}
            </div>
          ) : null}
          {view.todaySlots.length ? (
            <ul className="exp-list">
              {view.todaySlots.map((slot) => {
                const state = slotState(slot);
                return (
                  <li key={slot.id} className="exp-list-row">
                    <div>
                      <strong>{slot.title}</strong>
                      <p className="exp-muted">
                        {slot.time} · {slot.booked}/{slot.capacity} seats
                      </p>
                      <div className="exp-bar" aria-hidden="true">
                        <span className={`exp-bar-fill exp-bar-${state.tone}`} style={{ width: `${state.percent}%` }} />
                      </div>
                    </div>
                    <div className="exp-row-actions">
                      <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
                      <Link className="exp-btn exp-btn-ghost" to={`/experience/catalog?manage=${encodeURIComponent(slot.experienceId)}`}>
                        Manage slots
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title="No sessions today">Enjoy the day off, or add a new slot.</EmptyState>
          )}
        </section>

        <section className="exp-card" aria-labelledby="exp-upcoming-heading">
          <div className="exp-card-head">
            <h2 id="exp-upcoming-heading">Upcoming bookings</h2>
            <Link to="/experience/bookings">View all</Link>
          </div>
          {view.upcoming.length ? (
            <ul className="exp-list">
              {view.upcoming.map((b) => (
                <li key={b.id} className="exp-list-row">
                  <div>
                    <strong>{b.guestName}</strong>
                    <p className="exp-muted">{b.experience?.title ?? 'Experience'}</p>
                  </div>
                  <div className="exp-right">
                    <span>{formatDate(b.date, { day: 'numeric', month: 'short' })} · {b.time}</span>
                    <p className="exp-muted">{b.participants} guest{b.participants === 1 ? '' : 's'}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No upcoming bookings">Bookings appear here as guests reserve a slot.</EmptyState>
          )}
        </section>
      </div>

      <section className="exp-card" aria-labelledby="exp-reviews-heading">
        <h2 id="exp-reviews-heading">Latest reviews</h2>
        {view.latestReviews.length ? (
          <ul className="exp-list">
            {view.latestReviews.map((r) => (
              <li key={r.id} className="exp-review">
                <span className="exp-stars" aria-label={`${r.rating} out of 5`}>{stars(r.rating)}</span>
                <p>{r.comment}</p>
                <p className="exp-muted">Guest #{r.userId} · {formatDate(r.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No reviews yet">Reviews show up after guests complete a session.</EmptyState>
        )}
      </section>
    </div>
  );
}
