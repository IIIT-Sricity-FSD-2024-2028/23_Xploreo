import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '@/foundation';
import {
  fetchGuideDashboardData,
  confirmAssignmentThunk,
  rejectAssignmentThunk,
  applyToPlanThunk,
  applyToExperienceThunk,
  fetchTravellerDetails,
  clearActiveTraveller,
  clearGuideState,
  selectGuidePlans,
  selectGuideExperiences,
  selectGuideApplications,
  selectGuideAssignments,
  selectGuideLoading,
  selectGuideActionBusy,
  selectGuideError,
  selectActiveTraveller,
  selectDashboardStats,
} from '@/store/guide/index.js';
import { formatCurrency } from '@/lib/datetime.js';
import StatusChip from '@/components/guide/StatusChip.jsx';
import { useToast } from '@/components/guide/Toast.jsx';
import { ConfirmDialog, Overlay } from '@/components/guide/Dialog.jsx';
import './guideDashboard.css';

const TABS = [
  { key: 'plans', label: '📦 Browse Plans' },
  { key: 'applications', label: '📋 My Applications' },
  { key: 'assignments', label: '🧳 My Jobs' },
];
const APP_FILTERS = [['all', 'All'], ['pending', 'Pending'], ['accepted', 'Accepted'], ['rejected', 'Rejected']];
const JOB_FILTERS = [
  ['all', 'All'],
  ['pending_guide_confirm', 'Awaiting My Confirm'],
  ['confirmed', 'Confirmed'],
  ['rejected_by_guide', 'Rejected'],
  ['cancelled', 'Cancelled'],
];

