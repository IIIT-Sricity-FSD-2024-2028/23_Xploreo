// Port of front_end/pages/hotels/hotelEarning.html: KPI cards, performance insights, revenue by
// room type, refund breakdown, recent transactions and payout. All figures come from the
// server's /bookings/earnings statement.
import { useCallback, useState } from 'react';
import { getPartnerEarnings } from '@/services/hotels.api.js';
import { usePartnerHotels } from '@/store/hotel/hooks.js';
import { ui } from '@/lib/assets.js';
import HotelPage, { LoadState, PageHeader } from '@/components/hotel/HotelPage.jsx';
import { fmtDate, inr, useHotelData } from '@/components/hotel/hotelKit.jsx';

const change = (current, previous) => {
  if (!previous) return { text: current ? 'New this month' : '—', cls: '' };
  const pct = Math.round(((current - previous) / previous) * 1000) / 10;
  return { text: `${pct >= 0 ? '+' : ''}${pct}% vs last month`, cls: pct >= 0 ? 'positive' : 'negative' };
};

export default function HotelEarnings() {
  const [hotelId, setHotelId] = useState('');
  const hotels = usePartnerHotels();
  const load = useCallback(() => getPartnerEarnings(hotelId || undefined), [hotelId]);
  const { data: e, loading, error, reload } = useHotelData(load);

  const stats = e && [
    { label: 'Total Revenue', value: inr(e.totalRevenue), icon: 'montlyearning.svg', color: 'blue', sub: `${e.completedStays} completed stays`, subClass: '' },
    { label: 'Earnings This Month', value: inr(e.monthRevenue), icon: 'upcomingtours.svg', color: 'dark-green', ...(() => { const c = change(e.monthRevenue, e.previousMonthRevenue); return { sub: c.text, subClass: c.cls }; })() },
    { label: 'Refunded Payments', value: inr(e.refunded), icon: 'recentreview.svg', color: 'violet', sub: `${e.cancelledBookings} cancellations`, subClass: e.refunded ? 'negative' : '' },
    { label: 'Avg Booking Value', value: inr(e.avgBookingValue), icon: 'avgrating.svg', color: 'orange', sub: '', subClass: '' },
  ];
  const insights = e && [
    { title: e.topRoomType || '—', subtitle: 'Top Performing Room', icon: '🏆' },
    { title: e.busiestDay || '—', subtitle: 'Highest Booking Day', icon: '📅' },
    { title: `${e.occupancyRate}%`, subtitle: 'Occupancy Rate', icon: '🏠' },
    { title: `${e.refundRate}%`, subtitle: 'Refund Rate', icon: '📉' },
  ];

  return (
    <HotelPage title="Earnings">
      <PageHeader title="Earnings" subtitle="Track your revenue and financial performance">
        {hotels.data && hotels.data.length > 1 ? (
          <div className="hotel-filters">
            <select aria-label="Filter by property" value={hotelId} onChange={(ev) => setHotelId(ev.target.value)}>
              <option value="">All Properties ({hotels.data.length})</option>
              {hotels.data.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
        ) : null}
      </PageHeader>

      <LoadState loading={loading} error={error} onRetry={reload}>
        {e ? (
          <>
            <div id="earning-stats" className="hotel-stats-grid">
              {stats.map((s) => (
                <div key={s.label} className={`stat-card ${s.color}`}>
                  <div className="icon-container"><img src={ui(s.icon)} alt="icon" width="20" /></div>
                  <p className="stat-label">{s.label}</p>
                  <h2 className="stat-value">{s.value}</h2>
                  <p className={`stat-subtext ${s.subClass}`}>{s.sub}</p>
                </div>
              ))}
            </div>

            <div id="earning-performance">
              <h3>Performance Insights</h3>
              <div className="hotel-stats-grid">
                {insights.map((d) => (
                  <div key={d.subtitle} className="hotel-content-card perf-card">
                    <div className="perf-icon">{d.icon}</div>
                    <h4>{d.title}</h4>
                    <p>{d.subtitle}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="hotel-split-grid">
              <div id="earning-revenue" className="hotel-content-card">
                <h3>Revenue Sources</h3>
                {e.revenueByRoomType.length === 0 ? <p className="hotel-sub-text">No completed stays yet.</p> : null}
                {e.revenueByRoomType.map((r, i) => (
                  <div key={r.name} className="revenue-row">
                    <div className="revenue-top"><span>{r.name}</span><span>{inr(r.value)}</span></div>
                    <div className="progress-bar"><div className={`progress-fill ${i % 2 ? 'green' : 'blue'}`} style={{ width: `${r.percent}%` }} /></div>
                    <span className="percent">{r.percent}%</span>
                  </div>
                ))}
                <div className="revenue-total"><strong>Total Revenue</strong><span>{inr(e.totalRevenue)}</span></div>
              </div>

              <div id="earning-refund" className="hotel-content-card">
                <h3>Refund Breakdown</h3>
                <p className="sub-text">Total Refunded</p>
                <h2 className="text-danger">{inr(e.refunded)}</h2>
                <p className="sub-text">Share of booked value</p>
                <h3>{e.refundRate}%</h3>
                <div className="progress-bar"><div className="progress-fill red" style={{ width: `${Math.min(100, e.refundRate)}%` }} /></div>
                <div className="refund-note">
                  {e.refundRate <= 5 ? 'Low Refund Rate' : 'Refund rate needs attention'}<br />
                  <span>{e.refundRate <= 5 ? 'Your refund rate is below industry average' : 'Cancellations are reducing your revenue'}</span>
                </div>
              </div>
            </div>

            <div id="earning-transactions" className="hotel-content-card">
              <h3>Recent Transactions</h3>
              {e.transactions.length === 0 ? <p className="hotel-sub-text">No transactions yet.</p> : null}
              {e.transactions.map((t) => (
                <div key={t.id} className="hotel-booking-row">
                  <div>
                    <strong>{t.guestName}</strong><br />
                    <span className="hotel-sub-text">{t.roomType} · {t.hotelName} · {fmtDate(t.date)}</span>
                  </div>
                  <div>{t.status === 'CANCELLED' ? '−' : ''}{inr(t.amount)}</div>
                  <div><span className={t.status === 'CANCELLED' ? 'badge-red' : 'badge-green'}>{t.status === 'CANCELLED' ? 'Refunded' : 'Paid'}</span></div>
                </div>
              ))}
            </div>

            <div id="earning-payout" className="hotel-content-card">
              <h3>Payout Information</h3>
              <p>Next payout: {fmtDate(e.nextPayoutDate)}</p>
              <h2>{inr(e.pendingPayout)}</h2>
            </div>
          </>
        ) : null}
      </LoadState>
    </HotelPage>
  );
}
