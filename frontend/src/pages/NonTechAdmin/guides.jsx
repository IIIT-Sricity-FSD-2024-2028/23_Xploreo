import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '@/foundation';
import { SABadge } from '../../components/superadmin';
import {
  decideGuideApplication,
  fetchGuideApplications,
  fetchNtaPlans,
  selectGuideApplicationCounts,
  selectGuideApplications,
  selectGuideApplicationsError,
  selectGuideApplicationsLoading,
  selectNtaPlans,
  selectNtaPlansError,
  selectNtaPlansLoading,
} from '../../store/nta/index.js';
import '../../components/superadmin/superadmin.css';
import '../../components/tickets/tickets.css';
import '../../components/nta/nta.css';

const STATUS_TABS = [
  { key: 'all', label: 'All Applications' },
  { key: 'pending', label: 'Pending Review' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'rejected', label: 'Rejected' },
];

// Stable empty values used when the NTA has no assigned region.
const NO_ITEMS = [];
const NO_COUNTS = { all: 0, pending: 0, accepted: 0, rejected: 0 };

/**
 * NonTechAdmin Guide Applications Review & Decision Page.
 * Strictly adheres to M4 product specifications:
 * - Scoped 100% to the selected NTA region.
 * - Single source of truth for counts and package lists.
 * - Review modal with applicant credentials and accept/reject decision workflow.
 * 
 * @param {Object} props
 * @param {Object} [props.user] - Current session user object { userId, role, region }
 * @param {Object} [props.currentUser] - Alternative prop alias
 * @param {() => void} [props.onNavigateDashboard] - Callback to return to dashboard
 * @param {() => void} [props.onNavigatePlans] - Callback to navigate to manage plans
 */
