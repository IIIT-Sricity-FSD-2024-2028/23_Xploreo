import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  SAMetricCard,
  SAChart,
  SATable,
  SABadge,
} from '../../components/superadmin';
import {
  clearSuperAdminError,
  fetchEarningsSeriesThunk,
  fetchFinanceDataThunk,
  processPayoutThunk,
  selectEarningsLoading,
  selectEarningsSeries,
  selectFinanceMetrics,
  selectPayoutsList,
  selectSuperAdminError,
  selectSuperAdminLoading,
} from '@/store/superadmin/index.js';
import LiveFinancePanel from '../../components/finance/LiveFinancePanel.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import '../../components/superadmin/superadmin.css';

/**
 * SuperAdmin Finance & Reports Page.
 * Displays financial KPI metrics, platform commission vs partner payout charts,
 * and partner disbursement/payout queues.
 */
export default function SuperAdminFinancePage({ user = null }) {
  const dispatch = useDispatch();
  const { user: authUser } = useAuth();
  const session = useMemo(() => user || authUser, [user, authUser]);
  // Finance Data States from Redux
  const metrics = useSelector(selectFinanceMetrics);
  const earningsData = useSelector(selectEarningsSeries);
  const payoutsList = useSelector(selectPayoutsList);
  const isLoading = useSelector(selectSuperAdminLoading);
  const isChartLoading = useSelector(selectEarningsLoading);
  const errorMessage = useSelector(selectSuperAdminError);

  const [timeframe, setTimeframe] = useState('weekly');
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // Table Filters
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'paid' | 'pending' | 'failed'
  const [partnerTypeFilter, setPartnerTypeFilter] = useState('all');

  // Modal State for Payout Action (Pay / Retry)
  const [confirmPayoutModal, setConfirmPayoutModal] = useState(null); // { payout, action: 'pay' | 'retry' }
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Load initial data
  const loadFinanceData = useCallback(() => {
    dispatch(fetchFinanceDataThunk({ timeframe, session }));
  }, [dispatch, timeframe, session]);

  useEffect(() => {
    dispatch(fetchFinanceDataThunk({ timeframe, session }));
  }, [dispatch, timeframe, session]);

  // Handle timeframe change for earnings chart
  const handleTimeframeChange = (newTimeframe) => {
    setTimeframe(newTimeframe);
    dispatch(fetchEarningsSeriesThunk({ timeframe: newTimeframe, session }));
  };

  // Filtered payouts
  const displayedPayouts = useMemo(() => {
    return payoutsList.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) {
        return false;
      }
      if (partnerTypeFilter !== 'all' && p.partnerType !== partnerTypeFilter) {
        return false;
      }
      return true;
    });
  }, [payoutsList, statusFilter, partnerTypeFilter]);

  // Execute Payout Action (Pay / Retry)
  const handleExecutePayout = async (e) => {
    e.preventDefault();
    if (!confirmPayoutModal) return;
    setIsActionSubmitting(true);
    setModalError(null);

    try {
      const updated = await dispatch(
        processPayoutThunk({
          payoutId: confirmPayoutModal.payout.payoutId,
          action: confirmPayoutModal.action,
          session,
        })
      ).unwrap();

      setFeedbackMessage(
        confirmPayoutModal.action === 'retry'
          ? `Payout #${updated.payoutId} moved back to pending authorization queue.`
          : `Payout #${updated.payoutId} successfully marked as PAID to ${updated.recipientName}.`
      );
      setConfirmPayoutModal(null);
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err) {
      setModalError(typeof err === 'string' ? err : err?.message || 'Failed to process payout authorization.');
    } finally {
      setIsActionSubmitting(false);
    }
  };

  // Download Demo Receipt
  const handleDownloadDemoReceipt = (payoutItem) => {
    const receiptContent = `=======================================================
XPLOREO PLATFORM — DEMO PAYOUT RECEIPT
=======================================================
[SIMULATION NOTICE]: This is a development demo statement.
No actual banking transfer or NEFT/RTGS transaction was executed.

Payout Reference : #${payoutItem.payoutId}
Partner Name     : ${payoutItem.recipientName}
Category         : ${payoutItem.partnerType.toUpperCase()}
Disbursed Amount : ₹${Number(payoutItem.amount).toLocaleString('en-IN')} INR
Payment Method   : ${payoutItem.method}
Settlement Status: ${payoutItem.status.toUpperCase()}
Initiated Date   : ${payoutItem.initiatedAt || 'N/A'}
Completed Date   : ${payoutItem.completedAt || 'Pending Authorization'}
Generated At     : ${new Date().toISOString()}
Authorized By    : SuperAdmin Console (Mock Sandbox)
=======================================================
`;

    const blob = new Blob([receiptContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `XPLOREO_DEMO_RECEIPT_${payoutItem.payoutId}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // SATable columns
  const tableColumns = [
    {
      key: 'payoutId',
      label: 'Payout ID',
      width: '120px',
      render: (val) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>
          #{val}
        </span>
      ),
    },
    {
      key: 'recipientName',
      label: 'Partner / Recipient',
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>{val}</div>
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'uppercase',
            color: row.partnerType === 'hotel' ? '#9d174d' : row.partnerType === 'guide' ? '#047857' : '#6d28d9',
          }}>
            {row.partnerType === 'hotel'
              ? '🏨 Hotel Partner'
              : row.partnerType === 'guide'
              ? '🧭 Verified Guide'
              : '🌟 Experience Partner'}
          </span>
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Payout Amount',
      align: 'right',
      render: (val, row) => (
        <span style={{ fontWeight: 700, color: '#0f172a' }}>
          ₹{Number(val || 0).toLocaleString('en-IN')} {row.currency || 'INR'}
        </span>
      ),
    },
    {
      key: 'method',
      label: 'Payment Method',
      render: (val) => (
        <span style={{ fontSize: 13, color: '#475569' }}>
          {val || 'Direct Transfer'}
        </span>
      ),
    },
    {
      key: 'initiatedAt',
      label: 'Disbursement Date',
      render: (val, row) => {
        const dateToShow = row.completedAt || val;
        if (!dateToShow) return '—';
        try {
          const d = new Date(dateToShow);
          return (
            <div>
              <div style={{ fontSize: 13, color: '#1e293b' }}>
                {d.toLocaleDateString('en-IN', { dateStyle: 'medium' })}
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8' }}>
                {row.completedAt ? 'Completed' : 'Initiated'}
              </div>
            </div>
          );
        } catch {
          return String(dateToShow);
        }
      },
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      render: (val, row) => {
        const statusMap = {
          paid: 'Paid',
          pending: 'Pending',
          failed: 'Failed',
        };
        return (
          <div>
            <SABadge status={statusMap[val] || val} />
            {row.failureReason && (
              <div style={{ fontSize: 10, color: '#dc2626', marginTop: 3, maxWidth: 180 }}>
                {row.failureReason}
              </div>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="sa-users-page">
      {/* Header */}
      <div className="sa-users-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div className="sa-users-title-group">
            <h1 className="sa-users-title">Finance & Reports Console</h1>
            <p className="sa-users-subtitle">
              Revenue telemetry, commission tracking, platform settlement ledgers, and partner payout distributions.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className="sa-btn-secondary"
              onClick={loadFinanceData}
              disabled={isLoading}
              title="Refresh telemetry"
            >
              {isLoading ? 'Refreshing...' : '↻ Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Live money roll-up from real bookings (all cities) */}
      <LiveFinancePanel />

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
            onClick={() => dispatch(clearSuperAdminError())}
          >
            ✕
          </button>
        </div>
      )}

      {/* Financial KPI Cards */}
      <div className="sa-users-metrics-grid">
        <SAMetricCard
          title="Total Gross Processing"
          value={metrics ? `₹${(metrics.totalGrossProcessing / 100000).toFixed(2)}L` : '—'}
          subtitle="Cumulative platform bookings volume"
          variant="primary"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />

        <SAMetricCard
          title="Net Platform Revenue"
          value={metrics ? `₹${(metrics.netPlatformRevenue / 100000).toFixed(2)}L` : '—'}
          subtitle="Retained 15% booking commissions"
          variant="success"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          }
        />

        <SAMetricCard
          title="Partner Payouts Total"
          value={metrics ? `₹${(metrics.partnerPayoutsTotal / 100000).toFixed(2)}L` : '—'}
          subtitle="Cumulative partner share settlements"
          variant="purple"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <line x1="6" y1="12" x2="18" y2="12" />
            </svg>
          }
        />

        <SAMetricCard
          title="Average Commission"
          value={metrics ? `${metrics.averageCommissionRate.toFixed(1)}%` : '—'}
          subtitle="Weighted platform fee rate"
          variant="warning"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="9" y1="15" x2="15" y2="9" />
              <circle cx="9.5" cy="9.5" r=".5" fill="currentColor" />
              <circle cx="14.5" cy="14.5" r=".5" fill="currentColor" />
            </svg>
          }
        />
      </div>

      {/* Earnings Performance Chart */}
      <div style={{ marginBottom: 32 }}>
        <SAChart
          type="bar"
          title="Earnings Performance: Platform Fees vs Partner Share"
          subtitle={`Platform fees and partner earnings breakdown (${timeframe})`}
          data={earningsData}
          dataKeys={[
            { key: 'platformRevenue', label: 'Platform Fee (15%)', color: '#059669' },
            { key: 'partnerPayout', label: 'Partner Share (85%)', color: '#6366f1' },
          ]}
          timeframe={timeframe}
          onTimeframeChange={handleTimeframeChange}
          timeframeOptions={[
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
            { value: 'yearly', label: 'Yearly' },
          ]}
          valueFormatter={(val) => `₹${Number(val).toLocaleString('en-IN')}`}
          height={280}
        />
        {isChartLoading && (
          <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 6 }}>
            Updating earnings breakdown...
          </div>
        )}
      </div>

      {/* Payout Management Section Header & Toolbar */}
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
            Partner Payout Management
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>
            Disbursements to regional hotels, verified guides, and experience organizers.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Status Filter */}
          <select
            className="sa-users-status-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter payouts by status"
          >
            <option value="all">All Statuses ({payoutsList.length})</option>
            <option value="paid">Paid Only</option>
            <option value="pending">Pending Authorization</option>
            <option value="failed">Failed Transfers</option>
          </select>

          {/* Partner Type Filter */}
          <select
            className="sa-users-status-select"
            value={partnerTypeFilter}
            onChange={(e) => setPartnerTypeFilter(e.target.value)}
            aria-label="Filter payouts by partner category"
          >
            <option value="all">All Partner Categories</option>
            <option value="hotel">Hotels</option>
            <option value="experience">Experience Partners</option>
            <option value="guide">Guides</option>
          </select>

          <span className="sa-users-table-meta">
            Showing <strong>{displayedPayouts.length}</strong> of <strong>{payoutsList.length}</strong> payouts
          </span>
        </div>
      </div>

      {/* Payouts Table */}
      <SATable
        columns={tableColumns}
        data={displayedPayouts}
        keyField="payoutId"
        isLoading={isLoading}
        emptyTitle="No Payout Records Found"
        emptyMessage={
          statusFilter !== 'all' || partnerTypeFilter !== 'all'
            ? 'No partner payouts match your selected filters. Try choosing "All Statuses".'
            : 'There are currently no partner payout disbursements recorded.'
        }
        actions={(row) => (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
            {row.status === 'pending' && (
              <button
                type="button"
                className="sa-table-btn-action"
                style={{ color: '#059669', borderColor: '#a7f3d0' }}
                onClick={() => setConfirmPayoutModal({ payout: row, action: 'pay' })}
                title="Authorize and process payout (Mock Simulation)"
              >
                Process Payout
              </button>
            )}

            {row.status === 'failed' && (
              <button
                type="button"
                className="sa-table-btn-action"
                style={{ color: '#dc2626', borderColor: '#fecaca' }}
                onClick={() => setConfirmPayoutModal({ payout: row, action: 'retry' })}
                title="Retry failed payout authorization (Mock Simulation)"
              >
                Retry Payout
              </button>
            )}

            {row.status === 'paid' && (
              <button
                type="button"
                className="sa-table-btn-action"
                onClick={() => handleDownloadDemoReceipt(row)}
                title="Download local DEMO payout receipt"
              >
                Download Receipt
              </button>
            )}
          </div>
        )}
      />

      {/* PAYOUT AUTHORIZATION CONFIRMATION MODAL */}
      {confirmPayoutModal && (
        <div className="sa-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="sa-payout-modal-title">
          <div className="sa-modal-card">
            <div className="sa-modal-header">
              <h3 id="sa-payout-modal-title" className="sa-modal-title">
                {confirmPayoutModal.action === 'retry' ? 'Retry Payout' : 'Authorize Partner Payout'} #{confirmPayoutModal.payout.payoutId}
              </h3>
              <button
                type="button"
                className="sa-modal-close-btn"
                onClick={() => setConfirmPayoutModal(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecutePayout}>
              <div className="sa-modal-body">
                {modalError && (
                  <div className="sa-form-error" role="alert">
                    ⚠️ {modalError}
                  </div>
                )}

                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, lineHeight: 1.6 }}>
                  <div><strong>Recipient:</strong> {confirmPayoutModal.payout.recipientName}</div>
                  <div><strong>Disbursement Amount:</strong> <span style={{ color: '#059669', fontWeight: 700 }}>₹{Number(confirmPayoutModal.payout.amount).toLocaleString('en-IN')} INR</span></div>
                  <div><strong>Payment Method:</strong> {confirmPayoutModal.payout.method}</div>
                  <div><strong>Action Type:</strong> {confirmPayoutModal.action === 'retry' ? 'Re-queue Failed Payout' : 'Confirm Settlement'}</div>
                </div>

                <p style={{ margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.5 }}>
                  {confirmPayoutModal.action === 'retry'
                    ? 'This will reset the failure status and place this payout back into the pending authorization queue.'
                    : 'Are you sure you want to authorize this payout settlement to the partner? The record will be updated to PAID.'}
                </p>

                <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic', background: '#fffbeb', padding: 8, borderRadius: 6, border: '1px solid #fef3c7' }}>
                  ℹ️ Mock Sandbox Simulation: No real payment gateway, NEFT/RTGS transfer, or bank debit is executed.
                </div>
              </div>

              <div className="sa-modal-footer">
                <button
                  type="button"
                  className="sa-btn-secondary"
                  onClick={() => setConfirmPayoutModal(null)}
                  disabled={isActionSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sa-btn-primary"
                  disabled={isActionSubmitting}
                >
                  {isActionSubmitting
                    ? 'Processing...'
                    : confirmPayoutModal.action === 'retry'
                    ? 'Yes, Re-queue Payout'
                    : 'Confirm & Authorize Payout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
