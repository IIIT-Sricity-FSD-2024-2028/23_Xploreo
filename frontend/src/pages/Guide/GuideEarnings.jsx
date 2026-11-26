import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '@/foundation';
import {
  fetchGuideDashboardData,
  fetchGuideTrips,
  selectGuideAssignments,
  selectGuidePlans,
  selectGuideTrips,
  selectGuideLoading,
  selectGuideError,
  selectEarningsSummary,
} from '@/store/guide/index.js';
import StatusChip from '@/components/guide/StatusChip.jsx';
import RefundBreakdown from '@/components/finance/RefundBreakdown.jsx';
import './guideEarnings.css';

const FILTERS = [
  ['all', 'All'],
  ['confirmed', 'Confirmed'],
  ['pending_guide_confirm', 'Pending'],
  ['rejected_by_guide', 'Rejected'],
];

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const amountOf = (job) => (job.kind === 'experience' ? Number(job.guideFee) || 0 : Number(job.totalAmount) || 0);
const dateOf = (job) => job.date || job.itinerary?.day1?.hotel?.checkInDate || job.itinerary?.day1?.flight?.departureAt || job.lastUpdatedAt;

export default function GuideEarnings() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const [filter, setFilter] = useState('all');

  // Redux Selectors: All data and calculated earnings are read from Redux Store
  const jobs = useSelector(selectGuideAssignments);
  const plans = useSelector(selectGuidePlans);
  const trips = useSelector(selectGuideTrips);
  const loading = useSelector(selectGuideLoading);
  const error = useSelector(selectGuideError);
  const {
    totalEarned,
    pendingPayout,
    confirmedCount,
    totalJobsCount,
    refundedAmount,
    refundPercent,
    refundedCount,
    totalTripsCount,
  } = useSelector(selectEarningsSummary);

  // Synchronize data via Redux Thunks
  useEffect(() => {
    if (user?.id) {
      if (!jobs.length || !plans.length) {
        dispatch(fetchGuideDashboardData(user.id));
      }
      if (!trips.length) {
        dispatch(fetchGuideTrips(user.id));
      }
    }
  }, [dispatch, user?.id, jobs.length, plans.length, trips.length]);

  const reload = () => {
    if (user?.id) {
      dispatch(fetchGuideDashboardData(user.id));
      dispatch(fetchGuideTrips(user.id));
    }
  };

  const rows = useMemo(() => {
    return filter === 'all' ? jobs : jobs.filter((j) => j.status === filter);
  }, [jobs, filter]);

  const planOf = (id) => plans.find((p) => String(p.id) === String(id));
  const data = !loading || jobs.length > 0 || trips.length > 0;

  return (
    <div className="gd-page-wrapper">
      <main className="gd-page">
        <header className="gd-header">
          <div className="gd-header-text">
            <span className="gd-eyebrow">Guide Portal</span>
            <h1 className="gd-title">Earnings</h1>
            <p className="gd-subtitle">Your trip-by-trip income overview.</p>
          </div>
        </header>

        <section className="gd-kpi-row" aria-label="Earnings Overview">
          <div className="gd-kpi-card">
            <div className="gd-kpi-icon-wrap kpi-teal">₹</div>
            <div className="gd-kpi-data"><span className="gd-kpi-val">{inr(totalEarned)}</span><span className="gd-kpi-lbl">Total Earned</span></div>
          </div>
          <div className="gd-kpi-card">
            <div className="gd-kpi-icon-wrap kpi-yellow">⏳</div>
            <div className="gd-kpi-data"><span className="gd-kpi-val">{inr(pendingPayout)}</span><span className="gd-kpi-lbl">Pending Payout</span></div>
          </div>
          <div className="gd-kpi-card">
            <div className="gd-kpi-icon-wrap kpi-green">✓</div>
            <div className="gd-kpi-data"><span className="gd-kpi-val">{confirmedCount}</span><span className="gd-kpi-lbl">Confirmed Trips</span></div>
          </div>
          <div className="gd-kpi-card">
            <div className="gd-kpi-icon-wrap kpi-blue">📋</div>
            <div className="gd-kpi-data"><span className="gd-kpi-val">{totalJobsCount}</span><span className="gd-kpi-lbl">Total Jobs</span></div>
          </div>
        </section>

        {data ? (
          <RefundBreakdown
            refundedAmount={refundedAmount}
            refundPercent={refundPercent}
            refundedCount={refundedCount}
            totalCount={totalTripsCount}
          />
        ) : null}

        <section className="gd-section-header">
          <h2>Trip Earnings Breakdown</h2>
          <div className="gd-filter-row">
            {FILTERS.map(([key, label]) => (
              <button key={key} type="button" className={`gd-filter-btn${filter === key ? ' active' : ''}`} onClick={() => setFilter(key)}>
                {label}
              </button>
            ))}
          </div>
        </section>

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
            <h3 className="gd-state-title">{error?.status === 403 ? 'Not permitted' : 'Something went wrong'}</h3>
            <p className="gd-state-text">{typeof error === 'string' ? error : error?.message || 'Failed to load earnings'}</p>
            {error?.status !== 403 ? <button type="button" className="gd-btn-retry" onClick={reload}>Try Again</button> : null}
          </div>
        ) : null}

        {data ? (
          <div className="gd-trip-list">
            {rows.length === 0 ? <div className="gd-empty">No trips found for this filter.</div> : null}
            {rows.map((job) => {
              const plan = planOf(job.planId);
              const earned = job.status === 'confirmed' || job.status === 'started' || job.status === 'completed';
              return (
                <article className={`gd-trip-card${earned ? ' is-earned' : ''}`} key={job.id}>
                  <div className="gd-trip-left">
                    <span className="gd-trip-dest">{job.kind === 'experience' ? job.destination : plan?.destination || 'Trip'}</span>
                    <h3 className="gd-trip-name">{job.kind === 'experience' ? `🎟 ${job.title}` : plan?.title || job.planId}</h3>
                    <div className="gd-trip-meta">
                      <span>📅 {dateOf(job) ? new Date(dateOf(job)).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
                    </div>
                  </div>
                  <div className="gd-trip-right">
                    <div className="gd-trip-total-block">
                      <span className="gd-trip-total-label">{job.kind === 'experience' ? 'Guide Fee' : 'Trip Amount'}</span>
                      <span className={`gd-trip-total${earned ? ' is-earned' : ''}`}>
                        {inr(amountOf(job))}
                      </span>
                    </div>
                    <StatusChip status={job.status} />
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </main>
    </div>
  );
}