export default function GuidesPage({
  user = null,
  currentUser = null,
  onNavigateDashboard = null,
  onNavigatePlans = null,
}) {
  const { user: authUser } = useAuth();
  const session = useMemo(() => {
    return currentUser || user || (authUser && authUser.role !== 'default' ? authUser : {
      userid: 'NTA-JAI-001',
      userId: 'NTA-JAI-001',
      role: 'nontechadmin',
      region: 'Jaipur',
    });
  }, [user, currentUser, authUser]);

  const assignedRegion = session.region || '';

  // Data states — the shared Redux store: applications in state.nta.guideApplications, and the
  // region's packages (for the package filter) in state.nta.plans, the same plans Manage Packages uses.
  const dispatch = useDispatch();
  const storeApps = useSelector(selectGuideApplications);
  const storeCounts = useSelector(selectGuideApplicationCounts);
  const appsLoading = useSelector(selectGuideApplicationsLoading);
  const appsError = useSelector(selectGuideApplicationsError);
  const storePlans = useSelector(selectNtaPlans);
  const plansLoading = useSelector(selectNtaPlansLoading);
  const plansError = useSelector(selectNtaPlansError);

  // Without an assigned region there is nothing to load or show.
  const allRegionalApps = assignedRegion ? storeApps : NO_ITEMS;
  const regionalPackages = assignedRegion ? storePlans : NO_ITEMS;
  const isLoading = Boolean(assignedRegion) && (appsLoading || plansLoading);
  const errorMessage = assignedRegion
    ? appsError?.message || plansError?.message || null
    : null;

  // Filters
  const [activeStatusTab, setActiveStatusTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('all');

  // Review & Decision Modal State
  const [selectedApp, setSelectedApp] = useState(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState(null);
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [modalFeedback, setModalFeedback] = useState(null);

  // Success alert on page
  const [pageSuccessNotice, setPageSuccessNotice] = useState(null);

  // Reset modal and incompatible filters when assignedRegion changes
  useEffect(() => {
    setSelectedApp(null);
    setIsRejecting(false);
    setRejectionReason('');
    setRejectionError(null);
    setSelectedPackageId('all');
    setSearchTerm('');
    setActiveStatusTab('all');
  }, [assignedRegion]);

  // Load packages and applications for the active region into the store (once per session;
  // returning to this page reuses them, and decisions update them in place).
  useEffect(() => {
    if (!assignedRegion) return;
    dispatch(fetchGuideApplications({ filters: { destination: assignedRegion }, session }));
    dispatch(fetchNtaPlans({ session }));
  }, [dispatch, assignedRegion, session]);

  // Refresh / Retry buttons: always reload both from the server
  const loadData = useCallback(() => {
    if (!assignedRegion) return;
    dispatch(fetchGuideApplications({ filters: { destination: assignedRegion }, session, force: true }));
    dispatch(fetchNtaPlans({ session, force: true }));
  }, [dispatch, assignedRegion, session]);

  // Status counts strictly from the current region's applications
  const counts = assignedRegion ? storeCounts : NO_COUNTS;

  // Filter applications by status tab, search keyword, and package dropdown
  const filteredApps = useMemo(() => {
    return allRegionalApps.filter((app) => {
      // 1. Status Filter
      if (activeStatusTab !== 'all') {
        if (String(app.status || '').toLowerCase() !== activeStatusTab) {
          return false;
        }
      }

      // 2. Package Filter
      if (selectedPackageId !== 'all') {
        if (app.packageId !== selectedPackageId) {
          return false;
        }
      }

      // 3. Search Query Filter (guideName, experienceTitle, email, phone)
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesName = app.guideName?.toLowerCase().includes(q);
        const matchesExp = app.experienceTitle?.toLowerCase().includes(q);
        const matchesEmail = app.guideEmail?.toLowerCase().includes(q);
        const matchesPhone = app.guidePhone?.toLowerCase().includes(q);
        const matchesPkg = app.packageTitle?.toLowerCase().includes(q);

        if (!matchesName && !matchesExp && !matchesEmail && !matchesPhone && !matchesPkg) {
          return false;
        }
      }

      return true;
    });
  }, [allRegionalApps, activeStatusTab, selectedPackageId, searchTerm]);

  // Handle Decision Modal Open
  const handleOpenReview = (app) => {
    setSelectedApp(app);
    setIsRejecting(false);
    setRejectionReason('');
    setRejectionError(null);
    setModalFeedback(null);
  };

  const handleCloseModal = () => {
    setSelectedApp(null);
    setIsRejecting(false);
    setRejectionReason('');
    setRejectionError(null);
    setModalFeedback(null);
  };

  // Submit Decision (Accept or Reject)
  const handleExecuteDecision = async (decisionStatus) => {
    if (!selectedApp) return;

    if (decisionStatus === 'rejected') {
      const trimmed = rejectionReason.trim();
      if (!trimmed) {
        setRejectionError('Rejection reason is required. Please provide a clear explanation for the applicant.');
        return;
      }
      if (trimmed.length < 5) {
        setRejectionError('Please provide a more detailed rejection reason (at least 5 characters).');
        return;
      }
    }

    setIsSubmittingDecision(true);
    setRejectionError(null);
    setModalFeedback(null);

    try {
      // The thunk replaces this application in the store with the server's record (no refetch);
      // unwrap() throws on failure so the modal shows the real error and the entry is unchanged.
      await dispatch(
        decideGuideApplication({
          id: selectedApp.id,
          status: decisionStatus,
          reason: decisionStatus === 'rejected' ? rejectionReason.trim() : 'Application approved.',
          session,
        })
      ).unwrap();

      setPageSuccessNotice(
        `Guide application for ${selectedApp.guideName} was successfully ${decisionStatus}!`
      );
      setTimeout(() => setPageSuccessNotice(null), 5000);

      handleCloseModal();
    } catch (err) {
      setModalFeedback({
        type: 'error',
        message: err.message || `Failed to ${decisionStatus} application.`,
      });
    } finally {
      setIsSubmittingDecision(false);
    }
  };

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
                Guide Applications
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
                Region: {assignedRegion || 'Unassigned'}
              </span>
            </div>
            <p className="sa-users-subtitle" style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
              Review, verify credentials, and accept or reject local guide applications for {assignedRegion} packages.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {onNavigateDashboard && (
              <button
                type="button"
                className="sa-btn-secondary"
                onClick={onNavigateDashboard}
                title="Return to NTA Dashboard"
              >
                &larr; Dashboard
              </button>
            )}
            {onNavigatePlans && (
              <button
                type="button"
                className="sa-btn-secondary"
                onClick={onNavigatePlans}
                title="Go to Manage Plans"
              >
                Manage Packages
              </button>
            )}
            <button
              type="button"
              className="sa-btn-secondary"
              onClick={loadData}
              disabled={isLoading}
              title="Refresh applications list"
            >
              {isLoading ? 'Refreshing...' : '↻ Refresh'}
            </button>
          </div>
        </div>
      </header>

      {/* 2. Page Alerts */}
      {pageSuccessNotice && (
        <div className="nta-form-alert-success" role="status" style={{ marginBottom: 20 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{pageSuccessNotice}</span>
        </div>
      )}

      {errorMessage && (
        <div className="sa-users-alert sa-users-alert-error" role="alert" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>⚠️ {errorMessage}</span>
            <button
              type="button"
              className="sa-btn-secondary"
              style={{ padding: '4px 10px', fontSize: 12 }}
              onClick={loadData}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* 3. Status Tabs Navigation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 20,
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: 12,
          overflowX: 'auto',
        }}
        role="tablist"
        aria-label="Filter by application status"
      >
        {STATUS_TABS.map((tab) => {
          const isActive = activeStatusTab === tab.key;
          const count = counts[tab.key] ?? 0;

          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveStatusTab(tab.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 9999,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                border: isActive ? '1px solid #2563eb' : '1px solid #e2e8f0',
                background: isActive ? '#eff6ff' : '#ffffff',
                color: isActive ? '#1d4ed8' : '#64748b',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 10,
                  background: isActive ? '#2563eb' : '#f1f5f9',
                  color: isActive ? '#ffffff' : '#475569',
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. Filter & Search Toolbar */}
      <div
        className="admin-ticket-queue-card"
        style={{
          marginBottom: 24,
          padding: '16px 20px',
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          {/* Search Box */}
          <div style={{ flex: '1 1 280px', maxWidth: 420, position: 'relative' }}>
            <input
              type="text"
              className="admin-ticket-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${assignedRegion} guide name, activity, or email...`}
              aria-label="Search guide applications"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: 16,
                  cursor: 'pointer',
                }}
                aria-label="Clear search"
              >
                &times;
              </button>
            )}
          </div>

          {/* Regional Package Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Package:</span>
            <select
              value={selectedPackageId}
              onChange={(e) => setSelectedPackageId(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1.5px solid #cbd5e1',
                fontSize: 13,
                color: '#1e293b',
                background: '#ffffff',
                cursor: 'pointer',
                maxWidth: 260,
              }}
              aria-label="Filter by regional travel package"
            >
              <option value="all">All {assignedRegion} Packages</option>
              {regionalPackages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.title}
                </option>
              ))}
            </select>

            {(searchTerm || selectedPackageId !== 'all' || activeStatusTab !== 'all') && (
              <button
                type="button"
                className="sa-btn-secondary"
                style={{ padding: '7px 12px', fontSize: 12 }}
                onClick={() => {
                  setSearchTerm('');
                  setSelectedPackageId('all');
                  setActiveStatusTab('all');
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5. Guide Applications Table */}
      <section
        className="admin-ticket-queue-card"
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Guide Application Queue
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
              Showing {filteredApps.length} {filteredApps.length === 1 ? 'application' : 'applications'} matching current filters in {assignedRegion}
            </p>
          </div>
        </div>

        <div className="admin-ticket-table-wrapper" style={{ border: '1px solid #f1f5f9', borderRadius: 12, overflowX: 'auto', width: '100%' }}>
          <table className="admin-ticket-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 14px', backgroundColor: '#f8fafc', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>
                  Guide Applicant
                </th>
                <th style={{ padding: '10px 14px', backgroundColor: '#f8fafc', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>
                  Target Package & Experience
                </th>
                <th style={{ padding: '10px 14px', backgroundColor: '#f8fafc', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
                  Price / Person
                </th>
                <th style={{ padding: '10px 14px', backgroundColor: '#f8fafc', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>
                  Status
                </th>
                <th style={{ padding: '10px 14px', backgroundColor: '#f8fafc', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>
                  Decision Reason / Notes
                </th>
                <th style={{ padding: '10px 14px', backgroundColor: '#f8fafc', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>
                  Applied On
                </th>
                <th style={{ padding: '10px 14px', backgroundColor: '#f8fafc', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <div className="sa-table-spinner" />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>Loading regional guide applications...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px 20px' }}>
                    <div style={{ maxWidth: 360, margin: '0 auto' }}>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>🧑‍💼</div>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
                        No Guide Applications Found
                      </h4>
                      <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                        {searchTerm || selectedPackageId !== 'all' || activeStatusTab !== 'all'
                          ? `No applications in ${assignedRegion} match your current filter criteria.`
                          : `There are currently no guide applications registered for ${assignedRegion}.`}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredApps.map((item) => (
                  <tr key={item.id}>
                    {/* Guide Info */}
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>
                        {item.guideName}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        {item.guideEmail} &bull; {item.guidePhone}
                      </div>
                      {item.rating && (
                        <div style={{ fontSize: 11, color: '#d97706', marginTop: 2, fontWeight: 600 }}>
                          ★ {Number(item.rating).toFixed(1)} &bull; {item.yearsExp} yrs exp
                        </div>
                      )}
                    </td>

                    {/* Target Package & Experience */}
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 13 }}>
                        {item.targetKind === 'experience' ? '🎟 ' : '📦 '}
                        {item.experienceTitle}
                      </div>
                      <div style={{ fontSize: 11, color: '#2563eb', marginTop: 2, fontWeight: 500 }}>
                        📍 {item.destination}
                      </div>
                    </td>

                    {/* Price / Person */}
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {item.pricePerPerson ? (
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>
                          ₹{Number(item.pricePerPerson).toLocaleString()}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                      <SABadge status={item.status} />
                    </td>

                    {/* Decision Notes */}
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', maxWidth: 220 }}>
                      {item.decisionNotes ? (
                        <div style={{ fontSize: 12, color: item.status === 'rejected' ? '#b91c1c' : '#15803d', lineHeight: 1.35 }}>
                          {item.decisionNotes}
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
                      )}
                    </td>

                    {/* Applied Date */}
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap', fontSize: 12, color: '#64748b' }}>
                      {formatDate(item.submittedAt)}
                    </td>

                    {/* Action */}
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {item.status === 'pending' ? (
                        <button
                          type="button"
                          className="sa-btn-primary"
                          style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600 }}
                          onClick={() => handleOpenReview(item)}
                        >
                          Review & Decide
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="sa-btn-secondary"
                          style={{ padding: '5px 12px', fontSize: 12 }}
                          onClick={() => handleOpenReview(item)}
                        >
                          {item.status === 'accepted' ? 'Manage' : 'View Details'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 6. Application Review & Decision Modal */}
      {selectedApp && (
        <div className="nta-modal-backdrop" role="presentation">
          <div className="nta-modal-card" style={{ maxWidth: 640 }} role="dialog" aria-modal="true">
            <div className="nta-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <h3 className="nta-modal-title" style={{ margin: 0 }}>
                    {selectedApp.status === 'pending' ? 'Review Guide Application' : selectedApp.status === 'accepted' ? 'Manage Approved Guide' : 'Guide Application Details'}
                  </h3>
                  <SABadge status={selectedApp.status} />
                </div>
                <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                  Application ID: #{selectedApp.id} &bull; Destination: {selectedApp.destination}
                </p>
              </div>
              <button
                type="button"
                className="nta-modal-close"
                onClick={handleCloseModal}
                disabled={isSubmittingDecision}
                aria-label="Close dialog"
              >
                &times;
              </button>
            </div>

            <div className="nta-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Modal Alert Feedback */}
              {modalFeedback && (
                <div className={`sa-users-alert sa-users-alert-${modalFeedback.type}`} style={{ margin: 0 }}>
                  <span>{modalFeedback.message}</span>
                </div>
              )}

              {/* Workflow note */}
              <div
                style={{
                  padding: '10px 12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  fontSize: 11,
                  color: '#475569',
                  lineHeight: 1.4,
                }}
              >
                ℹ️ Accepted guides become selectable by travellers booking this package. You can withdraw an
                approval later; the guide's unconfirmed traveller requests are returned to the travellers,
                and a guide with confirmed trips on this package cannot be withdrawn until those are resolved.
              </div>

              {/* Guide Profile Card */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                      {selectedApp.guideName}
                    </h4>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                      📧 {selectedApp.guideEmail} &bull; 📞 {selectedApp.guidePhone}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#d97706' }}>
                      {selectedApp.rating
                        ? `★ ${Number(selectedApp.rating).toFixed(1)} / 5.0 (${selectedApp.reviewCount} reviews)`
                        : 'No reviews yet'}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {selectedApp.yearsExp ? `${selectedApp.yearsExp}+ years guiding experience` : 'Experience not listed'}
                    </div>
                  </div>
                </div>

                {/* Languages */}
                {Array.isArray(selectedApp.languages) && selectedApp.languages.length > 0 && (
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                      Languages Spoken:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {selectedApp.languages.map((lang) => (
                        <span
                          key={lang}
                          style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: 12,
                            color: '#334155',
                          }}
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Certifications */}
                {Array.isArray(selectedApp.certifications) && selectedApp.certifications.length > 0 && (
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                      Licenses & Certifications:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {selectedApp.certifications.map((cert) => (
                        <span
                          key={cert}
                          style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            background: '#ecfdf5',
                            border: '1px solid #a7f3d0',
                            borderRadius: 12,
                            color: '#065f46',
                            fontWeight: 500,
                          }}
                        >
                          ✓ {cert}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bio */}
                {selectedApp.bio && (
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                      Biography:
                    </span>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#334155', lineHeight: 1.45, fontStyle: 'italic' }}>
                      &ldquo;{selectedApp.bio}&rdquo;
                    </p>
                  </div>
                )}
              </div>

              {/* Package Association Card */}
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  {selectedApp.targetKind === 'experience' ? 'Target Experience' : 'Target Package'}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                  {selectedApp.targetKind === 'experience' ? '🎟 ' : '📦 '}
                  {selectedApp.experienceTitle}
                </div>
                <div style={{ fontSize: 12, color: '#475569' }}>
                  #{selectedApp.targetKind === 'experience' ? selectedApp.experienceId : selectedApp.packageId || 'N/A'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 6, borderTop: '1px dashed #e2e8f0' }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Price: ₹{Number(selectedApp.pricePerPerson || 0).toLocaleString()} / person</span>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Submitted: {formatDate(selectedApp.submittedAt)}</span>
                </div>
              </div>

              {/* Finalized Decision Display */}
              {selectedApp.status !== 'pending' && selectedApp.decisionNotes && (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: selectedApp.status === 'accepted' ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${selectedApp.status === 'accepted' ? '#bbf7d0' : '#fecaca'}`,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: selectedApp.status === 'accepted' ? '#166534' : '#991b1b', marginBottom: 2 }}>
                    Decision Recorded: {selectedApp.status.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 12, color: '#334155' }}>
                    {selectedApp.decisionNotes}
                  </div>
                  {selectedApp.decidedAt && (
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                      Decided on: {formatDate(selectedApp.decidedAt)}
                    </div>
                  )}
                </div>
              )}

              {/* Rejection Reason Form (when rejecting) */}
              {isRejecting && (selectedApp.status === 'pending' || selectedApp.status === 'accepted') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label htmlFor="rejection-reason" style={{ fontSize: 12, fontWeight: 700, color: '#b91c1c' }}>
                    {selectedApp.status === 'accepted' ? 'Reason for withdrawing approval' : 'Rejection Reason'} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    id="rejection-reason"
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => {
                      setRejectionReason(e.target.value);
                      if (rejectionError) setRejectionError(null);
                    }}
                    placeholder="State the reason for rejection (e.g., missing regional accreditation, incomplete language proficiency)..."
                    disabled={isSubmittingDecision}
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      border: rejectionError ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
                      fontSize: 13,
                      fontFamily: 'inherit',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  />
                  {rejectionError && (
                    <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>
                      ⚠️ {rejectionError}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="nta-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="sa-btn-secondary"
                onClick={handleCloseModal}
                disabled={isSubmittingDecision}
              >
                Close
              </button>

              {selectedApp.status === 'pending' && !isRejecting && (
                <>
                  <button
                    type="button"
                    className="sa-btn-danger"
                    style={{ background: '#ef4444', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                    onClick={() => setIsRejecting(true)}
                    disabled={isSubmittingDecision}
                  >
                    Reject Application
                  </button>
                  <button
                    type="button"
                    className="sa-btn-primary"
                    style={{ padding: '8px 16px', fontWeight: 600, fontSize: 13 }}
                    onClick={() => handleExecuteDecision('accepted')}
                    disabled={isSubmittingDecision}
                  >
                    {isSubmittingDecision ? 'Processing...' : '✓ Accept Application'}
                  </button>
                </>
              )}

              {selectedApp.status === 'accepted' && !isRejecting && (
                <button
                  type="button"
                  className="sa-btn-danger"
                  style={{ background: '#ef4444', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                  onClick={() => setIsRejecting(true)}
                  disabled={isSubmittingDecision}
                >
                  Withdraw Approval
                </button>
              )}

              {(selectedApp.status === 'pending' || selectedApp.status === 'accepted') && isRejecting && (
                <>
                  <button
                    type="button"
                    className="sa-btn-secondary"
                    onClick={() => {
                      setIsRejecting(false);
                      setRejectionError(null);
                    }}
                    disabled={isSubmittingDecision}
                  >
                    Cancel Rejection
                  </button>
                  <button
                    type="button"
                    style={{ background: '#dc2626', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                    onClick={() => handleExecuteDecision('rejected')}
                    disabled={isSubmittingDecision}
                  >
                    {isSubmittingDecision ? 'Saving...' : selectedApp.status === 'accepted' ? 'Confirm Withdrawal' : 'Confirm Rejection'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
