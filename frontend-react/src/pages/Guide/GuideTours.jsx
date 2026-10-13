import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/foundation';
import { useAsyncData } from '@/hooks/useAsyncData.js';
import { getTraveller, listMyAssignments, listMyTrips, listPlans, updateTripTracking } from '@/services/guide.api.js';
import { GUIDE_TOURS_CSS } from '@/legacy/styles.js';
import { formatCurrency, formatDate } from '@/lib/datetime.js';
import { ui } from '@/lib/assets.js';
import { fontPx, px } from '@/lib/density.js';
import GuidePage from '@/components/guide/GuidePage.jsx';
import { ErrorNotice, LoadingState } from '@/components/guide/Feedback.jsx';
import { useToast } from '@/components/guide/Toast.jsx';

const TABS = [
  { key: 'pending', label: 'Upcoming' },
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'completed', label: 'Completed' },
];

// The old page kept tours in localStorage with three statuses. A trip's tracking status is the source here:
//   not_started -> Upcoming, ongoing / paused -> Ongoing, completed -> Completed.
const tabOf = (trip) => (trip.trackingStatus === 'completed' ? 'completed' : trip.trackingStatus === 'not_started' ? 'pending' : 'ongoing');

// Flatten itinerary.days[].experiences[] into the ordered list of stops the guide walks through.
function stopsOf(trip) {
  const days = trip.itinerary?.days ?? [];
  return days.flatMap((day) =>
    (day.experiences ?? []).map((e) => ({ id: e.id, title: e.title, location: e.location, day: day.dayNumber, startsAt: e.startsAt })),
  );
}

const stopIndex = (trip, stops) => Math.max(0, stops.findIndex((s) => s.title === trip.currentStop));
const progressOf = (index, total) => Math.round((index / (total - 1 || 1)) * 100);
const timeOf = (iso) => (iso ? new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—');

async function loadTours(guideId) {
  const [trips, assignments, plans] = await Promise.all([listMyTrips(guideId), listMyAssignments(guideId), listPlans()]);
  // Traveller names and phones come from their profiles; a profile we may not read just shows as "Traveller".
  const ids = [...new Set(trips.map((t) => t.travellerId))];
  const settled = await Promise.allSettled(ids.map((id) => getTraveller(id)));
  const travellers = {};
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') travellers[ids[i]] = r.value;
  });
  return { trips, assignments, plans, travellers };
}

