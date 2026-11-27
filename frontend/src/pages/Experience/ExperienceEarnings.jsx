import { useState } from 'react';
import { useExperienceEarnings } from '@/store/experience/useExperienceEarnings.js';
import { formatCurrency, formatDate } from '@/lib/datetime.js';
import ExperiencePage from '@/components/experience/ExperiencePage.jsx';
import { ErrorNotice, LoadingBlock } from '@/components/experience/Feedback.jsx';
import RefundBreakdown from '@/components/finance/RefundBreakdown.jsx';
import './experienceShared.css';

// Earnings are READ-ONLY here. Every amount below comes from the server; the app never calculates money.
const PERIODS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];
const STATUS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'completed', label: 'Completed' },
  { value: 'pending', label: 'Pending' },
  { value: 'refunded', label: 'Refunded' },
];
const PILL = {
  completed: { background: '#dcfce7', color: '#166534', label: 'Completed' },
  pending: { background: '#dbeafe', color: '#1e40af', label: 'Pending' },
  refunded: { background: '#fee2e2', color: '#991b1b', label: 'Refunded' },
};

export default function ExperienceEarnings() {
  const [period, setPeriod] = useState('90');
  const [status, setStatus] = useState('all');
  const { data, error, loading, reload } = useExperienceEarnings(period);

  const unavailable = error?.status === 404;
  const summary = data?.summary;
  const rows = (data?.transactions ?? []).filter((t) => status === 'all' || t.status === status);

  return (
    <ExperiencePage pageClass="earnings-page experience-earnings-page" title="Earnings">
      <div className="gd-page-wrapper">
        <main className="gd-page">
          <header className="gd-header">
            <div className="gd-header-text">
              <span className="gd-eyebrow">Experience Portal</span>
              <h1 className="gd-title">Earnings</h1>
              <p className="gd-subtitle">Track your revenue and financial performance.</p>
            </div>
            <label className="ep-select-shell" htmlFor="dateFilter">
              Date Range
              <select id="dateFilter" className="gd-select" value={period} onChange={(event) => setPeriod(event.target.value)}>
                {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </label>
          </header>

          {!data && loading ? <LoadingBlock label="Loading earnings…" /> : null}
          {error ? (
            <ErrorNotice
              error={unavailable ? { status: 403, message: 'Earnings are not available from the server yet.' } : error}
              onRetry={reload}
            />
          ) : null}

          {summary ? (
            <>
              <section className="gd-kpi-row" aria-label="Earnings Overview">
                <div className="ep-earnings-card">
                  <div className="ep-earnings-top"><div className="gd-kpi-icon-wrap kpi-blue">₹</div></div>
                  <h2>{formatCurrency(summary.gross)}</h2>
                  <p>Total Revenue</p>
                </div>
                <div className="ep-earnings-card">
                  <div className="ep-earnings-top"><div className="gd-kpi-icon-wrap kpi-green">↗</div></div>
                  <h2>{formatCurrency(summary.net)}</h2>
                  <p>Earnings This Period</p>
                </div>
                <div className="ep-earnings-card">
                  <div className="ep-earnings-top"><div className="gd-kpi-icon-wrap kpi-orange">⟳</div></div>
                  <h2>{formatCurrency(summary.refunded)}</h2>
                  <p>Refunded Payments</p>
                </div>
                <div className="ep-earnings-card">
                  <div className="ep-earnings-top"><div className="gd-kpi-icon-wrap kpi-purple">💵</div></div>
                  <h2>{formatCurrency(summary.avgBookingNet)}</h2>
                  <p>Average Booking Value</p>
                </div>
              </section>

              <section>
                <div className="gd-section-header" style={{ marginBottom: '1rem' }}>
                  <h2>Performance Insights</h2>
                </div>
                <div className="ep-insight-grid">
                  <div className="ep-insight-card">
                    <div className="gd-kpi-icon-wrap kpi-green">⌘</div>
                    <h3>{summary.topExperience ?? '--'}</h3>
                    <p>Top Performing Experience</p>
                  </div>
                  <div className="ep-insight-card">
                    <div className="gd-kpi-icon-wrap kpi-blue">🗓</div>
                    <h3>{summary.bestDay ?? '--'}</h3>
                    <p>Highest Booking Day</p>
                  </div>
                  <div className="ep-insight-card">
                    <div className="gd-kpi-icon-wrap kpi-indigo">👥</div>
                    <h3>{summary.utilizationPercent}%</h3>
                    <p>Capacity Utilization</p>
                  </div>
                  <div className="ep-insight-card">
                    <div className="gd-kpi-icon-wrap kpi-orange">↘</div>
                    <h3>{summary.cancelRate}%</h3>
                    <p>Cancellation Rate</p>
                  </div>
                </div>
              </section>

              <div className="rb-grid">
              <section className="ep-panel">
                <h3>Revenue Sources</h3>
                {data.byExperience.map((row, index) => {
                  const color = index === 0 ? 'blue' : 'green';
                  return (
                    <article key={row.experienceId} className="ep-source-item">
                      <div className="ep-source-top">
                        <div className="ep-source-label">
                          <span className={`ep-dot ${color}`} />
                          <span>{row.title}</span>
                        </div>
                        <div className="ep-source-metrics">
                          <span className="amount">{formatCurrency(row.net)}</span>
                          <span className="percent">{row.sharePercent}%</span>
                        </div>
                      </div>
                      <div className="ep-progress-track">
                        <div className={`ep-progress-fill ${color}`} style={{ width: `${row.sharePercent}%` }} />
                      </div>
                    </article>
                  );
                })}
                <div className="ep-divider" />
                <div className="ep-total-row">
                  <span>Total Revenue</span>
                  <span>{formatCurrency(summary.net)}</span>
                </div>
              </section>

              <RefundBreakdown
                refundedAmount={summary.refunded}
                refundPercent={summary.refundPercent ?? 0}
                refundedCount={(data.transactions ?? []).filter((t) => t.status === 'refunded').length}
                totalCount={(data.transactions ?? []).length}
              />
              </div>

              <section className="gd-card">
                <div className="gd-section-header" style={{ marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Recent Transactions</h3>
                  <label className="ep-select-shell" htmlFor="transactionStatusFilter">
                    Status
                    <select id="transactionStatusFilter" className="gd-select" value={status} onChange={(event) => setStatus(event.target.value)}>
                      {STATUS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                </div>
                <div className="ep-table-wrap">
                  <table className="ep-table">
                    <thead>
                      <tr><th>Guest Name</th><th>Experience Type</th><th>Amount</th><th>Date</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {rows.length ? (
                        rows.map((t) => {
                          const pill = PILL[t.status];
                          return (
                            <tr key={t.bookingId}>
                              <td>{t.guestName}</td>
                              <td>{t.title}</td>
                              <td>{formatCurrency(t.net)}</td>
                              <td>{formatDate(t.date, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                              <td><span className="gd-chip" style={{ background: pill.background, color: pill.color, borderColor: 'transparent' }}>{pill.label}</span></td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr><td colSpan={5} style={{ textAlign: 'center', color: '#64748b' }}>No transactions for this period.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : null}
        </main>
      </div>
    </ExperiencePage>
  );
}
