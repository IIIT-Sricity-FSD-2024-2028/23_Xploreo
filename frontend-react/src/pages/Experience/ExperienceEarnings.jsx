import { useCallback, useState } from 'react';
import { StatCard, StatusBadge } from '@/foundation';
import { useAsyncData } from '@/hooks/useAsyncData.js';
import { getExperienceEarnings } from '@/services/schedule.api.js';
import { formatCurrency, formatDate } from '@/lib/datetime.js';
import { EmptyState, ErrorNotice, LoadingBlock } from '@/components/experience/Feedback.jsx';

// Earnings are READ-ONLY here. Every number below comes from the server; the app never calculates money.
const PERIODS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last 12 months' },
  { value: 'all', label: 'All time' },
];
const STATUS = [
  { value: 'all', label: 'All transactions' },
  { value: 'completed', label: 'Paid out' },
  { value: 'pending', label: 'Pending' },
  { value: 'refunded', label: 'Refunded' },
];
const TONE = { completed: 'success', pending: 'warning', refunded: 'danger' };
const LABEL = { completed: 'Paid out', pending: 'Pending', refunded: 'Refunded' };
const PAGE = 15;

export default function ExperienceEarnings() {
  const [period, setPeriod] = useState('30');
  const [status, setStatus] = useState('all');
  const [limit, setLimit] = useState(PAGE);
  const loader = useCallback(() => getExperienceEarnings({ days: period }), [period]);
  const { data, error, loading, reload } = useAsyncData(loader);

  if (!data && loading) return <LoadingBlock label="Loading earnings…" />;
  if (!data && error) {
    const unavailable = error.status === 404;
    return (
      <ErrorNotice
        error={unavailable ? { status: 403, message: 'Earnings are not available from the server yet.' } : error}
        onRetry={reload}
      />
    );
  }

  const { summary, byExperience, transactions } = data;
  const shown = transactions.filter((t) => status === 'all' || t.status === status);
  const feePercent = Math.round(data.platformFeeRate * 100);

  return (
    <div className="exp-page">
      <header className="exp-page-header">
        <div>
          <p className="exp-eyebrow">Finance</p>
          <h1>Earnings</h1>
          <p className="exp-muted">Calculated by Xploreo from verified bookings, after a {feePercent}% platform fee.</p>
        </div>
        <label className="exp-inline-select">
          <span>Period</span>
          <select value={period} onChange={(e) => { setPeriod(e.target.value); setLimit(PAGE); }}>
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </label>
      </header>

      <ErrorNotice error={error} onRetry={reload} />
      {loading ? <p className="exp-muted" role="status">Updating…</p> : null}

      {summary.bookingsCount === 0 ? (
        <EmptyState title="No earnings yet">Earnings appear here once guests book and complete your sessions.</EmptyState>
      ) : (
        <>
          <section className="exp-stats" aria-label="Earnings summary">
            <StatCard label="Net earnings" value={formatCurrency(summary.net)} hint={`${summary.bookingsCount} bookings in period`} tone="blue" />
            <StatCard label="Paid out" value={formatCurrency(summary.paidOut)} hint="Completed sessions" tone="green" />
            <StatCard label="Pending" value={formatCurrency(summary.pending)} hint="Awaiting completion" tone="orange" />
            <StatCard label="Refunded" value={formatCurrency(summary.refunded)} hint={`${summary.cancelledCount} cancelled`} tone="red" />
          </section>

          <div className="exp-grid-2">
            <section className="exp-card" aria-labelledby="exp-insights">
              <h2 id="exp-insights">Insights</h2>
              <dl className="exp-details">
                <dt>Average per booking</dt><dd>{formatCurrency(summary.avgBookingNet)}</dd>
                <dt>Top experience</dt><dd>{summary.topExperience ?? '—'}</dd>
                <dt>Busiest day</dt><dd>{summary.bestDay ?? '—'}</dd>
                <dt>Cancellation rate</dt><dd>{summary.cancelRate}%</dd>
              </dl>
              <p className={`exp-alert ${summary.cancelRate > 5 ? 'exp-alert-medium' : 'exp-alert-low'}`}>
                {summary.cancelRate > 5
                  ? 'Your cancellation rate is above the 5% benchmark. Review cancellation terms and how the experience is described.'
                  : 'Your cancellation rate is at or below the 5% benchmark.'}
              </p>
            </section>

            <section className="exp-card" aria-labelledby="exp-by-experience">
              <h2 id="exp-by-experience">By experience</h2>
              <ul className="exp-list">
                {byExperience.map((row) => (
                  <li key={row.experienceId} className="exp-source">
                    <div className="exp-source-top">
                      <span>{row.title}</span>
                      <span><strong>{formatCurrency(row.net)}</strong> · {row.sharePercent}%</span>
                    </div>
                    <div className="exp-bar" aria-hidden="true">
                      <span className="exp-bar-fill exp-bar-info" style={{ width: `${row.sharePercent}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="exp-card" aria-labelledby="exp-transactions">
            <div className="exp-card-head">
              <h2 id="exp-transactions">Transactions</h2>
              <label className="exp-inline-select">
                <span>Status</span>
                <select value={status} onChange={(e) => { setStatus(e.target.value); setLimit(PAGE); }}>
                  {STATUS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </label>
            </div>
            {shown.length === 0 ? (
              <EmptyState title="No transactions match">Try a different status.</EmptyState>
            ) : (
              <>
                <div className="exp-table-wrap">
                  <table className="exp-table">
                    <thead>
                      <tr><th>Guest</th><th>Experience</th><th>Session date</th><th className="exp-num">Net</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {shown.slice(0, limit).map((t) => (
                        <tr key={t.bookingId}>
                          <td>{t.guestName}</td>
                          <td>{t.title}</td>
                          <td>{formatDate(t.date, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                          <td className="exp-num">{formatCurrency(t.net)}</td>
                          <td><StatusBadge tone={TONE[t.status]}>{LABEL[t.status]}</StatusBadge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {shown.length > limit ? (
                  <div className="exp-center">
                    <button type="button" className="exp-btn exp-btn-ghost" onClick={() => setLimit((n) => n + PAGE)}>
                      Show more ({shown.length - limit} left)
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