export default function GuideTours() {
  const { user } = useAuth();
  const loader = useCallback(() => loadTours(user.id), [user.id]);
  const { data, error, loading, reload, mutate } = useAsyncData(loader);
  const { toast, show } = useToast();
  const [tab, setTab] = useState('pending');
  const [openId, setOpenId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const cards = useMemo(() => {
    if (!data) return [];
    const planById = new Map(data.plans.map((p) => [p.id, p]));
    return data.trips.map((trip) => {
      const plan = planById.get(trip.planId);
      const job = data.assignments.find((a) => a.travellerId === trip.travellerId && a.planId === trip.planId && a.status !== 'cancelled');
      const t = data.travellers[trip.travellerId];
      const stops = stopsOf(trip);
      return {
        trip,
        stops,
        plan,
        job,
        title: plan?.title || trip.planId,
        destination: plan?.destination || '',
        customer: t ? `${t.fname || ''} ${t.lname || ''}`.trim() || 'Traveller' : 'Traveller',
        phone: t?.phno ? String(t.phno) : '',
        guests: job?.travelerCount ?? 1,
        amount: job?.paidAmount,
        date: job?.startDate || stops[0]?.startsAt,
        duration: plan ? `${plan.durationNights + 1} days` : '—',
      };
    });
  }, [data]);

  const counts = Object.fromEntries(TABS.map((t) => [t.key, cards.filter((c) => tabOf(c.trip) === t.key).length]));
  const shown = cards.filter((c) => tabOf(c.trip) === tab);
  const open = cards.find((c) => c.trip.id === openId);

  // Every change is a PATCH; the page then shows exactly what the server answered with.
  async function track(card, changes, message) {
    setBusyId(card.trip.id);
    try {
      const updated = await updateTripTracking(card.trip.id, changes);
      mutate((d) => ({ ...d, trips: d.trips.map((t) => (t.id === updated.id ? updated : t)) }));
      if (message) show(message, 'success');
      return updated;
    } catch (err) {
      show(err.message || 'Could not update the tour.', 'error');
      return null;
    } finally {
      setBusyId(null);
    }
  }

  function start(card) {
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
    <GuidePage css={GUIDE_TOURS_CSS} title="Tours" pageWrapper>
      <div id="tour-page-header" className="welcome">
        <h1>Tour Management</h1>
        <p>View all your tours at one place</p>
      </div>
      <div id="tours-internal-navbar" className="internal-navbar" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={`tab-btn${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}{data ? ` (${counts[t.key]})` : ''}
          </button>
        ))}
      </div>

      {!data && loading ? <LoadingState label="Loading your tours…" /> : null}
      <ErrorNotice error={error} onRetry={reload} />

      {data ? (
        <div id="internal-contents">
          {shown.length === 0 ? <EmptyTours tab={tab} /> : null}
          {tab === 'pending' && shown.length > 0 ? (
            <div className="tours-grid">
              {shown.map((c) => (
                <UpcomingCard key={c.trip.id} card={c} busy={busyId === c.trip.id} onStart={() => start(c)} onDetails={() => setOpenId(c.trip.id)} />
              ))}
            </div>
          ) : null}
          {tab === 'ongoing' ? shown.map((c) => (
            <OngoingCard key={c.trip.id} card={c} busy={busyId === c.trip.id} onAdvance={() => advance(c)} onDetails={() => setOpenId(c.trip.id)} />
          )) : null}
          {tab === 'completed' && shown.length > 0 ? (
            <div className="tours-list-vertical">
              {shown.map((c) => <CompletedCard key={c.trip.id} card={c} onDetails={() => setOpenId(c.trip.id)} />)}
            </div>
          ) : null}
        </div>
      ) : null}

      {open ? (
        <TourModal
          card={open}
          busy={busyId === open.trip.id}
          onClose={() => setOpenId(null)}
          onStart={() => start(open)}
          onAdvance={() => advance(open)}
          onPause={() => track(open, { trackingStatus: 'paused' }, 'Tracking paused.')}
          onResume={() => track(open, { trackingStatus: 'ongoing' }, 'Tracking resumed.')}
        />
      ) : null}
      {toast}
    </GuidePage>
  );
}

function EmptyTours({ tab }) {
  const copy = {
    pending: ['Upcoming Tours', 'No upcoming tours assigned for you right now.'],
    ongoing: ['Ongoing Tours', "You don't have any tours in progress right now."],
    completed: ['Completed Tours', 'No completed tours yet!'],
  }[tab];
  return (
    <div className="empty-state-card">
      <h2>{copy[0]}</h2>
      <p className="no-data">{copy[1]}</p>
    </div>
  );
}

function Meta({ icon, alt, children }) {
  return (
    <div className="meta-item">
      <img src={ui(icon)} alt={alt} className="meta-icon" />
      <span>{children}</span>
    </div>
  );
}

function UpcomingCard({ card, busy, onStart, onDetails }) {
  return (
    <div className="tour-card">
      <div className="card-badge"><span className="badge badge-confirmed">Confirmed</span></div>
      <h2 className="card-title">{card.title}</h2>
      <div className="tour-meta-grid">
        <Meta icon="user.svg" alt="user">{card.customer}</Meta>
        <Meta icon="support.svg" alt="phone">{card.phone || 'N/A'}</Meta>
        <Meta icon="upcomingtours.svg" alt="date">{formatDate(card.date, { day: 'numeric', month: 'short', year: 'numeric' })}</Meta>
        <Meta icon="schedule.svg" alt="time">{timeOf(card.stops[0]?.startsAt)}</Meta>
        <Meta icon="tours.svg" alt="location">{card.destination}</Meta>
      </div>
      <div className="card-footer-info">
        <div className="guests-amount">
          <p className="guests">{card.guests} guests</p>
          {card.amount != null ? <p className="amount">{formatCurrency(card.amount)}</p> : null}
        </div>
        <div className="card-actions">
          <button type="button" className="btn btn-solid-blue" disabled={busy} onClick={onStart}>Start</button>
          <button type="button" className="btn btn-outline-blue" onClick={onDetails}>Details</button>
        </div>
      </div>
    </div>
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
    <div className="ongoing-tour-card">
      <div className="card-top-header">
        <div className="title-row">
          <h2>{card.title}</h2>
          <span className="badge badge-ongoing">{paused ? 'Paused' : 'In Progress'}</span>
        </div>
        <div className="price-guests">
          {card.amount != null ? <h3 className="price">{formatCurrency(card.amount)}</h3> : null}
          <p className="guests-small">{card.guests} guests</p>
        </div>
      </div>
      <p className="customer-subtitle">{card.customer}</p>

      <div className="info-boxes">
        <div className="info-box light-blue"><label>Current Stop</label><span>{trip.currentStop || '—'}</span></div>
        <div className="info-box light-purple"><label>Duration</label><span>{card.duration}</span></div>
        <div className="info-box light-orange"><label>Next Stop</label><span className="next-stop-text">{nextStop}</span></div>
      </div>

      <div className="progress-section">
        <div className="progress-labels">
          <label>Tour Progress</label>
          <span className="percent text-blue">{progress}%</span>
        </div>
        <div className="progress-bar-container">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="action-buttons-ongoing">
        {card.phone ? (
          <a className="btn btn-solid-blue flex-btn" href={`tel:${card.phone}`} style={{ textDecoration: 'none' }}>
            <img src={ui('support.svg')} alt="" className="btn-icon" style={{ filter: 'brightness(0) invert(1)' }} /> Call Customer
          </a>
        ) : (
          <button type="button" className="btn btn-solid-blue flex-btn" disabled>
            <img src={ui('support.svg')} alt="" className="btn-icon" style={{ filter: 'brightness(0) invert(1)' }} /> Call Customer
          </button>
        )}
        <button type="button" className="btn btn-outline-blue flex-btn" onClick={onDetails}>
          <img src={ui('tours.svg')} alt="" className="btn-icon" /> View Route
        </button>
        <button type="button" className="btn btn-outline-green flex-btn" disabled={busy || paused} onClick={onAdvance}>
          <img src={ui('schedule.svg')} alt="" className="btn-icon" /> {index >= total - 1 ? 'Finish Tour' : 'Complete'}
        </button>
      </div>
    </div>
  );
}

function CompletedCard({ card, onDetails }) {
  return (
    <div className="completed-tour-card">
      <div className="comp-header">
        <h2>{card.title}</h2>
        {card.amount != null ? <h3 className="price">{formatCurrency(card.amount)}</h3> : null}
      </div>
      <div className="comp-sub">
        <div className="comp-icons">
          <span className="cust-info"><img src={ui('user.svg')} alt="user" /> {card.customer}</span>
          <span className="cust-info"><img src={ui('upcomingtours.svg')} alt="date" /> {formatDate(card.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          <span className="cust-info">{card.guests} guests</span>
        </div>
      </div>
      <div className="comp-actions">
        <button type="button" className="btn btn-outline-blue" onClick={onDetails}>View Details</button>
      </div>
    </div>
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
  const stateOf = (i) => (done || i < current ? 'completed' : i === current ? 'current' : 'pending');

  return (
    <div id="tourModal" className="modal-overlay active" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="tour-modal-title">
        <div className="modal-header">
          <span />
          <button type="button" className="close-btn" aria-label="Close" onClick={onClose}>&times;</button>
        </div>
        <div id="modalBody" className="modal-body">
          <div className="tracking-modal-header" style={{ padding: `${px(20)}px ${px(24)}px`, borderBottom: '1px solid #e5e7eb' }}>
            <h2 id="tour-modal-title" style={{ margin: 0, fontSize: fontPx(20), fontWeight: 600, color: '#111827' }}>{card.title}</h2>
            <div style={{ marginTop: px(8), display: 'flex', gap: px(16), fontSize: fontPx(13), color: '#4b5563' }}>
              <span><strong style={{ color: '#111827' }}>ID:</strong> {trip.id}</span>
              <span><strong style={{ color: '#111827' }}>Date:</strong> {formatDate(card.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <span><strong style={{ color: '#111827' }}>Customer:</strong> {card.customer}</span>
            </div>
          </div>

          <div className="tracking-container" style={{ height: px(500), padding: px(24) }}>
            <div className="tracking-left">
              <h3 style={{ margin: `0 0 ${px(16)}px 0`, fontSize: fontPx(16), color: '#111827' }}>Itinerary</h3>
              <ul id="trackingStops">
                {stops.length === 0 ? <li className="pending">No stops planned yet.</li> : null}
                {stops.map((s, i) => (
                  <li key={s.id} className={stateOf(i)}>{s.title}</li>
                ))}
              </ul>

              {!done ? (
                <div id="guideControls" style={{ marginTop: 'auto', paddingTop: px(16), borderTop: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', gap: px(8), flexWrap: 'wrap' }}>
                    {trip.trackingStatus === 'not_started' ? (
                      <button type="button" className="btn-solid-blue" disabled={busy} onClick={onStart}>Start</button>
                    ) : (
                      <>
                        <button type="button" className="btn-outline-blue" disabled={busy || trip.trackingStatus === 'paused'} onClick={onPause}>Pause</button>
                        <button type="button" className="btn-outline-blue" disabled={busy || trip.trackingStatus !== 'paused'} onClick={onResume}>Resume</button>
                        <button type="button" className="btn-outline-blue" disabled={busy || trip.trackingStatus === 'paused'} onClick={onAdvance}>Skip</button>
                      </>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="tracking-right">
              <div style={{ padding: px(24), height: '100%', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: px(10), fontSize: fontPx(14), color: '#374151' }}>
                <h3 style={{ margin: 0, fontSize: fontPx(16), color: '#111827' }}>Live status</h3>
                <div><strong>Status:</strong> {trip.trackingStatus.replace('_', ' ')}</div>
                <div><strong>Day:</strong> {trip.currentDay}</div>
                <div><strong>Current stop:</strong> {trip.currentStop || '—'}</div>
                <div><strong>Location:</strong> {trip.currentLocation || '—'}</div>
                <div><strong>Progress:</strong> {trip.progressPercentage}%</div>
                <div style={{ color: '#6b7280', fontSize: fontPx(12) }}>Updated {trip.lastUpdatedAt ? new Date(trip.lastUpdatedAt).toLocaleString() : '—'}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="secondary-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
