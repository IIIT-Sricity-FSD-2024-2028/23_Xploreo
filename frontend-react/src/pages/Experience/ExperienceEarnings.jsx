import { useCallback, useState } from 'react';
import { useAsyncData } from '@/hooks/useAsyncData.js';
import { getExperienceEarnings } from '@/services/schedule.api.js';
import { formatCurrency, formatDate } from '@/lib/datetime.js';
import ExperiencePage from '@/components/experience/ExperiencePage.jsx';
import { ErrorNotice, LoadingBlock } from '@/components/experience/Feedback.jsx';

// Earnings are READ-ONLY here. Every amount below comes from the server; the app never calculates money.
// (The only arithmetic is display: a bar width, and "vs the 5% industry benchmark".)
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
const PILL = { completed: ['checked', 'Completed'], pending: ['confirmed', 'Pending'], refunded: ['cancelled', 'Refunded'] };
const BENCHMARK = 5;

export default function ExperienceEarnings() {
  const [period, setPeriod] = useState('90');
  const [status, setStatus] = useState('all');
  const loader = useCallback(() => getExperienceEarnings({ days: period }), [period]);
  const { data, error, loading, reload } = useAsyncData(loader);

  const unavailable = error?.status === 404;
  const summary = data?.summary;
  const rows = (data?.transactions ?? []).filter((t) => status === 'all' || t.status === status);
  const refundPercent = summary?.refundPercent ?? 0;
  const aboveBenchmark = refundPercent > BENCHMARK;
  const trendDelta = Math.abs(refundPercent - BENCHMARK).toFixed(1);

  return (
    <ExperiencePage pageClass="earnings-page experience-earnings-page" title="Earnings">
      <section className="top-bar experience-toolbar">
        <div>
          <p className="experience-eyebrow">Revenue Overview</p>
          <h1>Earnings</h1>
          <p>Track your revenue and financial performance</p>
        </div>

        <label className="experience-select-shell" htmlFor="dateFilter">
          <span>Date Range</span>
          <select id="dateFilter" value={period} onChange={(event) => setPeriod(event.target.value)}>
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </label>
      </section>

      {!data && loading ? <LoadingBlock label="Loading earnings…" /> : null}
      {error ? (
        <ErrorNotice
          error={unavailable ? { status: 403, message: 'Earnings are not available from the server yet.' } : error}
          onRetry={reload}
        />
      ) : null}

      {summary ? (
        <>
          <section className="experience-summary-grid earnings-summary-grid">
            <article className="experience-card earnings-stat-card">
              <div className="card-top">
                <div className="icon blue">₹</div>
                <span className="badge">--</span>
              </div>
              <h2 id="totalRevenue">{formatCurrency(summary.gross)}</h2>
              <p>Total Revenue</p>
            </article>

            <article className="experience-card earnings-stat-card">
              <div className="card-top">
                <div className="icon green">↗</div>
                <span className="badge">--</span>
              </div>
              <h2 id="earnings">{formatCurrency(summary.net)}</h2>
              <p>Earnings This Period</p>
            </article>

            <article className="experience-card earnings-stat-card">
              <div className="card-top">
                <div className="icon orange">⟳</div>
                <span className="badge">--</span>
              </div>
              <h2 id="refundAmount">{formatCurrency(summary.refunded)}</h2>
              <p>Refunded Payments</p>
            </article>

            <article className="experience-card earnings-stat-card">
              <div className="card-top">
                <div className="icon purple">💵</div>
                <span className="badge">--</span>
              </div>
              <h2 id="avgBooking">{formatCurrency(summary.avgBookingNet)}</h2>
              <p>Average Booking Value</p>
            </article>
          </section>

          <section className="experience-section">
            <div className="experience-section-header">
              <div>
                <p className="section-kicker">Performance</p>
                <h2>Performance Insights</h2>
              </div>
            </div>
            <div className="insights-grid earnings-insights-grid">
              <article className="experience-card earnings-insight-card">
                <div className="icon green">⌘</div>
                <h3 id="topExperience">{summary.topExperience ?? '--'}</h3>
                <p>Top Performing Experience</p>
              </article>

              <article className="experience-card earnings-insight-card">
                <div className="icon blue">🗓</div>
                <h3 id="bestDay">{summary.bestDay ?? '--'}</h3>
                <p>Highest Booking Day</p>
              </article>

              <article className="experience-card earnings-insight-card">
                <div className="icon indigo">👥</div>
                <h3 id="utilization">{summary.utilizationPercent}%</h3>
                <p>Capacity Utilization</p>
              </article>

              <article className="experience-card earnings-insight-card">
                <div className="icon orange">↘</div>
                <h3 id="cancelRate">{summary.cancelRate}%</h3>
                <p>Cancellation Rate</p>
              </article>
            </div>
          </section>

          <section className="earnings-bottom">
            <div className="box revenue earnings-panel">
              <h3>Revenue Sources</h3>

              <div id="revenueSources">
                {data.byExperience.map((row, index) => {
                  const color = index === 0 ? 'blue' : 'green';
                  return (
                    <article key={row.experienceId} className="source-item">
                      <div className="source-top">
                        <div className="source-label">
                          <div className={`dot ${color}`} />
                          <span>{row.title}</span>
                        </div>
                        <div className="source-metrics">
                          <span className="amount">{formatCurrency(row.net)}</span>
                          <span className="percent">{row.sharePercent}%</span>
                        </div>
                      </div>
                      <div className="progress-bar">
                        <div className={`progress-fill ${color}`} style={{ width: `${row.sharePercent}%` }} />
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="divider" />

              <div className="total-row">
                <span>Total Revenue</span>
                <span id="totalRevenueText">{formatCurrency(summary.net)}</span>
              </div>
            </div>

            <div className="box refund earnings-panel">
              <h3>Refund Breakdown</h3>

              <p className="label">Total Refunded</p>
              <h2 id="refundAmountBig">{formatCurrency(summary.refunded)}</h2>

              <p className="label">Percentage of Revenue</p>
              <div className="refund-percentage">
                <span id="refundPercent">{refundPercent}%</span>
                <span className={`trend${aboveBenchmark ? ' negative' : ''}`} id="refundTrendText">
                  {aboveBenchmark ? '+' : '-'}{trendDelta}% vs industry benchmark
                </span>
              </div>

              <div className="refund-rate-row">
                <span>Refund Rate</span>
                <span id="refundRateText">{refundPercent}%</span>
              </div>

              <div className="progress-bar">
                <div className="progress-fill red" id="refundBar" style={{ width: `${Math.min(100, refundPercent)}%` }} />
              </div>

              <div className={`refund-note${aboveBenchmark ? ' warning' : ' good'}`}>
                <strong id="refundNoteTitle">{aboveBenchmark ? 'Refund Rate Above Target' : 'Low Refund Rate'}</strong>
                <p id="refundNoteBody">
                  {aboveBenchmark
                    ? 'Your refund rate is above the typical benchmark. Review cancellation and expectation-setting.'
                    : 'Your refund rate is below industry average (5%).'}
                </p>
              </div>
            </div>
          </section>

          <section className="box experience-table-card earnings-transactions-card">
            <div className="experience-section-header">
              <div>
                <p className="section-kicker">Payout trail</p>
                <h3>Recent Transactions</h3>
              </div>
              <label className="experience-select-shell earnings-status-filter" htmlFor="transactionStatusFilter">
                <span>Status</span>
                <select id="transactionStatusFilter" value={status} onChange={(event) => setStatus(event.target.value)}>
                  {STATUS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Guest Name</th>
                  <th>Experience Type</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody id="earningsTable">
                {rows.length ? (
                  rows.map((t) => {
                    const [pillClass, pillLabel] = PILL[t.status];
                    return (
                      <tr key={t.bookingId}>
                        <td>{t.guestName}</td>
                        <td>{t.title}</td>
                        <td>{formatCurrency(t.net)}</td>
                        <td>{formatDate(t.date, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                        <td><span className={`status-pill ${pillClass}`}>{pillLabel}</span></td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5}>No transactions for this period.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        </>
      ) : null}
    </ExperiencePage>
  );
}
