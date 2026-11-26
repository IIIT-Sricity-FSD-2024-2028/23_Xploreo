import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '@/foundation';
import {
  fetchGuideDashboardData,
  fetchGuideTrips,
  updateTripTrackingThunk,
  selectGuideTrips,
  selectGuideAssignments,
  selectGuidePlans,
  selectGuideLoading,
  selectGuideError,
} from '@/store/guide/index.js';
import { getTraveller } from '@/services/guide.api.js';
import { formatCurrency, formatDate } from '@/lib/datetime.js';
import { useToast } from '@/components/guide/Toast.jsx';
import './guideTours.css';

const TABS = [
  { key: 'pending', label: 'Upcoming' },
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'completed', label: 'Completed' },
];

// The old page kept tours in localStorage with three statuses. A trip's tracking status is the source here:
//   not_started -> Upcoming, ongoing / paused -> Ongoing, completed -> Completed.
const tabOf = (card) => {
  if (card.kind === 'experience') return card.job.bookingStatus === 'COMPLETED' ? 'completed' : 'pending';
  const trip = card.trip;
  return trip.trackingStatus === 'completed' ? 'completed' : trip.trackingStatus === 'not_started' ? 'pending' : 'ongoing';
};

const EXPERIENCE_STATUS_LABEL = { confirmed: 'Confirmed', completed: 'Completed' };

// Flatten itinerary.days[].experiences[] into the ordered list of stops the guide walks through.
function stopsOf(trip) {
  const days = trip.itinerary?.days ?? [];
  return days.flatMap((day) =>
    (day.experiences ?? []).map((e) => ({ id: e.id, title: e.title, location: e.location, day: day.dayNumber, startsAt: e.startsAt })),
  );
}

const stopIndex = (trip, stops) => Math.max(0, stops.findIndex((s) => s.title === trip.currentStop));
const progressOf = (index, total) => Math.round((index / (total - 1 || 1)) * 100);
// Assignments are Trips: there's no top-level "start date"/"fee"/"guests" field, only itinerary
// dates and totalAmount — see trips/entities/trip.entity.ts.
const tripDate = (trip, stops) => trip.itinerary?.day1?.hotel?.checkInDate || trip.itinerary?.day1?.flight?.departureAt || stops[0]?.startsAt;

