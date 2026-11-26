import { useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '@/foundation';
import {
  SAMetricCard,
  SAChart,
  SABadge,
} from '../../components/superadmin';
import {
  fetchNtaPlans,
  fetchNtaTripActivity,
  selectNtaDashboardError,
  selectNtaDashboardKpis,
  selectNtaDashboardLoading,
  selectNtaPlansError,
  selectNtaPlansLoading,
  selectNtaPricingChartData,
  selectNtaRecentBookings,
} from '../../store/nta/index.js';
import LiveFinancePanel from '../../components/finance/LiveFinancePanel.jsx';
import '../../components/superadmin/superadmin.css';
import '../../components/tickets/tickets.css';
import '../../components/nta/nta.css';

/**
 * Non-Tech Admin (NTA) Travel Packages & Operations Dashboard.
 * 
 * Sections:
 * 1. KPI Cards (4 cards matching SuperAdmin styling, displayed in a single horizontal row on desktop)
 * 2. Recent Package Bookings (Tickets-style table layout with full metadata, empty state, and responsive behavior)
 * 3. Package Pricing Distribution Chart (SVG bar visualization of package prices)
 * 
 * @param {Object} props
 * @param {Object} [props.user] - Optional user session object passed from router / harness
 * @param {() => void} [props.onNavigatePlans] - Optional callback to navigate to Plans page
 */
export default function NtaDashboardPage({ user = null, onNavigatePlans = null }) {
  const { user: authUser } = useAuth();
  const session = useMemo(() => {
    return user || (authUser && authUser.role !== 'default' ? authUser : {
      userid: 'NTA-JAI-001',
      userId: 'NTA-JAI-001',
      role: 'nontechadmin',
      region: 'Jaipur',
    });
  }, [user, authUser]);

  // Telemetry & Data — the shared Redux store. Package KPIs and the pricing chart are derived from
  // state.nta.plans (the same plans Manage Packages uses); trip activity lives in state.nta.dashboard.
  const dispatch = useDispatch();
  const kpis = useSelector(selectNtaDashboardKpis);
  const recentBookings = useSelector(selectNtaRecentBookings);
  // Format pricing distribution for SAChart (bar format: [{ label, price }])
  const chartData = useSelector((state) => selectNtaPricingChartData(state, session.region));

  // Loading & error states
  const plansLoading = useSelector(selectNtaPlansLoading);
  const tripsLoading = useSelector(selectNtaDashboardLoading);
  const plansError = useSelector(selectNtaPlansError);
  const tripsError = useSelector(selectNtaDashboardError);
  const isLoading = plansLoading || tripsLoading;
  const loadError = tripsError || plansError;
  const errorMessage = loadError ? loadError.message || 'Failed to load NTA dashboard telemetry.' : null;
  // As before, the KPI cards have no metrics (and show their fallback values) when loading failed.
  const metrics = loadError ? null : kpis;

  // Load dashboard data once per session; returning here (or from Manage Packages, which shares
  // the plans) reuses what is already in the store.
  useEffect(() => {
    dispatch(fetchNtaPlans({ session }));
    dispatch(fetchNtaTripActivity({ session }));
  }, [dispatch, session]);

  // Refresh / Retry buttons: always reload from the server
  const loadDashboardData = useCallback(() => {
    dispatch(fetchNtaPlans({ session, force: true }));
    dispatch(fetchNtaTripActivity({ session, force: true }));
  }, [dispatch, session]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? String(dateStr) : d.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return String(dateStr);
    }
  };

  return (
    <div className="sa-users-page nta-dashboard-container" style={{ width: '100%', maxWidth: 1240, margin: '0 auto', padding: '32px 24px', boxSizing: 'border-box' }}>
      {/* 1. Header Banner */}
      <header className="sa-users-header" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div className="sa-users-title-group" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 className="sa-users-title" style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                Travel Packages Dashboard
              </h1>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: 20,
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  border: '1px solid #bfdbfe',
                }}
              >
                Region: {session.region || 'All Regions'}
              </span>
            </div>
            <p className="sa-users-subtitle" style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
              Overview of regional travel packages, live pricing distribution, and recent trip bookings.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className="sa-btn-secondary"
              onClick={loadDashboardData}
              disabled={isLoading}
              title="Refresh telemetry"
            >
              {isLoading ? 'Refreshing...' : '↻ Refresh'}
            </button>
            {onNavigatePlans && (
              <button
                type="button"
                className="sa-btn-primary"
                onClick={onNavigatePlans}
              >
                + Manage Packages
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Live money for this region, from real bookings */}
      <LiveFinancePanel showCities={false} />

      {/* 2. Error Banner */}
      {errorMessage && (
        <div className="sa-users-alert sa-users-alert-error" role="alert" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>⚠️ {errorMessage}</span>
            <button
              type="button"
              className="sa-btn-secondary"
              style={{ padding: '4px 10px', fontSize: 12 }}
              onClick={loadDashboardData}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* 3. Section A: KPI Metric Cards (Single Row Grid: 4 columns desktop, 2 columns tablet, 1 column mobile) */}
      <section
        className="sa-users-metrics-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
          marginBottom: 32,
          width: '100%',
        }}
      >
        {/* Total Packages — Blue (primary) */}
        <SAMetricCard
          title="Total Packages"
          value={isLoading ? '...' : (metrics?.totalPackages ?? 18)}
          subtitle="Configured tour packages"
          trend={metrics?.totalPackagesTrend}
          variant="primary"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          }
        />

        {/* Available Packages — Green (success) */}
        <SAMetricCard
          title="Available Packages"
          value={isLoading ? '...' : (metrics?.availablePackages ?? 14)}
          subtitle="Currently active & bookable"
          trend={metrics?.availablePackagesTrend}
          variant="success"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
        />

        {/* Unavailable Packages — Orange (warning) */}
        <SAMetricCard
          title="Unavailable Packages"
          value={isLoading ? '...' : (metrics?.unavailablePackages ?? 4)}
          subtitle="Paused or in preparation"
          trend={metrics?.unavailablePackagesTrend}
          variant="warning"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="10" y1="15" x2="10" y2="9" />
              <line x1="14" y1="15" x2="14" y2="9" />
            </svg>
          }
        />

        {/* Recent Bookings — Purple (purple) */}
        <SAMetricCard
          title="Recent Bookings"
          value={isLoading ? '...' : (metrics?.recentBookingsCount ?? 38)}
          subtitle="Platform booking activity"
          trend={metrics?.recentBookingsTrend}
          variant="purple"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          }
        />
      </section>

      {/* 4. Section B: Recent Package Bookings Table (Using Tickets-Style Table Container) */}
      <section
        className="admin-ticket-queue-card"
        style={{
          marginBottom: 32,
          padding: 24,
          background: '#ffffff',
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Recent Package Bookings
              </h2>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 9999,
                  background: '#f1f5f9',
                  color: '#475569',
                }}
              >
                {recentBookings.length} Total
              </span>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
              Confirmed traveler booking transactions and incoming trip reservations
            </p>
          </div>
        </div>

        {/* Table Container with TicketList styling */}
        <div className="admin-ticket-table-wrapper" style={{ border: '1px solid #f1f5f9', borderRadius: 12, overflowX: 'auto', width: '100%' }}>
          <table className="admin-ticket-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 14px', backgroundColor: '#f8fafc', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>
                  Booking Ref
                </th>
                <th style={{ padding: '10px 14px', backgroundColor: '#f8fafc', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>
                  Traveller
                </th>
                <th style={{ padding: '10px 14px', backgroundColor: '#f8fafc', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>
                  Package / Itinerary
                </th>
                <th style={{ padding: '10px 14px', backgroundColor: '#f8fafc', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>
                  Destination
                </th>
                <th style={{ padding: '10px 14px', backgroundColor: '#f8fafc', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>
                  Booking Date
                </th>
                <th style={{ padding: '10px 14px', backgroundColor: '#f8fafc', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>
                  Travel Date
                </th>
                <th style={{ padding: '10px 14px', backgroundColor: '#f8fafc', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>
                  Status
                </th>
                <th style={{ padding: '10px 14px', backgroundColor: '#f8fafc', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
                  Price
                </th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                    <div className="sa-table-spinner" style={{ margin: '0 auto 8px' }} />
                    <p style={{ margin: 0, fontSize: 13 }}>Loading recent bookings queue...</p>
                  </td>
                </tr>
              ) : recentBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#334155', margin: '0 0 4px' }}>
                      No recent bookings found
                    </p>
                    <p style={{ fontSize: 12, margin: 0 }}>
                      Confirmed traveler package bookings will appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                recentBookings.map((b) => (
                  <tr key={b.bookingId || b.id}>
                    {/* Booking ID & Badge */}
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                      <span className="admin-ticket-id-badge" style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: '#2563eb' }}>
                        #{b.bookingId || b.id?.substring(0, 8)}
                      </span>
                      {b.isDirectTripActivity && (
                        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                          Trip Activity
                        </div>
                      )}
                    </td>

                    {/* Traveller */}
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 13 }}>
                        {b.travellerName}
                      </div>
                      {b.travellerEmail && (
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>
                          {b.travellerEmail}
                        </div>
                      )}
                    </td>

                    {/* Package Title */}
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ fontWeight: 500, color: '#0f172a', fontSize: 13 }} title={b.packageTitle}>
                        {b.packageTitle}
                      </div>
                      {b.guests && (
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          {b.guests} {b.guests === 1 ? 'Guest' : 'Guests'}
                        </div>
                      )}
                    </td>

                    {/* Destination */}
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#475569' }}>
                        📍 {b.destination || 'Unassigned'}
                      </span>
                    </td>

                    {/* Booking Date */}
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap', fontSize: 12, color: '#64748b' }}>
                      {formatDate(b.bookingDate)}
                    </td>

                    {/* Travel Date */}
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap', fontSize: 12, color: '#64748b' }}>
                      {formatDate(b.travelDate)}
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                      <SABadge status={b.status} />
                    </td>

                    {/* Price */}
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {b.price ? (
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>
                          ₹{Number(b.price).toLocaleString()}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. Section C: Package Pricing Distribution Chart */}
      <section
        className="sa-card"
        style={{
          padding: 24,
          background: '#ffffff',
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, borderBottom: '1px solid #f1f5f9', paddingBottom: 16, marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
              Package Pricing Distribution
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
              Comparative price points across active regional travel packages (in ₹ INR)
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
              {chartData.length} Packages Analyzed
            </span>
            {onNavigatePlans && (
              <button
                type="button"
                className="sa-btn-secondary"
                style={{ padding: '6px 12px', fontSize: 12 }}
                onClick={onNavigatePlans}
              >
                View Packages →
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            <div className="sa-table-spinner" style={{ marginRight: 8 }} />
            <span>Rendering pricing curves...</span>
          </div>
        ) : chartData.length === 0 ? (
          <div style={{ height: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            <p style={{ fontWeight: 600, margin: '0 0 4px' }}>No package pricing data available</p>
            <p style={{ fontSize: 12, margin: 0 }}>Create packages to populate the pricing chart.</p>
          </div>
        ) : (
          <SAChart
            type="bar"
            data={chartData}
            dataKeys={[{ key: 'price', label: 'Price (₹)', color: '#2563eb' }]}
            valueFormatter={(val) => `₹${Number(val).toLocaleString()}`}
            height={280}
            title=""
            subtitle=""
            timeframeOptions={[]}
          />
        )}
      </section>
    </div>
  );
}
