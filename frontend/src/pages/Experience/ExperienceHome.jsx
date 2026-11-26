import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/foundation';
import { useAsyncData } from '@/hooks/useAsyncData.js';
import { listReviews } from '@/services/schedule.api.js';
import { useExperienceBookings } from '@/store/experience/useExperienceBookings.js';
import { useExperienceCatalog } from '@/store/experience/useExperienceCatalog.js';
import { compareSlots, formatDate, slotState, timeToMinutes, todayIso } from '@/lib/datetime.js';
import { ui } from '@/lib/assets.js';
import ExperiencePage from '@/components/experience/ExperiencePage.jsx';
import { ErrorNotice, LoadingBlock } from '@/components/experience/Feedback.jsx';
import './experienceShared.css';

const EMPTY = [];

function alertFor(slot) {
  const percent = slot.capacity ? (slot.booked / slot.capacity) * 100 : 0;
  if (percent === 100) {
    return { tone: 'high', text: `${slot.title} (${slot.time}) is fully booked - demand is high - add another session to maximize bookings` };
  }
  if (percent > 85) return { tone: 'medium', text: `${slot.title} (${slot.time}) is nearly full - consider adding an extra slot` };
  if (percent < 40 && slot.booked < 2) {
    return { tone: 'low', text: `${slot.title} (${slot.time}) has low bookings - consider promotion or pricing adjustment` };
  }
  return null;
}

const SCHEDULE_PILL = {
  full: { label: 'Full', className: 'gd-chip', style: { background: '#fee2e2', color: '#991b1b', borderColor: '#fecaca' }, fill: 'red' },
  'nearly-full': { label: 'Nearly Full', className: 'gd-chip', style: { background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }, fill: 'green' },
  available: { label: 'Available', className: 'gd-chip', style: { background: '#dcfce7', color: '#166534', borderColor: '#bbf7d0' }, fill: 'green' },
  closed: { label: 'Closed', className: 'gd-chip', style: { background: '#f1f5f9', color: '#64748b', borderColor: '#e2e8f0' }, fill: 'green' },
};

