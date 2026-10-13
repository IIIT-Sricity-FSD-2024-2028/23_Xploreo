import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/foundation';
import { useAsyncData } from '@/hooks/useAsyncData.js';
import { applyToPlan, confirmAssignment, getTraveller, listMyApplications, listMyAssignments, listPlans, rejectAssignment } from '@/services/guide.api.js';
import { GUIDE_DASHBOARD_CSS } from '@/legacy/styles.js';
import { formatCurrency } from '@/lib/datetime.js';
import { fontPx, px } from '@/lib/density.js';
import GuidePage from '@/components/guide/GuidePage.jsx';
import GuideHeader, { HeaderStat } from '@/components/guide/GuideHeader.jsx';
import StatusChip from '@/components/guide/StatusChip.jsx';
import { ErrorNotice, LoadingState } from '@/components/guide/Feedback.jsx';
import { useToast } from '@/components/guide/Toast.jsx';
import { ConfirmDialog, Overlay } from '@/components/guide/Dialog.jsx';

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

export default function GuideDashboard() {
  const { user } = useAuth();
  const region = user.region || '';
  const loader = useCallback(
    () => Promise.all([listPlans(), listMyApplications(user.id), listMyAssignments(user.id)]),
    [user.id],
  );
  const { data, error, loading, reload } = useAsyncData(loader);
  const { toast, show } = useToast();
  const [tab, setTab] = useState('plans');
  const [applying, setApplying] = useState(null); // plan being applied to
  const [rejecting, setRejecting] = useState(null); // assignment id awaiting the "are you sure"
  const [details, setDetails] = useState(null); // assignment whose details are open
  const [busy, setBusy] = useState(false);

  const [allPlans, applications, assignments] = data ?? [[], [], []];
  // The server hands out every active plan; showing the guide's own region first is a convenience.
  const plans = useMemo(() => allPlans.filter((p) => sameArea(p.destination, region)), [allPlans, region]);
  const planById = useMemo(() => new Map(allPlans.map((p) => [p.id, p])), [allPlans]);

  const accepted = applications.filter((a) => a.status === 'accepted').length;
  const pending = applications.filter((a) => a.status === 'pending').length;
  const activeJobs = assignments.filter((a) => a.status === 'confirmed').length;

  async function onConfirm(id) {
    setBusy(true);
    try {
      await confirmAssignment(id);
      show('Confirmed! Traveller has been notified.', 'success');
      reload();
    } catch (err) {
      show(err.message || 'Failed to confirm.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function onReject() {
    const id = rejecting;
    setBusy(true);
    try {
      await rejectAssignment(id);
      show('Rejected job. Traveller notified.', 'info');
      setRejecting(null);
      reload();
    } catch (err) {
      setRejecting(null);
      show(err.message || 'Failed to reject.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <GuidePage css={GUIDE_DASHBOARD_CSS} title="Dashboard" pageWrapper>
      <div className="guide-page-wrapper">
        <GuideHeader
          name={user.name}
          subtitle={
            <>
              Assigned Region:{' '}
              <span style={{ display: 'inline-block', padding: `${px(2)}px ${px(10)}px`, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 9999, fontWeight: 600, fontSize: fontPx(12) }}>
                {region || '—'}
              </span>{' '}
              · Manage your plan applications and bookings
            </>
          }
        >
          <div className="guide-header-stats" id="gd-stats">
            <HeaderStat value={plans.length} label="Plans Available" />
            <HeaderStat value={accepted} label="Accepted" tone="green" />
            <HeaderStat value={pending} label="Pending" tone="yellow" />
            <HeaderStat value={activeJobs} label="Active Jobs" tone="blue" />
          </div>
        </GuideHeader>

        <div className="gd-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={`gd-tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {!data && loading ? <LoadingState label="Loading your dashboard…" /> : null}
        <ErrorNotice error={error} onRetry={reload} />

        {data ? (
          <div id="gd-content">
            {tab === 'plans' ? <PlansTab plans={plans} applications={applications} onApply={setApplying} /> : null}
            {tab === 'applications' ? <ApplicationsTab applications={applications} planById={planById} /> : null}
            {tab === 'assignments' ? (
              <JobsTab assignments={assignments} planById={planById} busy={busy} onConfirm={onConfirm} onReject={setRejecting} onDetails={setDetails} />
            ) : null}
          </div>
        ) : null}
      </div>

      {applying ? (
        <ApplyModal
          plan={applying}
          onClose={() => setApplying(null)}
          onDone={(application) => {
            setApplying(null);
            if (application.status === 'accepted') show('Application accepted — you can now be matched to travellers.', 'success');
            else show(application.autoDecisionReason || 'Application was not accepted.', 'warning');
            reload();
          }}
        />
      ) : null}
      {rejecting ? (
        <ConfirmDialog
          title="Reject Job"
          text="Are you sure you want to reject this job? The traveller will be notified."
          confirmLabel="Reject Job"
          busy={busy}
          onConfirm={onReject}
          onClose={() => setRejecting(null)}
        />
      ) : null}
      {details ? <DetailsModal assignment={details} onClose={() => setDetails(null)} /> : null}
      {toast}
    </GuidePage>
  );
}

function PlansTab({ plans, applications, onApply }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const shown = plans.filter((p) => !q || p.title.toLowerCase().includes(q) || p.destination.toLowerCase().includes(q));
  const applicationFor = (planId) => applications.find((a) => a.planId === planId);

  return (
    <>
      <div className="gd-section-header">
        <h2>Available Travel Plans</h2>
        <input className="gd-search" id="gd-plan-search" placeholder="Search plans by destination or title…" aria-label="Search plans" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="gd-plans-grid" id="gd-plans-grid">
        {shown.length === 0 ? <div className="gd-empty">No plans available at the moment.</div> : null}
        {shown.map((plan) => {
          const mine = applicationFor(plan.id);
          return (
            <div className="gd-plan-card" key={plan.id}>
              <div className="gd-plan-top">
                <div className="gd-plan-dest">{plan.destination}</div>
                {mine ? <StatusChip status={mine.status} /> : null}
              </div>
              <h3 className="gd-plan-title">{plan.title}</h3>
              <p className="gd-plan-desc">{(plan.description || '').substring(0, 90)}…</p>
              <div className="gd-plan-meta">
                <span>🌙 {plan.durationNights} nights</span>
                <span>💰 {formatCurrency(plan.pricePerPerson)}/person</span>
                <span>⭐ {plan.hotelStars || 3} star hotel</span>
              </div>
              {mine?.autoDecisionReason ? <p className="gd-auto-reason">{mine.autoDecisionReason}</p> : null}
              <div className="gd-plan-action">
                {!mine ? (
                  <button type="button" className="gd-btn gd-btn-primary" onClick={() => onApply(plan)}>Apply to Guide</button>
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

function ApplyModal({ plan, onClose, onDone }) {
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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
    setSaving(true);
    setError('');
    try {
      const application = await applyToPlan({ planId: plan.id, guidePricePerPerson: value });
      onDone(application);
    } catch (err) {
      setError(err.fieldErrors?.guidePricePerPerson || err.message || 'Failed to submit. Try again.');
      setSaving(false);
    }
  }

  return (
    <div id="gd-apply-modal" className="gd-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <form className="gd-modal" role="dialog" aria-modal="true" aria-labelledby="gd-modal-plan-name" onSubmit={submit} noValidate>
        <h3 id="gd-modal-plan-name">Apply: {plan.title}</h3>
        <p className="gd-modal-sub">Set your price per person for this plan</p>
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

function ApplicationsTab({ applications, planById }) {
  const [filter, setFilter] = useState('all');
  const rows = filter === 'all' ? applications : applications.filter((a) => a.status === filter);
  return (
    <>
      <div className="gd-section-header">
        <h2>My Plan Applications</h2>
        <FilterRow options={APP_FILTERS} value={filter} onChange={setFilter} />
      </div>
      <div className="gd-table-wrap">
        <table className="gd-table">
          <thead>
            <tr><th>Plan</th><th>Price/Person</th><th>Status</th><th>Decision Reason</th><th>Applied</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="gd-empty-cell">No applications found.</td></tr>
            ) : (
              rows.map((app) => {
                const p = planById.get(app.planId);
                return (
                  <tr key={app.id}>
                    <td><strong>{p?.title || app.planId}</strong><br /><small>{p?.destination || ''}</small></td>
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
          const p = planById.get(job.planId);
          const awaiting = job.status === 'pending_guide_confirm';
          return (
            <div className={`gd-assignment-card${awaiting ? ' gd-asgn-pending' : ''}`} key={job.id}>
              <div className="gd-asgn-top">
                <div>
                  <h3>{p?.title || job.planId}</h3>
                  <p className="gd-asgn-dest">📍 {p?.destination || ''}</p>
                </div>
                <StatusChip status={job.status} />
              </div>
              <div className="gd-asgn-meta">
                <span>👤 Traveller: <code>{job.travellerId}</code></span>
                <span>💰 Earnings: ₹{job.guidePricePerPerson}/person</span>
                <span>📅 Travel Date: {shortDate(job.startDate || job.createdAt)}</span>
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
  const [traveller, setTraveller] = useState(undefined); // undefined = loading, null = unavailable
  const [note, setNote] = useState('');

  useEffect(() => {
    let cancelled = false;
    getTraveller(assignment.travellerId).then(
      (t) => !cancelled && setTraveller(t),
      (err) => {
        if (cancelled) return;
        setTraveller(null);
        setNote(err.status === 403 ? 'Traveller contact details are not available for this job.' : '');
      },
    );
    return () => {
      cancelled = true;
    };
  }, [assignment.travellerId]);

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
