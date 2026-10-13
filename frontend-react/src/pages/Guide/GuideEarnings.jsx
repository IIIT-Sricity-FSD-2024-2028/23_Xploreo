import { useCallback, useState } from 'react';
import { useAuth } from '@/foundation';
import { useAsyncData } from '@/hooks/useAsyncData.js';
import { listMyAssignments, listPlans } from '@/services/guide.api.js';
import { GUIDE_EARNINGS_CSS } from '@/legacy/styles.js';
import GuidePage from '@/components/guide/GuidePage.jsx';
import GuideHeader, { HeaderStat } from '@/components/guide/GuideHeader.jsx';
import { ErrorNotice, LoadingState } from '@/components/guide/Feedback.jsx';

const FILTERS = [
  ['all', 'All'],
  ['confirmed', 'Confirmed'],
  ['pending_guide_confirm', 'Pending'],
  ['rejected_by_guide', 'Rejected'],
  ['cancelled', 'Cancelled'],
];
const CHIPS = {
  pending_guide_confirm: ['⏳ Pending', '#d97706', '#fffbeb'],
  confirmed: ['✅ Confirmed', '#16a34a', '#f0fdf4'],
  rejected_by_guide: ['❌ Rejected', '#dc2626', '#fef2f2'],
  cancelled: ['🚫 Cancelled', '#6b7280', '#f9fafb'],
};

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
// The amount of a job is whatever the server recorded for it; the page only adds jobs up for display.
const amountOf = (job) => (typeof job.paidAmount === 'number' ? job.paidAmount : null);
const sum = (jobs) => jobs.reduce((total, job) => total + (amountOf(job) ?? 0), 0);

export default function GuideEarnings() {
  const { user } = useAuth();
  const loader = useCallback(() => Promise.all([listMyAssignments(user.id), listPlans()]), [user.id]);
  const { data, error, loading, reload } = useAsyncData(loader);
  const [filter, setFilter] = useState('all');
  const [jobs, plans] = data ?? [[], []];

  const confirmed = jobs.filter((j) => j.status === 'confirmed');
  const pending = jobs.filter((j) => j.status === 'pending_guide_confirm');
  const rows = filter === 'all' ? jobs : jobs.filter((j) => j.status === filter);
  const planOf = (id) => plans.find((p) => String(p.id) === String(id));

  return (
    <GuidePage css={GUIDE_EARNINGS_CSS} title="Earnings">
      <div className="guide-page-wrapper">
        <GuideHeader name={user.name} subtitle="Your trip-by-trip income overview">
          <div className="guide-header-stats" id="earn-header-stats">
            <HeaderStat value={jobs.length} label="Total Jobs" />
            <HeaderStat value={confirmed.length} label="Confirmed" tone="green" />
            <HeaderStat value={pending.length} label="Pending" tone="yellow" />
          </div>
        </GuideHeader>

        {!data && loading ? <LoadingState label="Loading your earnings…" /> : null}
        <ErrorNotice error={error} onRetry={reload} />

        {data ? (
          <>
            <div className="earn-stats-row" id="earn-stats">
              <StatCard icon="💰" value={inr(sum(confirmed))} label="Total Earned" />
              <StatCard icon="⏳" value={inr(sum(pending))} label="Pending Payout" tone="earn-yellow" />
              <StatCard icon="✅" value={confirmed.length} label="Confirmed Trips" tone="earn-green" />
              <StatCard icon="📋" value={jobs.length} label="Total Jobs" tone="earn-blue" />
            </div>

            <div className="earn-section-head">
              <h2>Trip Earnings Breakdown</h2>
              <div className="earn-filter-row" id="earn-filters">
                {FILTERS.map(([key, label]) => (
                  <button key={key} type="button" className={`earn-filter-btn${filter === key ? ' active' : ''}`} onClick={() => setFilter(key)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div id="earn-list" className="earn-list">
              {rows.length === 0 ? <div className="earn-empty">No trips found for this filter.</div> : null}
              {rows.map((job) => {
                const plan = planOf(job.planId);
                const count = job.travelerCount || job.numberOfTravelers || 1;
                const earned = job.status === 'confirmed';
                const total = amountOf(job);
                const [label, color, background] = CHIPS[job.status] || [job.status, '#6b7280', '#f9fafb'];
                return (
                  <div className={`earn-trip-card${earned ? ' earn-trip-confirmed' : ''}`} key={job.id}>
                    <div className="earn-trip-left">
                      <div className="earn-trip-dest">{plan?.destination || 'Trip'}</div>
                      <div className="earn-trip-name">{plan?.title || job.planId}</div>
                      <div className="earn-trip-meta">
                        <span>👤 {count} traveler{count !== 1 ? 's' : ''}</span>
                        <span>📅 {new Date(job.startDate || job.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                    <div className="earn-trip-right">
                      <div className="earn-trip-fee">
                        <span className="earn-fee-label">Fee/person</span>
                        <span className="earn-fee-per">{inr(job.guidePricePerPerson)}</span>
                      </div>
                      <div className={`earn-trip-total${earned ? ' earn-total-green' : ''}`}>{total == null ? '—' : inr(total)}</div>
                      <span className="earn-chip" style={{ color, background, borderColor: `${color}40` }}>{label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    </GuidePage>
  );
}

function StatCard({ icon, value, label, tone = '' }) {
  return (
    <div className="earn-stat-card">
      <span className="earn-stat-icon">{icon}</span>
      <div>
        <div className={`earn-stat-num ${tone}`.trim()}>{value}</div>
        <div className="earn-stat-label">{label}</div>
      </div>
    </div>
  );
}