// A tour can be started from START_WINDOW_HOURS before it is due until the end of its last day.
// The server enforces the same rule; this only keeps the button honest.
const START_WINDOW_HOURS = 3;
const asMoment = (value) => {
  if (!value) return undefined;
  const text = String(value);
  const ms = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00` : text);
  return Number.isNaN(ms) ? undefined : ms;
};
function startAtOf(trip) {
  const day1 = trip.itinerary?.day1;
  const moments = [
    asMoment(day1?.transport?.pickupAt),
    asMoment(day1?.flight?.departureAt),
    asMoment(day1?.hotel?.checkInDate),
    ...(trip.itinerary?.days ?? []).flatMap((d) => (d.experiences ?? []).map((e) => asMoment(e.startsAt))),
  ].filter((m) => m !== undefined);
  return moments.length ? Math.min(...moments) : undefined;
}
function endAtOf(trip) {
  const dates = [trip.itinerary?.day1?.hotel?.checkOutDate, trip.itinerary?.day1?.hotel?.checkInDate].filter(Boolean);
  const last = dates.sort().pop();
  return last ? asMoment(`${String(last).slice(0, 10)}T23:59:59`) : undefined;
}
// Returns null when the tour may be started now, otherwise the reason it can't.
function startBlocker(card) {
  if (card.startAt === undefined) return 'No start date set for this trip';
  const opensAt = card.startAt - START_WINDOW_HOURS * 3_600_000;
  if (Date.now() < opensAt) {
    return `Opens ${new Date(opensAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} (${START_WINDOW_HOURS}h before start)`;
  }
  if (card.endAt !== undefined && Date.now() > card.endAt) return 'Trip dates have passed';
  return null;
}

export default function GuideTours() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const trips = useSelector(selectGuideTrips);
  const assignments = useSelector(selectGuideAssignments);
  const plans = useSelector(selectGuidePlans);
  const loading = useSelector(selectGuideLoading);
  const error = useSelector(selectGuideError);
  const { toast, show } = useToast();
  const [tab, setTab] = useState('pending');
  const [openId, setOpenId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [travellers, setTravellers] = useState({});

  useEffect(() => {
    if (user?.id) {
      if (!trips.length) dispatch(fetchGuideTrips(user.id));
      if (!assignments.length || !plans.length) dispatch(fetchGuideDashboardData(user.id));
    }
  }, [dispatch, user?.id, trips.length, assignments.length, plans.length]);

  useEffect(() => {
    if (trips.length > 0) {
      const ids = [...new Set(trips.map((t) => t.travellerId).filter(Boolean))];
      if (ids.length > 0) {
        Promise.allSettled(ids.map((id) => getTraveller(id))).then((settled) => {
          const map = {};
          settled.forEach((r, i) => {
            if (r.status === 'fulfilled') map[ids[i]] = r.value;
          });
          setTravellers(map);
        });
      }
    }
  }, [trips]);

  const reload = useCallback(() => {
    if (user?.id) {
      dispatch(fetchGuideTrips(user.id));
      dispatch(fetchGuideDashboardData(user.id));
    }
  }, [dispatch, user?.id]);

  const cards = useMemo(() => {
    const planById = new Map(plans.map((p) => [p.id, p]));
    const tripCards = trips.filter((trip) => ['confirmed', 'started', 'completed'].includes(trip.status)).map((trip) => {
      const plan = planById.get(trip.planId);
      const t = travellers[trip.travellerId];
      const stops = stopsOf(trip);
      return {
        kind: 'trip',
        id: trip.id,
        trip,
        stops,
        plan,
        title: plan?.title || trip.planId,
        destination: plan?.destination || '',
        customer: t ? `${t.fname || ''} ${t.lname || ''}`.trim() || 'Traveller' : 'Traveller',
        phone: t?.phno ? String(t.phno) : '',
        amount: trip.totalAmount,
        date: tripDate(trip, stops),
        startAt: startAtOf(trip),
        endAt: endAtOf(trip),
        duration: plan ? `${plan.durationNights + 1} days` : '—',
      };
    });
    const expCards = (assignments ?? [])
      .filter((job) => job.kind === 'experience' && job.status === 'confirmed')
      .map((job) => ({
        kind: 'experience',
        id: job.id,
        job,
        title: job.title,
        destination: job.destination,
        customer: job.guestName || 'Guest',
        phone: job.guestPhone ? String(job.guestPhone) : '',
        amount: job.guideFee,
        date: job.date,
        startAt: asMoment(job.date),
        endAt: asMoment(job.date) !== undefined ? asMoment(job.date) + 86_399_000 : undefined,
      }));
    return [...tripCards, ...expCards];
  }, [trips, assignments, plans, travellers]);

  const counts = Object.fromEntries(TABS.map((t) => [t.key, cards.filter((c) => tabOf(c) === t.key).length]));
  const shown = cards.filter((c) => tabOf(c) === tab);
  const open = cards.find((c) => c.id === openId);
  const hasData = !loading || trips.length > 0 || assignments.length > 0;

  async function track(card, changes, message) {
    setBusyId(card.id);
    try {
      await dispatch(updateTripTrackingThunk({ tripId: card.trip.id, changes })).unwrap();
      if (message) show(message, 'success');
      return true;
    } catch (err) {
      show(typeof err === 'string' ? err : err?.message || 'Could not update the tour.', 'error');
      return null;
    } finally {
      setBusyId(null);
    }
  }

  function start(card) {
    const blocker = startBlocker(card);
    if (blocker) {
      show(blocker, 'warning');
      return null;
    }
    const first = card.stops[0];
    return track(card, {
      trackingStatus: 'ongoing',
      currentDay: first?.day ?? 1,
      currentStop: first?.title ?? '',
      currentLocation: first?.location ?? '',
      progressPercentage: 0,
    }, 'Tour started.');
  }

  // "Complete" finishes the current stop and moves to the next; on the last stop it finishes the tour.
  async function advance(card) {
    const { trip, stops } = card;
    const index = stopIndex(trip, stops);
    const next = stops[index + 1];
    if (!next) {
      const done = await track(card, { trackingStatus: 'completed', progressPercentage: 100 }, 'Tour finished.');
      if (done) setTab('completed');
      return;
    }
    await track(card, {
      currentDay: next.day,
      currentStop: next.title,
      currentLocation: next.location,
      progressPercentage: progressOf(index + 1, stops.length),
    }, `Now at ${next.title}.`);
  }

  return (
    <div className="gd-page-wrapper">
      <main className="gd-page">
        <header className="gd-header">
          <div className="gd-header-text">
            <span className="gd-eyebrow">Guide Portal</span>
            <h1 className="gd-title">Tour Management</h1>
            <p className="gd-subtitle">View all your tours in one place.</p>
          </div>
        </header>

        <div className="gd-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={`gd-tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}{hasData ? ` (${counts[t.key]})` : ''}
            </button>
          ))}
        </div>

        {!hasData && loading ? (
          <div className="gd-review-loading" aria-hidden="true">
            <div className="gd-review-skeleton-card" />
            <div className="gd-review-skeleton-card" />
            <div className="gd-review-skeleton-card" />
          </div>
        ) : null}

        {error ? (
          <div className="gd-state-error" role="alert">
            <div className="gd-state-icon">⚠️</div>
            <h3 className="gd-state-title">{error?.status === 403 ? 'Not permitted' : 'Something went wrong'}</h3>
            <p className="gd-state-text">{typeof error === 'string' ? error : error?.message || 'Failed to load tours'}</p>
            {error?.status !== 403 ? <button type="button" className="gd-btn-retry" onClick={reload}>Try Again</button> : null}
          </div>
        ) : null}

        {hasData ? (
          <>
            {shown.length === 0 ? <EmptyTours tab={tab} /> : null}
            {tab === 'pending' && shown.length > 0 ? (
              <div className="gd-tours-grid">
                {shown.map((c) => (
                  c.kind === 'experience' ? (
                    <ExperienceTourCard key={c.id} card={c} onDetails={() => setOpenId(c.id)} />
                  ) : (
                    <UpcomingCard key={c.id} card={c} busy={busyId === c.id} onStart={() => start(c)} onDetails={() => setOpenId(c.id)} />
                  )
                ))}
              </div>
            ) : null}
            {tab === 'ongoing' ? (
              <div className="gd-tours-list-vertical">
                {shown.map((c) => (
                  <OngoingCard key={c.id} card={c} busy={busyId === c.id} onAdvance={() => advance(c)} onDetails={() => setOpenId(c.id)} />
                ))}
              </div>
            ) : null}
            {tab === 'completed' && shown.length > 0 ? (
              <div className="gd-tours-list-vertical">
                {shown.map((c) => (
                  c.kind === 'experience' ? (
                    <ExperienceTourCard key={c.id} card={c} onDetails={() => setOpenId(c.id)} completed />
                  ) : (
                    <CompletedCard key={c.id} card={c} onDetails={() => setOpenId(c.id)} />
                  )
                ))}
              </div>
            ) : null}
          </>
        ) : null}

        {open ? (
          open.kind === 'experience' ? (
            <ExperienceDetailsOverlay card={open} onClose={() => setOpenId(null)} />
          ) : (
            <TourModal
              card={open}
              busy={busyId === open.id}
              onClose={() => setOpenId(null)}
              onStart={() => start(open)}
              onAdvance={() => advance(open)}
              onPause={() => track(open, { trackingStatus: 'paused' }, 'Tracking paused.')}
              onResume={() => track(open, { trackingStatus: 'ongoing' }, 'Tracking resumed.')}
            />
          )
        ) : null}
        {toast}
      </main>
    </div>
  );
}

