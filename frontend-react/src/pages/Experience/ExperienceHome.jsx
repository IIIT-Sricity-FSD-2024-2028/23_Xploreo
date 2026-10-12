import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAsyncData } from '@/hooks/useAsyncData.js';
import { listExperienceBookings, listMyExperiences } from '@/services/partners.api.js';
import { listReviews } from '@/services/schedule.api.js';
import { compareSlots, formatDate, slotState, timeToMinutes, todayIso } from '@/lib/datetime.js';
import { ui } from '@/lib/assets.js';
import ExperiencePage from '@/components/experience/ExperiencePage.jsx';
import { ErrorNotice, LoadingBlock } from '@/components/experience/Feedback.jsx';

const loadHome = () => Promise.all([listMyExperiences(), listExperienceBookings(), listReviews()]);

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
  full: { label: 'Full', className: 'full', fill: 'red' },
  'nearly-full': { label: 'Nearly Full', className: 'nearly-full', fill: 'warning' },
  available: { label: 'Available', className: 'available', fill: 'green' },
  closed: { label: 'Closed', className: '', fill: 'green' },
};

export default function ExperienceHome() {
  const navigate = useNavigate();
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
      <section className="experience-hero">
        <div>
          <p className="experience-eyebrow">Experience Dashboard</p>
          <h1 className="page-title">Home</h1>
          <p className="page-subtitle">Overview of your sessions, occupancy, and booking momentum.</p>
        </div>
      </section>

      {!data && loading ? <LoadingBlock label="Loading your dashboard…" /> : null}
      {!data && error ? <ErrorNotice error={error} onRetry={reload} /> : null}
      {data ? <ErrorNotice error={error} onRetry={reload} /> : null}

      {data ? (
        <>
          <section className="stats-grid experience-stats-grid" id="stats">
            <div className="stat-card experience-stat-card blue">
              <p>Today&apos;s Bookings</p>
              <h2>{view.todayGuests}</h2>
              <span>Guests arriving today</span>
            </div>
            <div className="stat-card experience-stat-card light-green">
              <p>Upcoming Sessions</p>
              <h2>{view.upcomingSessions}</h2>
              <span>Future sessions scheduled</span>
            </div>
            <div className="stat-card experience-stat-card dark-green">
              <p>Total Bookings</p>
              <h2>{view.totalGuests}</h2>
              <span>Across all active experiences</span>
            </div>
            <div className="stat-card experience-stat-card orange">
              <p>Average Rating</p>
              <h2>{view.rating}</h2>
              <span>Current guest sentiment</span>
            </div>
          </section>

          <section className="experience-grid">
            <article className="content-card experience-card">
              <div className="card-header experience-card-header">
                <div>
                  <p className="section-kicker">Priority</p>
                  <h2>Action Required</h2>
                </div>
                <span className="section-chip">Ops alerts</span>
              </div>
              <div id="alerts" className="experience-alert-list">
                {view.alerts.length ? (
                  view.alerts.map((alert) => (
                    <article key={alert.text} className={`alert-main alert-banner alert-${alert.tone}`}>
                      <span className="alert-icon">{alert.tone === 'low' ? 'i' : '!'}</span>
                      <p>{alert.text}</p>
                    </article>
                  ))
                ) : (
                  <div className="empty-state compact">
                    <h3>All clear</h3>
                    <p>No operational alerts for today.</p>
                  </div>
                )}
              </div>
            </article>

            <article className="content-card experience-card">
              <div className="card-header experience-card-header">
                <div>
                  <p className="section-kicker">Today</p>
                  <h2>Today&apos;s Schedule</h2>
                </div>
                <span className="section-chip">Live slots</span>
              </div>
              <div id="schedule" className="experience-schedule-grid">
                <p className="schedule-date-label">{todayLabel}</p>
                <div className="schedule-stack">
                  {view.todaySlots.length ? (
                    view.todaySlots.map((slot) => {
                      const state = slotState(slot);
                      const pill = SCHEDULE_PILL[state.key] ?? SCHEDULE_PILL.available;
                      return (
                        <article key={slot.id} className="tour-card experience-schedule-row">
                          <div className="schedule-row-top">
                            <h2>{slot.title}</h2>
                            <button
                              type="button"
                              className="schedule-manage-btn"
                              onClick={() => navigate(`/experience/catalog?manage=${encodeURIComponent(slot.experienceId)}`)}
                            >
                              Manage Slots
                            </button>
                          </div>
                          <p className="schedule-time">{slot.time}</p>
                          <div className="schedule-row-bottom">
                            <p className="schedule-seat-count">
                              {slot.booked}/{slot.capacity} seats
                            </p>
                            <span className={`status-pill ${pill.className}`.trim()}>{pill.label}</span>
                          </div>
                          <div className="progress-bar-container schedule-progress">
                            <div className={`progress-fill ${pill.fill}`} style={{ width: `${state.percent}%` }} />
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <div className="empty-state compact">
                      <h3>No sessions today</h3>
                      <p>Enjoy your day off or add a new slot!</p>
                    </div>
                  )}
                </div>
              </div>
            </article>
          </section>

          <section className="experience-bottom-grid">
            <article className="content-card experience-card">
              <div className="card-header experience-card-header">
                <div>
                  <p className="section-kicker">Guests</p>
                  <h2>Upcoming Bookings</h2>
                </div>
                <button type="button" className="primary-btn home-view-all-btn" onClick={() => navigate('/experience/bookings')}>
                  View All
                </button>
              </div>
              <div id="bookings" className="experience-booking-list">
                {view.upcoming.length ? (
                  view.upcoming.map((booking) => (
                    <article key={booking.id} className="transaction-row experience-transaction-row">
                      <div className="booking-person">
                        <strong>{booking.guestName}</strong>
                        <p>{booking.experience?.title ?? 'Experience'}</p>
                      </div>
                      <div className="booking-datetime">
                        <span>{formatDate(booking.date, { month: 'long', day: 'numeric', year: 'numeric' })}</span>{' '}
                        <span>{booking.time}</span>
                      </div>
                      <span className="section-chip booking-seat-chip">{booking.participants} seats</span>
                    </article>
                  ))
                ) : (
                  <div className="empty-state compact">
                    <h3>No upcoming bookings</h3>
                    <p>Keep sharing your experience!</p>
                  </div>
                )}
              </div>
            </article>

            <article className="content-card experience-card reviews-section home-reviews-card">
              <div className="card-header experience-card-header">
                <div>
                  <p className="section-kicker">Social proof</p>
                  <h2 className="section-title">What People Say</h2>
                </div>
              </div>
              <div className="reviews-container" id="reviewsContainer">
                {view.reviews.length ? (
                  view.reviews.map((review) => (
                    <article key={review.id} className="review-card">
                      <img src={ui('profile.png')} className="review-img" alt="Guest" />
                      <div className="review-content">
                        <h3>Guest #{review.userId}</h3>
                        <div className="stars">{'⭐'.repeat(review.rating)}</div>
                        <p>{review.comment}</p>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="empty-state compact">
                    <h3>No reviews yet</h3>
                    <p>Reviews show up after guests complete a session.</p>
                  </div>
                )}
              </div>
            </article>
          </section>
        </>
      ) : null}
    </ExperiencePage>
  );
}