const sameArea = (a, b) => {
  const x = String(a ?? '').toLowerCase();
  const y = String(b ?? '').toLowerCase();
  return !x || !y || x.includes(y) || y.includes(x);
};
const longDate = (value) => {
  if (!value) return 'Not provided';
  const d = new Date(String(value).length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(d.getTime()) ? 'Not provided' : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};
const shortDate = (value) => {
  if (!value) return '—';
  const d = new Date(String(value).length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
};
// Assignments are Trips: there is no top-level "start date" field, only itinerary dates (and
// lastUpdatedAt as a fallback) — see trips/entities/trip.entity.ts.
const tripDate = (job) => job.itinerary?.day1?.hotel?.checkInDate || job.itinerary?.day1?.flight?.departureAt || job.lastUpdatedAt;

export default function GuideDashboard() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const region = user.region || '';
  const { toast, show } = useToast();

  // Redux Selectors: All data is read directly from the Redux Store
  const allPlans = useSelector(selectGuidePlans);
  const allExperiences = useSelector(selectGuideExperiences);
  const applications = useSelector(selectGuideApplications);
  const assignments = useSelector(selectGuideAssignments);
  const loading = useSelector(selectGuideLoading);
  const actionBusy = useSelector(selectGuideActionBusy);
  const error = useSelector(selectGuideError);
  const { accepted, pending, activeJobs } = useSelector(selectDashboardStats);

  const [tab, setTab] = useState('plans');
  const [applying, setApplying] = useState(null); // { kind, id, title, ... } being applied to
  const [rejecting, setRejecting] = useState(null); // assignment id awaiting the "are you sure"
  const [details, setDetails] = useState(null); // assignment whose details are open

  // Synchronize with backend via Redux Thunk
  useEffect(() => {
    if (user?.id) {
      dispatch(fetchGuideDashboardData(user.id));
    }
  }, [dispatch, user?.id]);

  const reload = useCallback(() => {
    if (user?.id) {
      dispatch(fetchGuideDashboardData(user.id));
    }
  }, [dispatch, user?.id]);

  const plans = useMemo(() => allPlans.filter((p) => sameArea(p.destination, region)), [allPlans, region]);
  const experiences = useMemo(() => allExperiences.filter((e) => sameArea(e.destination, region)), [allExperiences, region]);
  const planById = useMemo(() => new Map(allPlans.map((p) => [p.id, p])), [allPlans]);

  // Data is loaded from Redux
  const data = !loading || allPlans.length > 0 || applications.length > 0 || assignments.length > 0;

  async function onConfirm(id) {
    try {
      await dispatch(confirmAssignmentThunk({ id, kind: assignments.find((a) => a.id === id)?.kind })).unwrap();
      show('Confirmed! Traveller has been notified.', 'success');
    } catch (err) {
      show(err || 'Failed to confirm.', 'error');
    }
  }

  async function onReject() {
    const id = rejecting;
    try {
      await dispatch(rejectAssignmentThunk({ id, kind: assignments.find((a) => a.id === id)?.kind })).unwrap();
      show('Declined. The traveller was told and can choose another guide.', 'info');
      setRejecting(null);
    } catch (err) {
      setRejecting(null);
      show(err || 'Failed to reject.', 'error');
    }
  }

  return (
    <div className="gd-page-wrapper">
      <main className="gd-page">
        <header className="gd-header">
          <div className="gd-header-text">
            <span className="gd-eyebrow">Guide Portal</span>
            <h1 className="gd-title">Welcome, {user.name || 'Guide'}!</h1>
            <p className="gd-subtitle">
              Assigned region: <span className="gd-header-badge">{region || '—'}</span>{' '}
              · Manage your plan applications and bookings
            </p>
          </div>
        </header>

        <section className="gd-kpi-row" aria-label="Dashboard Overview">
          <div className="gd-kpi-card">
            <div className="gd-kpi-icon-wrap kpi-blue">📦</div>
            <div className="gd-kpi-data"><span className="gd-kpi-val">{plans.length}</span><span className="gd-kpi-lbl">Plans Available</span></div>
          </div>
          <div className="gd-kpi-card">
            <div className="gd-kpi-icon-wrap kpi-green">✓</div>
            <div className="gd-kpi-data"><span className="gd-kpi-val">{accepted}</span><span className="gd-kpi-lbl">Accepted</span></div>
          </div>
          <div className="gd-kpi-card">
            <div className="gd-kpi-icon-wrap kpi-yellow">⏳</div>
            <div className="gd-kpi-data"><span className="gd-kpi-val">{pending}</span><span className="gd-kpi-lbl">Pending</span></div>
          </div>
          <div className="gd-kpi-card">
            <div className="gd-kpi-icon-wrap kpi-teal">🧳</div>
            <div className="gd-kpi-data"><span className="gd-kpi-val">{activeJobs}</span><span className="gd-kpi-lbl">Active Jobs</span></div>
          </div>
        </section>

        <div className="gd-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={`gd-tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {!data && loading ? (
          <div className="gd-review-loading" aria-hidden="true">
            <div className="gd-review-skeleton-card" />
            <div className="gd-review-skeleton-card" />
            <div className="gd-review-skeleton-card" />
          </div>
        ) : null}

        {error ? (
          <div className="gd-state-error" role="alert">
            <div className="gd-state-icon">⚠️</div>
            <h3 className="gd-state-title">{error.status === 403 ? 'Not permitted' : error.status === 401 ? 'Session ended' : 'Something went wrong'}</h3>
            <p className="gd-state-text">{error.message}</p>
            {error.status !== 403 && error.status !== 401 ? <button type="button" className="gd-btn-retry" onClick={reload}>Try Again</button> : null}
          </div>
        ) : null}

        {data ? (
          <>
            {tab === 'plans' ? <PlansTab plans={plans} experiences={experiences} applications={applications} onApply={setApplying} /> : null}
            {tab === 'applications' ? <ApplicationsTab applications={applications} /> : null}
            {tab === 'assignments' ? (
              <JobsTab assignments={assignments} planById={planById} busy={actionBusy} onConfirm={onConfirm} onReject={setRejecting} onDetails={setDetails} />
            ) : null}
          </>
        ) : null}
      </main>

      {applying ? (
        <ApplyModal
          plan={applying}
          onClose={() => setApplying(null)}
          onDone={() => {
            setApplying(null);
            show('Application submitted — the regional NTA will review it. Travellers can pick you once it is accepted.', 'success');
          }}
        />
      ) : null}
      {rejecting ? (
        <ConfirmDialog
          title="Decline Job"
          text="Are you sure you want to decline this job? The traveller will be told and can choose another guide."
          confirmLabel="Decline Job"
          busy={actionBusy}
          onConfirm={onReject}
          onClose={() => setRejecting(null)}
        />
      ) : null}
      {details ? <DetailsModal assignment={details} onClose={() => setDetails(null)} /> : null}
      {toast}
    </div>
  );
}