function EmptyTours({ tab }) {
  const copy = {
    pending: ['Upcoming Tours', 'No upcoming tours assigned for you right now.'],
    ongoing: ['Ongoing Tours', "You don't have any tours in progress right now."],
    completed: ['Completed Tours', 'No completed tours yet!'],
  }[tab];
  return (
    <div className="gd-empty">
      <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>{copy[0]}</p>
      <p style={{ margin: '0.35rem 0 0 0' }}>{copy[1]}</p>
    </div>
  );
}

function UpcomingCard({ card, busy, onStart, onDetails }) {
  const blocker = startBlocker(card);
  return (
    <article className="gd-tour-card">
      <span className="gd-chip" style={{ color: '#0284c7', background: '#eff6ff', borderColor: '#bfdbfe', alignSelf: 'flex-start' }}>Confirmed</span>
      <h2 className="gd-tour-card-title">{card.title}</h2>
      <div className="gd-tour-meta-grid">
        <span className="gd-meta-item">👤 {card.customer}</span>
        <span className="gd-meta-item">📞 {card.phone || 'Phone not provided'}</span>
        <span className="gd-meta-item">📅 {card.startAt !== undefined ? formatDate(new Date(card.startAt).toISOString(), { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date not set'}</span>
        <span className="gd-meta-item">🕐 {card.startAt !== undefined ? new Date(card.startAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Time not set'}</span>
        <span className="gd-meta-item">📍 {card.destination}</span>
      </div>
      <div className="gd-tour-card-footer">
        <div>
          {card.amount != null ? <p className="gd-tour-amount">{formatCurrency(card.amount)}</p> : null}
          {blocker ? <p style={{ margin: 0, fontSize: '0.75rem', color: '#b45309' }}>{blocker}</p> : null}
        </div>
        <div className="gd-tour-card-actions">
          <button type="button" className="gd-btn gd-btn-primary gd-btn-sm" disabled={busy || Boolean(blocker)} title={blocker || 'Start this tour'} onClick={onStart}>Start</button>
          <button type="button" className="gd-btn gd-btn-secondary gd-btn-sm" onClick={onDetails}>Details</button>
        </div>
      </div>
    </article>
  );
}

function OngoingCard({ card, busy, onAdvance, onDetails }) {
  const { trip, stops } = card;
  const index = stopIndex(trip, stops);
  const total = stops.length || 1;
  const progress = trip.progressPercentage ?? progressOf(index, total);
  const nextStop = stops[index + 1]?.title || 'Arrived';
  const paused = trip.trackingStatus === 'paused';
  return (
    <article className="gd-ongoing-card">
      <div className="gd-ongoing-top">
        <div>
          <div className="gd-ongoing-title-row">
            <h2>{card.title}</h2>
            <span className="gd-chip" style={{ color: paused ? '#854d0e' : '#0284c7', background: paused ? '#fffbeb' : '#eff6ff', borderColor: paused ? '#fde68a' : '#bfdbfe' }}>
              {paused ? 'Paused' : 'In Progress'}
            </span>
          </div>
          <p className="gd-ongoing-sub">{card.customer}</p>
        </div>
        <div className="gd-ongoing-price">
          {card.amount != null ? <p className="price">{formatCurrency(card.amount)}</p> : null}
        </div>
      </div>

      <div className="gd-info-boxes">
        <div className="gd-info-box blue"><label>Current Stop</label><span>{trip.currentStop || '—'}</span></div>
        <div className="gd-info-box purple"><label>Duration</label><span>{card.duration}</span></div>
        <div className="gd-info-box orange"><label>Next Stop</label><span>{nextStop}</span></div>
      </div>

      <div>
        <div className="gd-progress-labels"><span>Tour Progress</span><span>{progress}%</span></div>
        <div className="gd-progress-bar-track"><div className="gd-progress-bar-fill" style={{ width: `${progress}%` }} /></div>
      </div>

      <div className="gd-ongoing-actions">
        {card.phone ? (
          <a className="gd-btn gd-btn-primary" href={`tel:${card.phone}`}>📞 Call Customer</a>
        ) : (
          <button type="button" className="gd-btn gd-btn-primary" disabled>📞 Call Customer</button>
        )}
        <button type="button" className="gd-btn gd-btn-secondary" onClick={onDetails}>🗺️ View Route</button>
        <button type="button" className="gd-btn gd-btn-success" disabled={busy || paused} onClick={onAdvance}>
          {index >= total - 1 ? 'Finish Tour' : 'Complete'}
        </button>
      </div>
    </article>
  );
}

// A confirmed experience session: single day, no stops to track, so it just shows the booking's
// own details and nothing to start/advance — the guide's only action is showing up.
function ExperienceTourCard({ card, onDetails, completed }) {
  return (
    <article className={completed ? 'gd-completed-card' : 'gd-tour-card'}>
      <span className="gd-chip" style={{ color: '#0284c7', background: '#eff6ff', borderColor: '#bfdbfe', alignSelf: 'flex-start' }}>
        🎟 {EXPERIENCE_STATUS_LABEL[completed ? 'completed' : 'confirmed']}
      </span>
      <h2 className="gd-tour-card-title">{card.title}</h2>
      <div className="gd-tour-meta-grid">
        <span className="gd-meta-item">👤 {card.customer}</span>
        <span className="gd-meta-item">📞 {card.phone || 'Phone not provided'}</span>
        <span className="gd-meta-item">📅 {formatDate(card.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        <span className="gd-meta-item">📍 {card.destination}</span>
      </div>
      <div className="gd-tour-card-footer">
        <div>{card.amount != null ? <p className="gd-tour-amount">{formatCurrency(card.amount)}</p> : null}</div>
        <div className="gd-tour-card-actions">
          <button type="button" className="gd-btn gd-btn-secondary gd-btn-sm" onClick={onDetails}>Details</button>
        </div>
      </div>
    </article>
  );
}

function ExperienceDetailsOverlay({ card, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="gc-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="gc-dialog" style={{ width: 480, maxWidth: '95vw' }} role="dialog" aria-modal="true" aria-labelledby="exp-tour-modal-title">
        <h2 id="exp-tour-modal-title">🎟 {card.title}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '12px 0' }}>
          <div><strong>👤 Guest:</strong> {card.customer}</div>
          <div><strong>📞 Phone:</strong> {card.phone || 'Not provided'}</div>
          <div><strong>📍 Destination:</strong> {card.destination}</div>
          <div><strong>🗓️ Session Date:</strong> {formatDate(card.date, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          {card.amount != null ? <div><strong>💰 Guide Fee:</strong> {formatCurrency(card.amount)}</div> : null}
        </div>
        <div className="gd-modal-footer">
          <button type="button" className="gd-btn gd-btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function CompletedCard({ card, onDetails }) {
  return (
    <article className="gd-completed-card">
      <div className="gd-completed-left">
        <h2>{card.title}</h2>
        <div className="gd-completed-icons">
          <span>👤 {card.customer}</span>
          <span>📅 {formatDate(card.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {card.amount != null ? <p className="gd-tour-amount" style={{ margin: 0 }}>{formatCurrency(card.amount)}</p> : null}
        <button type="button" className="gd-btn gd-btn-secondary gd-btn-sm" onClick={onDetails}>View Details</button>
      </div>
    </article>
  );
}

// The old modal showed an itinerary with Start / Pause / Resume / Skip and a Leaflet map. The map is not
// rebuilt (the old one plotted made-up coordinates), so the right half shows the live status instead.
function TourModal({ card, busy, onClose, onStart, onAdvance, onPause, onResume }) {
  const { trip, stops } = card;
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const current = trip.trackingStatus === 'not_started' ? -1 : stopIndex(trip, stops);
  const done = trip.trackingStatus === 'completed';
  const stateOf = (i) => (done || i < current ? 'completed' : i === current ? 'current' : '');

  return (
    <div className="gc-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="gc-dialog" style={{ width: 760, maxWidth: '95vw', padding: 0 }} role="dialog" aria-modal="true" aria-labelledby="tour-modal-title">
        <div className="gd-tour-modal-header">
          <h2 id="tour-modal-title">{card.title}</h2>
          <div className="gd-tour-modal-meta">
            <span><strong>ID:</strong> {trip.id.slice(0, 8)}</span>
            <span><strong>Date:</strong> {formatDate(card.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            <span><strong>Customer:</strong> {card.customer}</span>
          </div>
        </div>

        <div className="gd-tracking-container">
          <div className="gd-tracking-left">
            <h3>Itinerary</h3>
            <ul className="gd-tracking-stops">
              {stops.length === 0 ? <li>No stops planned yet.</li> : null}
              {stops.map((s, i) => <li key={s.id} className={stateOf(i)}>{s.title}</li>)}
            </ul>

            {!done ? (
              <div className="gd-tour-modal-controls">
                {trip.trackingStatus === 'not_started' ? (
                  <button type="button" className="gd-btn gd-btn-primary" disabled={busy || Boolean(startBlocker(card))} title={startBlocker(card) || "Start this tour"} onClick={onStart}>Start</button>
                ) : (
                  <>
                    <button type="button" className="gd-btn gd-btn-secondary" disabled={busy || trip.trackingStatus === 'paused'} onClick={onPause}>Pause</button>
                    <button type="button" className="gd-btn gd-btn-secondary" disabled={busy || trip.trackingStatus !== 'paused'} onClick={onResume}>Resume</button>
                    <button type="button" className="gd-btn gd-btn-secondary" disabled={busy || trip.trackingStatus === 'paused'} onClick={onAdvance}>Skip</button>
                  </>
                )}
              </div>
            ) : null}
          </div>

          <div className="gd-tracking-right">
            <h3>Live status</h3>
            <div><strong>Status:</strong> {trip.trackingStatus.replace('_', ' ')}</div>
            <div><strong>Day:</strong> {trip.currentDay}</div>
            <div><strong>Current stop:</strong> {trip.currentStop || '—'}</div>
            <div><strong>Location:</strong> {trip.currentLocation || '—'}</div>
            <div><strong>Progress:</strong> {trip.progressPercentage}%</div>
            <div className="muted">Updated {trip.lastUpdatedAt ? new Date(trip.lastUpdatedAt).toLocaleString() : '—'}</div>
          </div>
        </div>

        <div className="gd-modal-footer">
          <button type="button" className="gd-btn gd-btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
