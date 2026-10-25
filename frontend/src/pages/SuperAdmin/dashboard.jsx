import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  SAMetricCard,
  SAChart,
  SATable,
  SABadge,
} from '../../components/superadmin';
import {
  getDashboardMetrics,
  getBookingVelocity,
  getRecentBookings,
} from '../../services/superadmin.api.js';
import { getUser } from '../../services/session.js';
import '../../components/superadmin/superadmin.css';

/**
 * SuperAdmin Executive Overview Dashboard.
 * Displays high-level platform KPI cards, booking velocity trend charts,
 * and recent booking transactions.
 * 
 * @param {Object} props
 * @param {Object} [props.user] - Optional user session object
 */
export default function SuperAdminDashboardPage({ user = null }) {
  const session = useMemo(() => {
    const active = user || getUser();
    return active && active.role !== 'default' ? active : { userId: 'SA001', role: 'superadmin' };
  }, [user]);

  // Dashboard Data State
  const [metrics, setMetrics] = useState(null);
  const [velocityData, setVelocityData] = useState([]);
  const [timeframe, setTimeframe] = useState('weekly');
  const [recentBookings, setRecentBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isVelocityLoading, setIsVelocityLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // Status Filter for Recent Bookings
  const [statusFilter, setStatusFilter] = useState('all');

  // Load all initial dashboard data
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [kpiRes, velocityRes, bookingsRes] = await Promise.all([
        getDashboardMetrics(session),
        getBookingVelocity(timeframe),
        getRecentBookings(10, session),
      ]);

      setMetrics(kpiRes);
      setVelocityData(Array.isArray(velocityRes) ? velocityRes : []);
      setRecentBookings(Array.isArray(bookingsRes) ? bookingsRes : []);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load executive dashboard data.');
    } finally {
      setIsLoading(false);
    }
  }, [session, timeframe]);

  useEffect(() => {
    let isMounted = true;

    async function fetchInitialDashboard() {
      try {
        const [kpiRes, velocityRes, bookingsRes] = await Promise.all([
          getDashboardMetrics(session),
          getBookingVelocity(timeframe),
          getRecentBookings(10, session),
        ]);

        if (isMounted) {
          setMetrics(kpiRes);
          setVelocityData(Array.isArray(velocityRes) ? velocityRes : []);
          setRecentBookings(Array.isArray(bookingsRes) ? bookingsRes : []);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setErrorMessage(err.message || 'Failed to load executive dashboard data.');
          setIsLoading(false);
        }
      }
    }

    fetchInitialDashboard();

    return () => {
      isMounted = false;
    };
  }, [session, timeframe]);

  // Handle timeframe change for booking velocity chart
  const handleTimeframeChange = async (newTimeframe) => {
    setTimeframe(newTimeframe);
    setIsVelocityLoading(true);
    try {
      const data = await getBookingVelocity(newTimeframe);
      setVelocityData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[Dashboard] Error updating chart timeframe:', err);
    } finally {
      setIsVelocityLoading(false);
    }
  };

  // Filtered recent bookings
  const displayedBookings = useMemo(() => {
    if (statusFilter === 'all') return recentBookings;
    return recentBookings.filter((b) => b.status === statusFilter);
  }, [recentBookings, statusFilter]);

  // Table column configuration for SATable
  const tableColumns = [
    {
      key: 'id',
      label: 'Booking ID',
      width: '130px',
      render: (val) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>
          #{val}
        </span>
      ),
    },
    {
      key: 'customerName',
      label: 'Customer',
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>{val}</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>{row.customerEmail || '—'}</div>
        </div>
      ),
    },
    {
      key: 'serviceTitle',
      label: 'Service & Type',
      render: (val, row) => {
        const typeBadge = {
          package: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', label: 'Package' },
          hotel: { bg: '#fdf2f8', color: '#9d174d', border: '#fbcfe8', label: 'Hotel' },
          experience: { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe', label: 'Experience' },
        }[row.serviceType] || { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0', label: row.serviceType || 'Service' };

        return (
          <div>
            <div style={{ fontWeight: 500, color: '#1e293b' }}>{val}</div>
            <span
              style={{
                display: 'inline-block',
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                padding: '2px 6px',
                borderRadius: 4,
                background: typeBadge.bg,
                color: typeBadge.color,
                border: `1px solid ${typeBadge.border}`,
                marginTop: 2,
              }}
            >
              {typeBadge.label}
            </span>
          </div>
        );
      },
    },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      render: (val, row) => (
        <span style={{ fontWeight: 700, color: '#0f172a' }}>
          ₹{Number(val || 0).toLocaleString('en-IN')} {row.currency || 'INR'}
        </span>
      ),
    },
    {
      key: 'bookingDate',
      label: 'Date & Time',
      render: (val) => {
        if (!val) return '—';
        try {
          const d = new Date(val);
          return isNaN(d.getTime()) ? String(val) : d.toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
          });
        } catch {
          return String(val);
        }
      },
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      render: (val) => {
        const statusMap = {
          confirmed: 'Confirmed',
          completed: 'Completed',
          ongoing: 'Ongoing',
          cancelled: 'Cancelled',
        };
        return <SABadge status={statusMap[val] || val} />;
      },
    },
  ];

  return (
    <div className="sa-users-page">
      {/* Page Header */}
      <div className="sa-users-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div className="sa-users-title-group">
            <h1 className="sa-users-title">SuperAdmin Executive Dashboard</h1>
            <p className="sa-users-subtitle">
              Platform-wide performance, revenue telemetry, user registrations, and booking operations.
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
          </div>
        </div>
      </div>

      {/* Alerts */}
      {feedbackMessage && (
        <div className="sa-users-alert sa-users-alert-success" role="status">
          <span>✓ {feedbackMessage}</span>
          <button
            type="button"
            className="sa-users-alert-close"
            onClick={() => setFeedbackMessage(null)}
          >
            ✕
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="sa-users-alert sa-users-alert-error" role="alert">
          <span>⚠️ {errorMessage}</span>
          <button
            type="button"
            className="sa-users-alert-close"
            onClick={() => setErrorMessage(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="sa-users-metrics-grid">
        <SAMetricCard
          title="Total Registered Accounts"
          value={metrics ? metrics.totalUsers.toLocaleString('en-IN') : '—'}
          trend={metrics?.totalUsersChangePct}
          subtitle="Users, Guides & Verified Partners"
          variant="primary"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />

        <SAMetricCard
          title="Gross Revenue (INR)"
          value={metrics ? `₹${(metrics.grossRevenue / 100000).toFixed(2)}L` : '—'}
          trend={metrics?.grossRevenueChangePct}
          subtitle="Platform booking transaction volume"
          variant="success"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />

        <SAMetricCard
          title="Total Bookings"
          value={metrics ? metrics.totalBookings.toLocaleString('en-IN') : '—'}
          trend={metrics?.totalBookingsChangePct}
          subtitle="All confirmed & completed packages"
          variant="purple"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
        />

        <SAMetricCard
          title="Active Operational Trips"
          value={metrics ? metrics.activeTrips.toLocaleString('en-IN') : '—'}
          trend={metrics?.activeTripsChangePct}
          subtitle="Trips currently underway across India"
          variant="warning"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
            </svg>
          }
        />
      </div>

      {/* Booking Velocity Trend Chart */}
      <div style={{ marginBottom: 32 }}>
        <SAChart
          type="area"
          title="Booking Velocity & Engagement"
          subtitle={`Aggregated booking volume trends across platform (${timeframe})`}
          data={velocityData}
          dataKeys={[
            { key: 'bookings', label: 'Bookings Volume', color: '#2563eb' },
          ]}
          timeframe={timeframe}
          onTimeframeChange={handleTimeframeChange}
          timeframeOptions={[
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
            { value: 'quarterly', label: 'Quarterly' },
          ]}
          valueFormatter={(val) => `${val} bookings`}
          height={260}
        />
        {isVelocityLoading && (
          <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 6 }}>
            Updating trend series...
          </div>
        )}
      </div>

      {/* Recent Bookings Section Header & Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16,
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
            Recent Platform Bookings
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>
            Latest customer reservation transactions and fulfillment status.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select
            className="sa-users-status-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter bookings by status"
          >
            <option value="all">All Statuses ({recentBookings.length})</option>
            <option value="confirmed">Confirmed</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <span className="sa-users-table-meta">
            Showing <strong>{displayedBookings.length}</strong> of <strong>{recentBookings.length}</strong>
          </span>
        </div>
      </div>

      {/* Recent Bookings SATable */}
      <SATable
        columns={tableColumns}
        data={displayedBookings}
        keyField="id"
        isLoading={isLoading}
        emptyTitle="No Bookings Found"
        emptyMessage={
          statusFilter !== 'all'
            ? `There are no recent bookings with "${statusFilter}" status.`
            : 'No booking transactions have been recorded yet.'
        }
      />
    </div>
  );
}
