import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  SAMetricCard,
  SATable,
  SABadge,
} from '../../components/superadmin';
import {
  clearSuperAdminError,
  fetchOperationsDataThunk,
  processRefundThunk,
  resolveDisputeThunk,
  selectDisputesList,
  selectLedgerList,
  selectOperationsMetrics,
  selectRefundsList,
  selectSuperAdminError,
  selectSuperAdminLoading,
} from '@/store/superadmin/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import '../../components/superadmin/superadmin.css';

const OPS_TABS = [
  { id: 'ledger', label: 'Transaction Ledger' },
  { id: 'refunds', label: 'Refund Requests' },
  { id: 'disputes', label: 'Dispute Resolution' },
];

/**
 * SuperAdmin Operations & Bookings Console.
 * Manages operational metrics, financial transaction ledgers,
 * refund queue authorizations, and customer dispute resolution.
 * 
 * @param {Object} props
 * @param {Object} [props.user] - Optional user session object
 */
export default function SuperAdminOpsBookPage({ user = null }) {
  const dispatch = useDispatch();
  const { user: authUser } = useAuth();
  const session = useMemo(() => user || authUser, [user, authUser]);
  // Section Tab State
  const [activeTab, setActiveTab] = useState('ledger');

  // Core Data States from Redux
  const metrics = useSelector(selectOperationsMetrics);
  const ledger = useSelector(selectLedgerList);
  const refunds = useSelector(selectRefundsList);
  const disputes = useSelector(selectDisputesList);
  const isLoading = useSelector(selectSuperAdminLoading);
  const errorMessage = useSelector(selectSuperAdminError);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // Filters for Ledger
  const [partnerTypeFilter, setPartnerTypeFilter] = useState('all');
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState('all');

  // Filters for Refund Queue
  const [refundStatusFilter, setRefundStatusFilter] = useState('all');

  // Filters for Disputes
  const [disputeStatusFilter, setDisputeStatusFilter] = useState('all');

  // Modals state for Refund Action & Dispute Resolution
  const [refundModal, setRefundModal] = useState(null); // { refund, action: 'approve' | 'reject', notes: '' }
  const [disputeModal, setDisputeModal] = useState(null); // { dispute, summary: '' }
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Load all operations datasets
  const loadOperationsData = useCallback(() => {
    dispatch(fetchOperationsDataThunk({ session }));
  }, [dispatch, session]);

  useEffect(() => {
    dispatch(fetchOperationsDataThunk({ session }));
  }, [dispatch, session]);

  // --------------------------------------------------------------------------
  // TAB 1: TRANSACTION LEDGER
  // --------------------------------------------------------------------------
  const displayedLedger = useMemo(() => {
    return ledger.filter((item) => {
      if (partnerTypeFilter !== 'all' && item.partnerType !== partnerTypeFilter) {
        return false;
      }
      if (ledgerStatusFilter !== 'all' && item.status !== ledgerStatusFilter) {
        return false;
      }
      return true;
    });
  }, [ledger, partnerTypeFilter, ledgerStatusFilter]);

  const ledgerColumns = [
    {
      key: 'transactionId',
      label: 'Transaction ID',
      width: '130px',
      render: (val) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>
          #{val}
        </span>
      ),
    },
    {
      key: 'bookingId',
      label: 'Booking ID',
      width: '120px',
      render: (val) => (
        <span style={{ fontFamily: 'monospace', color: '#2563eb' }}>
          {val}
        </span>
      ),
    },
    {
      key: 'customerName',
      label: 'Customer',
      render: (val) => (
        <span style={{ fontWeight: 600, color: '#0f172a' }}>{val}</span>
      ),
    },
    {
      key: 'partnerName',
      label: 'Partner & Type',
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 500, color: '#1e293b' }}>{val}</div>
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'uppercase',
            color: row.partnerType === 'hotel' ? '#9d174d' : '#6d28d9',
          }}>
            {row.partnerType === 'hotel' ? '🏨 Hotel Partner' : '🧭 Experience Organizer'}
          </span>
        </div>
      ),
    },
    {
      key: 'grossAmount',
      label: 'Gross',
      align: 'right',
      render: (val) => (
        <span style={{ fontWeight: 600, color: '#0f172a' }}>
          ₹{Number(val || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'platformFee',
      label: 'Fee (15%)',
      align: 'right',
      render: (val) => (
        <span style={{ color: '#059669', fontWeight: 500 }}>
          ₹{Number(val || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'netPayout',
      label: 'Net Payout',
      align: 'right',
      render: (val) => (
        <span style={{ fontWeight: 700, color: '#1e293b' }}>
          ₹{Number(val || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      render: (val) => {
        const statusMap = {
          settled: 'Settled',
          pending: 'Pending',
          refunded: 'Refunded',
        };
        return <SABadge status={statusMap[val] || val} />;
      },
    },
  ];

  // --------------------------------------------------------------------------
  // TAB 2: REFUND QUEUE ACTIONS
  // --------------------------------------------------------------------------
  const displayedRefunds = useMemo(() => {
    if (refundStatusFilter === 'all') return refunds;
    return refunds.filter((r) => r.status === refundStatusFilter);
  }, [refunds, refundStatusFilter]);

  const handleOpenRefundModal = (refundItem, action) => {
    setModalError(null);
    setRefundModal({
      refund: refundItem,
      action,
      notes: action === 'approve'
        ? 'Customer verified eligible under 48-hour emergency policy.'
        : 'Cancellation request violates policy terms.',
    });
  };

  const handleExecuteRefund = async (e) => {
    e.preventDefault();
    if (!refundModal) return;
    setIsActionSubmitting(true);
    setModalError(null);

    try {
      const { updated, mockMode } = await dispatch(
        processRefundThunk({
          refundId: refundModal.refund.refundId,
          action: refundModal.action,
          notes: refundModal.notes,
          session,
        })
      ).unwrap();

      setFeedbackMessage(
        `Refund #${updated.refundId} successfully ${updated.status}${mockMode ? ' (Mock Simulation)' : ''}.`
      );
      setRefundModal(null);
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err) {
      setModalError(typeof err === 'string' ? err : err?.message || 'Failed to process refund authorization.');
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const refundColumns = [
    {
      key: 'refundId',
      label: 'Refund ID',
      width: '110px',
      render: (val) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#dc2626' }}>
          #{val}
        </span>
      ),
    },
    {
      key: 'bookingId',
      label: 'Booking ID',
      width: '120px',
      render: (val) => (
        <span style={{ fontFamily: 'monospace', color: '#2563eb' }}>
          {val}
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
      label: 'Service',
      render: (val) => (
        <div style={{ fontWeight: 500, color: '#334155' }}>{val}</div>
      ),
    },
    {
      key: 'reason',
      label: 'Reason & Justification',
      render: (val, row) => (
        <div>
          <div style={{ fontSize: 13, color: '#1e293b' }}>{val}</div>
          {row.reviewNotes && (
            <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic', marginTop: 2 }}>
              Notes: {row.reviewNotes}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'requestedAmount',
      label: 'Requested',
      align: 'right',
      render: (val) => (
        <span style={{ fontWeight: 700, color: '#dc2626' }}>
          ₹{Number(val || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      render: (val) => {
        const statusMap = {
          pending: 'Pending',
          approved: 'Approved',
          rejected: 'Rejected',
        };
        return <SABadge status={statusMap[val] || val} />;
      },
    },
  ];

  // --------------------------------------------------------------------------
  // TAB 3: DISPUTE RESOLUTION ACTIONS
  // --------------------------------------------------------------------------
  const displayedDisputes = useMemo(() => {
    if (disputeStatusFilter === 'all') return disputes;
    return disputes.filter((d) => d.status === disputeStatusFilter);
  }, [disputes, disputeStatusFilter]);

  const handleOpenDisputeModal = (disputeItem) => {
    setModalError(null);
    setDisputeModal({
      dispute: disputeItem,
      summary: 'Arbitration completed: Mutually agreed partial service credit issued.',
    });
  };

  const handleExecuteDisputeResolution = async (e) => {
    e.preventDefault();
    if (!disputeModal) return;
    setIsActionSubmitting(true);
    setModalError(null);

    try {
      const updated = await dispatch(
        resolveDisputeThunk({
          disputeId: disputeModal.dispute.disputeId,
          summary: disputeModal.summary,
        })
      ).unwrap();

      setFeedbackMessage(
        `Dispute #${updated.disputeId} successfully marked as resolved (Mock Simulation).`
      );
      setDisputeModal(null);
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err) {
      setModalError(typeof err === 'string' ? err : err?.message || 'Failed to resolve dispute.');
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const disputeColumns = [
    {
      key: 'disputeId',
      label: 'Dispute ID',
      width: '110px',
      render: (val) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#b45309' }}>
          #{val}
        </span>
      ),
    },
    {
      key: 'bookingId',
      label: 'Booking ID',
      width: '120px',
      render: (val) => (
        <span style={{ fontFamily: 'monospace', color: '#2563eb' }}>
          {val}
        </span>
      ),
    },
    {
      key: 'customerName',
      label: 'Parties Involved',
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>👤 {val}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>🏢 {row.partnerName || 'Partner'}</div>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      render: (val) => (
        <span style={{
          textTransform: 'capitalize',
          fontWeight: 600,
          color: '#475569',
          fontSize: 12,
        }}>
          {(val || '').replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'severity',
      label: 'Severity',
      align: 'center',
      render: (val) => {
        const severityBadges = {
          low: { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', label: 'Low' },
          medium: { bg: '#fffbeb', color: '#b45309', border: '#fde68a', label: 'Medium' },
          high: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', label: 'High' },
        }[val] || { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', label: val || 'Norm' };

        return (
          <span style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: 12,
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            background: severityBadges.bg,
            color: severityBadges.color,
            border: `1px solid ${severityBadges.border}`,
          }}>
            {severityBadges.label}
          </span>
        );
      },
    },
    {
      key: 'summary',
      label: 'Dispute Summary',
      render: (val) => (
        <div style={{ fontSize: 13, color: '#1e293b', maxWidth: 360, lineHeight: 1.4 }}>
          {val}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      render: (val) => {
        const statusMap = {
          under_review: 'Under Review',
          resolved: 'Resolved',
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
            <h1 className="sa-users-title">Operations & Bookings Console</h1>
            <p className="sa-users-subtitle">
              Monitor operational health, revenue settlements, refund authorisations, and dispute arbitration.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className="sa-btn-secondary"
              onClick={loadOperationsData}
              disabled={isLoading}
              title="Refresh telemetry"
            >
              {isLoading ? 'Refreshing...' : '↻ Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Global Alerts */}
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

      {/* Operational Metrics Cards */}
      <div className="sa-users-metrics-grid">
        <SAMetricCard
          title="Total Annual Bookings"
          value={metrics ? metrics.totalAnnualBookings.toLocaleString('en-IN') : '—'}
          subtitle="Processed over current fiscal year"
          variant="primary"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          }
        />

        <SAMetricCard
          title="Ongoing Experiences"
          value={metrics ? metrics.ongoingExperiences.toLocaleString('en-IN') : '—'}
          subtitle="Tours & stays active in field"
          variant="warning"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
        />

        <SAMetricCard
          title="Successful Completions"
          value={metrics ? metrics.successfulCompletions.toLocaleString('en-IN') : '—'}
          subtitle="Trips fulfilled without dispute"
          variant="success"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
        />

        <SAMetricCard
          title="Attrition / Refund Rate"
          value={metrics ? `${metrics.attritionRefundsRate}%` : '—'}
          subtitle={metrics ? `${metrics.attritionRefundsCount} refund authorizations` : 'Authorizations'}
          variant="danger"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          }
        />
      </div>

      {/* Tabs Navigation */}
      <div className="sa-users-tabs-container">
        {OPS_TABS.map((tab) => {
          let count = 0;
          if (tab.id === 'ledger') count = ledger.length;
          else if (tab.id === 'refunds') count = refunds.filter((r) => r.status === 'pending').length;
          else if (tab.id === 'disputes') count = disputes.filter((d) => d.status === 'under_review').length;

          return (
            <button
              key={tab.id}
              type="button"
              className={`sa-users-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.label}</span>
              <span className="sa-users-tab-count">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: TRANSACTION LEDGER */}
      {activeTab === 'ledger' && (
        <div>
          {/* Toolbar */}
          <div className="sa-users-toolbar">
            <div className="sa-users-toolbar-left">
              <select
                className="sa-users-status-select"
                value={partnerTypeFilter}
                onChange={(e) => setPartnerTypeFilter(e.target.value)}
                aria-label="Filter ledger by partner type"
              >
                <option value="all">All Partner Types</option>
                <option value="hotel">Hotels Only</option>
                <option value="experience">Experience Organizers Only</option>
              </select>

              <select
                className="sa-users-status-select"
                value={ledgerStatusFilter}
                onChange={(e) => setLedgerStatusFilter(e.target.value)}
                aria-label="Filter ledger by settlement status"
              >
                <option value="all">All Statuses</option>
                <option value="settled">Settled Payouts</option>
                <option value="pending">Pending Settlements</option>
                <option value="refunded">Refunded Entries</option>
              </select>

              <span className="sa-users-table-meta">
                Showing <strong>{displayedLedger.length}</strong> of <strong>{ledger.length}</strong> transactions
              </span>
            </div>
          </div>

          <SATable
            columns={ledgerColumns}
            data={displayedLedger}
            keyField="transactionId"
            isLoading={isLoading}
            emptyTitle="No Ledger Transactions Found"
            emptyMessage="No financial settlements matched your current criteria."
          />
        </div>
      )}

      {/* TAB 2: REFUND REQUESTS QUEUE */}
      {activeTab === 'refunds' && (
        <div>
          <div className="sa-users-toolbar">
            <div className="sa-users-toolbar-left">
              <select
                className="sa-users-status-select"
                value={refundStatusFilter}
                onChange={(e) => setRefundStatusFilter(e.target.value)}
                aria-label="Filter refunds by authorization status"
              >
                <option value="all">All Statuses ({refunds.length})</option>
                <option value="pending">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>

              <span className="sa-users-table-meta">
                Showing <strong>{displayedRefunds.length}</strong> of <strong>{refunds.length}</strong> refund requests
              </span>
            </div>
          </div>

          <SATable
            columns={refundColumns}
            data={displayedRefunds}
            keyField="refundId"
            isLoading={isLoading}
            emptyTitle="No Refund Requests Found"
            emptyMessage="The refund authorizations queue is currently clear."
            actions={(row) => (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                {row.status === 'pending' ? (
                  <>
                    <button
                      type="button"
                      className="sa-table-btn-action"
                      style={{ color: '#059669', borderColor: '#a7f3d0' }}
                      onClick={() => handleOpenRefundModal(row, 'approve')}
                      title="Approve refund request (Mock)"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="sa-table-btn-action"
                      style={{ color: '#dc2626', borderColor: '#fecaca' }}
                      onClick={() => handleOpenRefundModal(row, 'reject')}
                      title="Reject refund request (Mock)"
                    >
                      Reject
                    </button>
                  </>
                ) : (
                  <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                    Finalized
                  </span>
                )}
              </div>
            )}
          />
        </div>
      )}

      {/* TAB 3: DISPUTE RESOLUTION */}
      {activeTab === 'disputes' && (
        <div>
          <div className="sa-users-toolbar">
            <div className="sa-users-toolbar-left">
              <select
                className="sa-users-status-select"
                value={disputeStatusFilter}
                onChange={(e) => setDisputeStatusFilter(e.target.value)}
                aria-label="Filter disputes by resolution status"
              >
                <option value="all">All Statuses ({disputes.length})</option>
                <option value="under_review">Under Active Review</option>
                <option value="resolved">Resolved</option>
              </select>

              <span className="sa-users-table-meta">
                Showing <strong>{displayedDisputes.length}</strong> of <strong>{disputes.length}</strong> customer disputes
              </span>
            </div>
          </div>

          <SATable
            columns={disputeColumns}
            data={displayedDisputes}
            keyField="disputeId"
            isLoading={isLoading}
            emptyTitle="No Customer Disputes"
            emptyMessage="There are currently no open disputes requiring SuperAdmin arbitration."
            actions={(row) => (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                {row.status === 'under_review' ? (
                  <button
                    type="button"
                    className="sa-table-btn-action"
                    style={{ color: '#2563eb', borderColor: '#bfdbfe' }}
                    onClick={() => handleOpenDisputeModal(row)}
                    title="Resolve dispute with notes (Mock)"
                  >
                    Resolve
                  </button>
                ) : (
                  <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>
                    ✓ Settled
                  </span>
                )}
              </div>
            )}
          />
        </div>
      )}

      {/* REFUND CONFIRMATION & NOTES MODAL */}
      {refundModal && (
        <div className="sa-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="sa-refund-modal-title">
          <div className="sa-modal-card">
            <div className="sa-modal-header">
              <h3 id="sa-refund-modal-title" className="sa-modal-title">
                {refundModal.action === 'approve' ? 'Approve' : 'Reject'} Refund #{refundModal.refund.refundId}
              </h3>
              <button
                type="button"
                className="sa-modal-close-btn"
                onClick={() => setRefundModal(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteRefund}>
              <div className="sa-modal-body">
                {modalError && (
                  <div className="sa-form-error" role="alert">
                    ⚠️ {modalError}
                  </div>
                )}

                <p style={{ margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.5 }}>
                  {refundModal.action === 'approve' ? (
                    <>
                      You are authorizing a refund of{' '}
                      <strong style={{ color: '#dc2626' }}>
                        ₹{Number(refundModal.refund.requestedAmount).toLocaleString('en-IN')}
                      </strong>{' '}
                      for customer <strong>{refundModal.refund.customerName}</strong> (Booking #{refundModal.refund.bookingId}).
                    </>
                  ) : (
                    <>
                      You are rejecting the refund request of{' '}
                      <strong>
                        ₹{Number(refundModal.refund.requestedAmount).toLocaleString('en-IN')}
                      </strong>{' '}
                      for customer <strong>{refundModal.refund.customerName}</strong>.
                    </>
                  )}
                </p>

                <div className="sa-form-group">
                  <label className="sa-form-label" htmlFor="refund-notes">
                    <span>Decision Notes / Reason</span>
                  </label>
                  <textarea
                    id="refund-notes"
                    className="sa-form-input"
                    rows={3}
                    value={refundModal.notes}
                    onChange={(e) => setRefundModal((prev) => ({ ...prev, notes: e.target.value }))}
                    disabled={isActionSubmitting}
                    placeholder="Enter policy rationale or explanation for review records..."
                    required
                  />
                  <span className="sa-form-hint">
                    Mock-only action: No real payment gateway or bank transaction is executed.
                  </span>
                </div>
              </div>

              <div className="sa-modal-footer">
                <button
                  type="button"
                  className="sa-btn-secondary"
                  onClick={() => setRefundModal(null)}
                  disabled={isActionSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={refundModal.action === 'approve' ? 'sa-btn-primary' : 'sa-btn-danger'}
                  disabled={isActionSubmitting}
                >
                  {isActionSubmitting
                    ? 'Processing...'
                    : refundModal.action === 'approve'
                      ? 'Confirm Approval'
                      : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISPUTE RESOLUTION MODAL */}
      {disputeModal && (
        <div className="sa-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="sa-dispute-modal-title">
          <div className="sa-modal-card">
            <div className="sa-modal-header">
              <h3 id="sa-dispute-modal-title" className="sa-modal-title">
                Resolve Dispute #{disputeModal.dispute.disputeId}
              </h3>
              <button
                type="button"
                className="sa-modal-close-btn"
                onClick={() => setDisputeModal(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteDisputeResolution}>
              <div className="sa-modal-body">
                {modalError && (
                  <div className="sa-form-error" role="alert">
                    ⚠️ {modalError}
                  </div>
                )}

                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Original Customer Complaint:</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1e293b', marginTop: 4 }}>
                    "{disputeModal.dispute.summary}"
                  </div>
                </div>

                <div className="sa-form-group">
                  <label className="sa-form-label" htmlFor="dispute-summary">
                    <span>Resolution Arbitration Summary *</span>
                  </label>
                  <textarea
                    id="dispute-summary"
                    className="sa-form-input"
                    rows={3}
                    value={disputeModal.summary}
                    onChange={(e) => setDisputeModal((prev) => ({ ...prev, summary: e.target.value }))}
                    disabled={isActionSubmitting}
                    placeholder="Describe how this dispute was settled between customer and partner..."
                    required
                  />
                  <span className="sa-form-hint">
                    Mock-only resolution: Does not modify live payment or dispute arbitration.
                  </span>
                </div>
              </div>

              <div className="sa-modal-footer">
                <button
                  type="button"
                  className="sa-btn-secondary"
                  onClick={() => setDisputeModal(null)}
                  disabled={isActionSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sa-btn-primary"
                  disabled={isActionSubmitting}
                >
                  {isActionSubmitting ? 'Resolving...' : 'Finalize Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