function PlansTab({ plans, experiences, applications, onApply }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  // One browse list: a plan ("lead this whole trip") and an experience ("guide this one session")
  // are both something a guide applies to lead, reviewed the same way by the regional NTA.
  const items = useMemo(
    () => [
      ...plans.map((p) => ({ kind: 'plan', id: p.id, title: p.title, destination: p.destination, description: p.description, price: p.pricePerPerson, meta: `🌙 ${p.durationNights} nights · ⭐ ${p.hotelStars || 3} star hotel` })),
      ...experiences.map((e) => ({ kind: 'experience', id: e.id, title: e.title, destination: e.destination, description: e.description, price: e.price, meta: `◷ ${e.durationHours} hours · ${e.category}` })),
    ],
    [plans, experiences],
  );
  const shown = items.filter((it) => !q || it.title.toLowerCase().includes(q) || it.destination.toLowerCase().includes(q));
  const applicationFor = (item) =>
    applications.find((a) => (item.kind === 'plan' ? a.planId === item.id : a.experienceId === item.id));

  return (
    <>
      <div className="gd-section-header">
        <h2>Available Travel Plans &amp; Experiences</h2>
        <input className="gd-search" id="gd-plan-search" placeholder="Search by destination or title…" aria-label="Search plans and experiences" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="gd-plans-grid" id="gd-plans-grid">
        {shown.length === 0 ? <div className="gd-empty">Nothing available in your region right now.</div> : null}
        {shown.map((item) => {
          const mine = applicationFor(item);
          return (
            <div className="gd-plan-card" key={`${item.kind}-${item.id}`}>
              <div className="gd-plan-top">
                <div className="gd-plan-dest">{item.kind === 'experience' ? '🎟 ' : '📦 '}{item.destination}</div>
                {mine ? <StatusChip status={mine.status} /> : null}
              </div>
              <h3 className="gd-plan-title">{item.title}</h3>
              <p className="gd-plan-desc">{(item.description || '').substring(0, 90)}…</p>
              <div className="gd-plan-meta">
                <span>💰 {formatCurrency(item.price)}/person</span>
                <span>{item.meta}</span>
              </div>
              {mine?.autoDecisionReason ? <p className="gd-auto-reason">{mine.autoDecisionReason}</p> : null}
              <div className="gd-plan-action">
                {!mine ? (
                  <button type="button" className="gd-btn gd-btn-primary" onClick={() => onApply(item)}>Apply to Guide</button>
                ) : mine.status === 'rejected' ? (
                  <button type="button" className="gd-btn gd-btn-secondary" disabled>Rejected</button>
                ) : mine.status === 'pending' ? (
                  <button type="button" className="gd-btn gd-btn-secondary" disabled>Pending Review</button>
                ) : (
                  <button type="button" className="gd-btn gd-btn-success" disabled>✓ Accepted</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function ApplyModal({ plan: item, onClose, onDone }) {
  const dispatch = useDispatch();
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');
  const saving = useSelector(selectGuideActionBusy);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !saving && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  async function submit(event) {
    event.preventDefault();
    const value = parseFloat(price);
    if (Number.isNaN(value) || value < 0) {
      setError('Please enter a valid price.');
      return;
    }
    setError('');
    try {
      const thunk = item.kind === 'experience'
        ? applyToExperienceThunk({ experienceId: item.id, guidePricePerPerson: value })
        : applyToPlanThunk({ planId: item.id, guidePricePerPerson: value });
      const application = await dispatch(thunk).unwrap();
      onDone(application);
    } catch (err) {
      setError(err || 'Failed to submit. Try again.');
    }
  }

  return (
    <div id="gd-apply-modal" className="gd-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <form className="gd-modal" role="dialog" aria-modal="true" aria-labelledby="gd-modal-plan-name" onSubmit={submit} noValidate>
        <h3 id="gd-modal-plan-name">Apply: {item.title}</h3>
        <p className="gd-modal-sub">Set your price per person for {item.kind === 'experience' ? 'this experience' : 'this plan'}</p>
        <label className="gd-label">
          Your Price Per Person (₹)
          <input type="number" className="gd-input" min="0" placeholder="e.g. 1500" autoFocus value={price} onChange={(e) => setPrice(e.target.value)} />
        </label>
        <div className="gd-modal-actions">
          <button type="button" className="gd-btn gd-btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="gd-btn gd-btn-primary" disabled={saving}>{saving ? 'Submitting…' : 'Submit Application'}</button>
        </div>
        <p className="gd-error" role={error ? 'alert' : undefined}>{error}</p>
      </form>
    </div>
  );
}

function FilterRow({ options, value, onChange }) {
  return (
    <div className="gd-filter-row">
      {options.map(([key, label]) => (
        <button key={key} type="button" className={`gd-filter-btn${value === key ? ' active' : ''}`} onClick={() => onChange(key)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function ApplicationsTab({ applications }) {
  const [filter, setFilter] = useState('all');
  const rows = filter === 'all' ? applications : applications.filter((a) => a.status === filter);
  return (
    <>
      <div className="gd-section-header">
        <h2>My Applications</h2>
        <FilterRow options={APP_FILTERS} value={filter} onChange={setFilter} />
      </div>
      <div className="gd-table-wrap">
        <table className="gd-table">
          <thead>
            <tr><th>Plan / Experience</th><th>Price/Person</th><th>Status</th><th>Decision Reason</th><th>Applied</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="gd-empty-cell">No applications found.</td></tr>
            ) : (
              rows.map((app) => {
                const isExperience = Boolean(app.experienceId);
                const target = isExperience ? app.experience : app.plan;
                return (
                  <tr key={app.id}>
                    <td>
                      <strong>{isExperience ? '🎟 ' : '📦 '}{target?.title || app.planId || app.experienceId}</strong>
                      <br /><small>{target?.destination || ''}</small>
                    </td>
                    <td>₹{app.guidePricePerPerson}</td>
                    <td><StatusChip status={app.status} /></td>
                    <td className="gd-reason-cell">{app.autoDecisionReason || '—'}</td>
                    <td>{shortDate(app.createdAt)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function JobsTab({ assignments, planById, busy, onConfirm, onReject, onDetails }) {
  const [filter, setFilter] = useState('all');
  const rows = filter === 'all' ? assignments : assignments.filter((a) => a.status === filter);
  return (
    <>
      <div className="gd-section-header">
        <h2>My Incoming Jobs</h2>
        <FilterRow options={JOB_FILTERS} value={filter} onChange={setFilter} />
      </div>
      <div id="gd-assignments-list">
        {rows.length === 0 ? <div className="gd-empty">No jobs found for this filter.</div> : null}
        {rows.map((job) => {
          const isExperience = job.kind === 'experience';
          const p = planById.get(job.planId);
          const awaiting = job.status === 'pending_guide_confirm';
          return (
            <div className={`gd-assignment-card${awaiting ? ' gd-asgn-pending' : ''}`} key={job.id}>
              <div className="gd-asgn-top">
                <div>
                  <h3>{isExperience ? `🎟 ${job.title}` : p?.title || job.planId}</h3>
                  <p className="gd-asgn-dest">📍 {isExperience ? job.destination : p?.destination || ''}</p>
                </div>
                <StatusChip status={job.status} />
              </div>
              <div className="gd-asgn-meta">
                <span>👤 Traveller: {isExperience ? `${job.guestName} (${job.participants} guests)` : <code>{job.travellerId}</code>}</span>
                <span>💰 {isExperience ? `Your guide fee: ₹${job.guideFee || 0}` : `Trip Amount: ₹${job.totalAmount || 0}`}</span>
                <span>📅 {isExperience ? 'Session Date' : 'Travel Date'}: {shortDate(isExperience ? job.date : tripDate(job))}</span>
              </div>
              <div className="gd-asgn-actions">
                {awaiting ? (
                  <>
                    <button type="button" className="gd-btn gd-btn-success gd-btn-sm" disabled={busy} onClick={() => onConfirm(job.id)}>✓ Confirm Available</button>
                    <button type="button" className="gd-btn gd-btn-danger gd-btn-sm" disabled={busy} onClick={() => onReject(job.id)}>✗ Not Available</button>
                  </>
                ) : null}
                {job.status === 'confirmed' ? (
                  <button type="button" className="gd-btn gd-btn-primary gd-btn-sm" onClick={() => onDetails(job)}>View Details</button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function ageFrom(dob) {
  if (!dob) return 'Not provided';
  const ms = Date.now() - new Date(dob).getTime();
  return Number.isFinite(ms) ? `${Math.abs(new Date(ms).getUTCFullYear() - 1970)} years` : 'Not provided';
}

function DetailsModal({ assignment, onClose }) {
  if (assignment.kind === 'experience') {
    return <ExperienceDetailsModal assignment={assignment} onClose={onClose} />;
  }
  return <TripDetailsModal assignment={assignment} onClose={onClose} />;
}

// Experience-session job: everything needed is already on the booking itself (the guestName,
// email and phone the traveller entered at checkout) — no traveller-profile lookup needed, and
// none is attempted, since that lookup only knows how to share contact info for Trips.
function ExperienceDetailsModal({ assignment, onClose }) {
  const count = assignment.participants || 1;
  return (
    <Overlay labelledBy="gc-details-title" onClose={onClose} className="gc-details">
      <div className="gc-details-head">
        <span id="gc-details-title">📌 Session Details</span>
        <button type="button" aria-label="Close" onClick={onClose}>&times;</button>
      </div>
      <div className="gc-details-body">
        <div className="gc-details-card">
          <div><strong>🎟 Experience:</strong> {assignment.title}</div>
          <div className="row2">
            <div><strong>👤 Guest:</strong> {assignment.guestName || 'Not provided'}</div>
            <div><strong>📍 Location:</strong> {assignment.destination || 'Not provided'}</div>
          </div>
          <div className="row2">
            <div><strong>📞 Phone:</strong> {assignment.guestPhone ? String(assignment.guestPhone) : 'Not provided'}</div>
            <div>
              <strong>✉️ Email:</strong>{' '}
              {assignment.guestEmail ? <a href={`mailto:${assignment.guestEmail}`}>{assignment.guestEmail}</a> : 'Not provided'}
            </div>
          </div>
        </div>
        <div className="gc-details-line"><strong>Guests:</strong> {count}</div>
        <hr />
        <div className="gc-details-line"><strong>📅 Booking Made On:</strong> {longDate(assignment.createdAt)}</div>
        <div className="gc-details-line"><strong>🗓️ Session Date:</strong> <b className="blue">{longDate(assignment.date)}</b></div>
        <hr />
        <div><strong>💰 Guide Fee:</strong> ₹{assignment.guidePricePerPerson}/person</div>
        <div className="gc-details-total">Total Expected: ₹{Number(assignment.guideFee || assignment.guidePricePerPerson * count).toLocaleString('en-IN')}</div>
      </div>
      <div className="gc-details-foot"><button type="button" onClick={onClose}>Close</button></div>
    </Overlay>
  );
}

function TripDetailsModal({ assignment, onClose }) {
  const dispatch = useDispatch();
  const traveller = useSelector(selectActiveTraveller);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (assignment?.travellerId) {
      dispatch(fetchTravellerDetails(assignment.travellerId))
        .unwrap()
        .catch((err) => {
          setNote(err?.status === 403 ? 'Traveller contact details are not available for this job.' : '');
        });
    }
    return () => {
      dispatch(clearActiveTraveller());
    };
  }, [dispatch, assignment?.travellerId]);

  const name = traveller ? `${traveller.fname || ''} ${traveller.lname || ''}`.trim() : '';
  const count = assignment.travelerCount || assignment.numberOfTravelers || 1;
  const email = traveller?.email;
  return (
    <Overlay labelledBy="gc-details-title" onClose={onClose} className="gc-details">
      <div className="gc-details-head">
        <span id="gc-details-title">📌 Job Details</span>
        <button type="button" aria-label="Close" onClick={onClose}>&times;</button>
      </div>
      <div className="gc-details-body">
        <div className="gc-details-card">
          <div><strong>👤 Name:</strong> {name || `Traveller ${String(assignment.travellerId).slice(0, 5)}`}</div>
          <div className="row2">
            <div><strong>📞 Phone:</strong> {traveller?.phno ? String(traveller.phno) : 'Not provided'}</div>
            <div><strong>🎂 Age:</strong> {ageFrom(traveller?.dob)}</div>
          </div>
          <div className="row2"><div><strong>🚻 Gender:</strong> {traveller?.gender || 'Not provided'}</div></div>
          <div><strong>✉️ Email:</strong> {email ? <a href={`mailto:${email}`}>{email}</a> : 'Not provided'}</div>
          {traveller === undefined ? <small>Loading traveller details…</small> : null}
          {note ? <small>{note}</small> : null}
        </div>
        <div className="gc-details-line"><strong>Travelers Count:</strong> {count}</div>
        <hr />
        <div className="gc-details-line"><strong>📅 Booking Made On:</strong> {longDate(assignment.createdAt)}</div>
        <div className="gc-details-line"><strong>🛫 Travel Start Date:</strong> <b className="blue">{longDate(assignment.startDate || assignment.createdAt)}</b></div>
        <div className="gc-details-line"><strong>🛬 Travel End Date:</strong> <b className="blue">{longDate(assignment.endDate)}</b></div>
        <hr />
        <div><strong>💰 Guide Fee:</strong> ₹{assignment.guidePricePerPerson}/person</div>
        <div className="gc-details-total">Total Expected: ₹{(assignment.guidePricePerPerson * count).toLocaleString('en-IN')}</div>
      </div>
      <div className="gc-details-foot"><button type="button" onClick={onClose}>Close</button></div>
    </Overlay>
  );
}