export default function ExperienceHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const bookingList = useExperienceBookings();
  const reviewList = useAsyncData(listReviews);
  const catalog = useExperienceCatalog();
  const experiences = catalog.data ?? EMPTY;
  const bookings = bookingList.data ?? EMPTY;
  const reviews = reviewList.data ?? EMPTY;
  const ready = catalog.data !== null && bookingList.data !== null && reviewList.data !== null;
  const error = catalog.error ?? bookingList.error ?? reviewList.error;
  const loading = !error && (catalog.loading || bookingList.loading || reviewList.loading);
  function reload() {
    catalog.reload();
    bookingList.reload();
    reviewList.reload();
  }
  const today = todayIso();

  const view = useMemo(() => {
    const live = bookings.filter((b) => b.status !== 'CANCELLED');
    const todaySlots = experiences
      .flatMap((e) => e.slots.filter((s) => s.date === today).map((s) => ({ ...s, title: e.title, experienceId: e.id })))
      .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
    return {
      todayGuests: live.filter((b) => b.date === today).reduce((sum, b) => sum + b.participants, 0),
      upcomingSessions: experiences.reduce((sum, e) => sum + e.slots.filter((s) => s.date >= today && s.available).length, 0),
      totalGuests: live.reduce((sum, b) => sum + b.participants, 0),
      rating: reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '—',
      todaySlots,
      alerts: todaySlots.map((slot) => alertFor(slot)).filter(Boolean),
      upcoming: live.filter((b) => b.date >= today).sort(compareSlots).slice(0, 4),
      reviews: [...reviews].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 6),
    };
  }, [experiences, bookings, reviews, today]);

  const todayLabel = formatDate(today, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <ExperiencePage pageClass="experience-home-page" title="Experience Home">
      <div className="gd-page-wrapper">
        <main className="gd-page">
          <header className="gd-header">
            <div className="gd-header-text">
              <span className="gd-eyebrow">Experience Portal</span>
              <h1 className="gd-title">Home</h1>
              <p className="gd-subtitle">Overview of your sessions, occupancy, and booking momentum.</p>
            </div>
            <span className="gd-header-badge">{user?.name} · Experience Partner</span>
          </header>

          {!ready && loading ? <LoadingBlock label="Loading your dashboard…" /> : null}
          <ErrorNotice error={error} onRetry={reload} />

          {ready ? (
            <>
              <section className="gd-kpi-row" aria-label="Dashboard Overview">
                <div className="gd-kpi-card">
                  <div className="gd-kpi-icon-wrap kpi-blue">👥</div>
                  <div className="gd-kpi-data"><span className="gd-kpi-val">{view.todayGuests}</span><span className="gd-kpi-lbl">Today&apos;s Bookings</span></div>
                </div>
                <div className="gd-kpi-card">
                  <div className="gd-kpi-icon-wrap kpi-green">📅</div>
                  <div className="gd-kpi-data"><span className="gd-kpi-val">{view.upcomingSessions}</span><span className="gd-kpi-lbl">Upcoming Sessions</span></div>
                </div>
                <div className="gd-kpi-card">
                  <div className="gd-kpi-icon-wrap kpi-teal">🧾</div>
                  <div className="gd-kpi-data"><span className="gd-kpi-val">{view.totalGuests}</span><span className="gd-kpi-lbl">Total Bookings</span></div>
                </div>
                <div className="gd-kpi-card">
                  <div className="gd-kpi-icon-wrap kpi-orange">⭐</div>
                  <div className="gd-kpi-data"><span className="gd-kpi-val">{view.rating}</span><span className="gd-kpi-lbl">Average Rating</span></div>
                </div>
              </section>

              <div className="gd-card">
                <div className="gd-section-header" style={{ marginBottom: '1rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.1rem' }}>Action Required</h2>
                    <p className="gd-subtitle" style={{ fontSize: '0.825rem', margin: 0 }}>Priority ops alerts</p>
                  </div>
                  <span className="gd-header-badge">Ops alerts</span>
                </div>
                <div className="ep-alert-list">
                  {view.alerts.length ? (
                    view.alerts.map((alert) => (
                      <article key={alert.text} className={`ep-alert ep-alert-${alert.tone}`}>
                        <span className="ep-alert-icon">{alert.tone === 'low' ? 'i' : '!'}</span>
                        <p>{alert.text}</p>
                      </article>
                    ))
                  ) : (
                    <div className="gd-empty">
                      <strong style={{ display: 'block', color: '#0f172a', marginBottom: '0.3rem' }}>All clear</strong>
                      No operational alerts for today.
                    </div>
                  )}
                </div>
              </div>

              <div className="gd-card">
                <div className="gd-section-header" style={{ marginBottom: '1rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.1rem' }}>Today&apos;s Schedule</h2>
                    <p className="ep-schedule-date">{todayLabel}</p>
                  </div>
                  <span className="gd-header-badge">Live slots</span>
                </div>
                <div className="ep-schedule-stack">
                  {view.todaySlots.length ? (
                    view.todaySlots.map((slot) => {
                      const state = slotState(slot);
                      const pill = SCHEDULE_PILL[state.key] ?? SCHEDULE_PILL.available;
                      return (
                        <article key={slot.id} className="ep-schedule-row">
                          <div className="ep-schedule-top">
                            <h3>{slot.title}</h3>
                            <button type="button" className="ep-manage-link" onClick={() => navigate(`/experience/catalog?manage=${encodeURIComponent(slot.experienceId)}`)}>
                              Manage Slots
                            </button>
                          </div>
                          <p className="ep-schedule-time">{slot.time}</p>
                          <div className="ep-schedule-bottom">
                            <p className="ep-schedule-seats">{slot.booked}/{slot.capacity} seats</p>
                            <span className={pill.className} style={pill.style}>{pill.label}</span>
                          </div>
                          <div className="ep-progress-track">
                            <div className={`ep-progress-fill ${pill.fill}`} style={{ width: `${state.percent}%` }} />
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <div className="gd-empty">
                      <strong style={{ display: 'block', color: '#0f172a', marginBottom: '0.3rem' }}>No sessions today</strong>
                      Enjoy your day off or add a new slot!
                    </div>
                  )}
                </div>
              </div>

              <div className="gd-card">
                <div className="gd-section-header" style={{ marginBottom: '1rem' }}>
                  <h2 style={{ fontSize: '1.1rem' }}>Upcoming Bookings</h2>
                  <button type="button" className="gd-btn gd-btn-primary gd-btn-sm" onClick={() => navigate('/experience/bookings')}>
                    View All
                  </button>
                </div>
                <div className="ep-booking-list">
                  {view.upcoming.length ? (
                    view.upcoming.map((booking) => (
                      <article key={booking.id} className="ep-booking-row">
                        <div className="ep-booking-person">
                          <strong>{booking.guestName}</strong>
                          <p>{booking.experience?.title ?? 'Experience'}</p>
                        </div>
                        <div className="ep-booking-datetime">
                          {formatDate(booking.date, { month: 'long', day: 'numeric', year: 'numeric' })} · {booking.time}
                        </div>
                        <span className="gd-header-badge">{booking.participants} seats</span>
                      </article>
                    ))
                  ) : (
                    <div className="gd-empty">
                      <strong style={{ display: 'block', color: '#0f172a', marginBottom: '0.3rem' }}>No upcoming bookings</strong>
                      Keep sharing your experience!
                    </div>
                  )}
                </div>
              </div>

              <div className="gd-card">
                <div className="gd-section-header" style={{ marginBottom: '1rem' }}>
                  <h2 style={{ fontSize: '1.1rem' }}>What People Say</h2>
                </div>
                <div className="ep-review-grid">
                  {view.reviews.length ? (
                    view.reviews.map((review) => (
                      <article key={review.id} className="ep-review-card">
                        <img src={ui('profile.png')} className="ep-review-avatar" alt="Guest" />
                        <div>
                          <h3>{review.authorName || `Guest #${review.userId}`}</h3>
                          <div className="ep-review-stars">{'⭐'.repeat(review.rating)}</div>
                          <p>{review.comment}</p>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="gd-empty">
                      <strong style={{ display: 'block', color: '#0f172a', marginBottom: '0.3rem' }}>No reviews yet</strong>
                      Reviews show up after guests complete a session.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </main>
      </div>
    </ExperiencePage>
  );
}
