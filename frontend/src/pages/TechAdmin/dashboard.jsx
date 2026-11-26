import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { SAMetricCard } from '../../components/superadmin';
import TicketStatusBadge from '../../components/tickets/TicketStatusBadge.jsx';
import TicketDetailsModal from '../../components/tickets/TicketDetailsModal.jsx';
import {
  clearTicketsError,
  fetchTickets,
  resolveTicketThunk,
  selectTaCategoryBreakdown,
  selectTaPriorityBreakdown,
  selectTaRecentTickets,
  selectTaTicketKpis,
  selectTaTickets,
  selectTaTicketsError,
  selectTaTicketsLoading,
} from '../../store/techadmin/index.js';
import '../../components/superadmin/superadmin.css';
import '../../components/tickets/tickets.css';

/**
 * Tech Admin (TA) Support & Technical Operations Dashboard.
 * 
 * Features:
 * 1. 4 KPI Metric Cards: Total Tickets, Open Tickets, Resolved Tickets, High Priority Tickets.
 *    (Reuses SuperAdmin KPI styling: white cards, rounded corners, subtle shadows, 3px colored top borders, and pastel hover states).
 * 2. Workload Overview:
 *    - Priority breakdown (High, Medium, Low) with counts & proportionate progress bars.
 *    - Category breakdown (Booking, Payment, Hotel, Guide Inquiry, General) with counts & proportionate progress bars.
 * 3. Recent Tickets Table:
 *    - Uses existing Tickets table CSS (.admin-ticket-table).
 *    - Sorts tickets by most recent createdAt timestamp.
 *    - Provides "View Details" action triggering the existing TicketDetailsModal.
 * 4. Resolves tickets in-place via existing service workflow with instant KPI recalculation.
 * 5. Handles loading, empty, and error states gracefully.
 * 
 * @param {Object} props
 * @param {Function} [props.onNavigateToTickets] - Optional callback to switch to full tickets view
 * (Identity comes from the signed-in session's JWT; a `user` prop, if passed, is ignored.)
 */
export default function TechAdminDashboard({ onNavigateToTickets = null }) {
  const dispatch = useDispatch();

  // Tickets Data State — the shared Redux collection (same tickets as the Ticket Queue page)
  const tickets = useSelector(selectTaTickets);
  const isLoading = useSelector(selectTaTicketsLoading);
  const loadError = useSelector(selectTaTicketsError);

  // Page feedback (UI only)
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [actionError, setActionError] = useState(null);
  const errorMessage = actionError || loadError?.message || null;

  // Ticket Details Modal State (UI only — the ticket record itself is read from the store)
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const selectedTicket = useMemo(
    () => tickets.find((t) => t.id === selectedTicketId) ?? null,
    [tickets, selectedTicketId]
  );

  // Load tickets once per session; tickets already in the store are reused on navigation.
  useEffect(() => {
    dispatch(fetchTickets());
  }, [dispatch]);

  // Refresh button: always reload from the server
  const loadTicketsData = useCallback(() => {
    setActionError(null);
    dispatch(fetchTickets({ force: true }));
  }, [dispatch]);

  const dismissError = () => {
    setActionError(null);
    dispatch(clearTicketsError());
  };

  // KPIs, workload breakdowns and the latest five tickets — memoized selectors over the store
  const kpis = useSelector(selectTaTicketKpis);
  const priorityBreakdown = useSelector(selectTaPriorityBreakdown);
  const categoryBreakdown = useSelector(selectTaCategoryBreakdown);
  const recentTickets = useSelector(selectTaRecentTickets);

  // Handle viewing ticket details
  const handleOpenDetails = (ticket) => {
    setSelectedTicketId(ticket.id);
    setIsDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    setSelectedTicketId(null);
  };

  // Handle resolving ticket
  const handleResolveTicket = async (ticketId, resolution) => {
    try {
      // The slice updates the ticket in place from the server response, so the KPIs, the table
      // and the open modal all reflect it. unwrap() makes a failed resolve throw.
      await dispatch(resolveTicketThunk({ ticketId, resolution })).unwrap();

      setFeedbackMessage(`Ticket #${ticketId.substring(0, 8)} resolved successfully.`);
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err) {
      const message = err?.message || 'Failed to resolve ticket.';
      setActionError(message);
      setTimeout(() => setActionError(null), 5000);
      // Re-throw so TicketDetailsModal shows the error and stays open
      throw new Error(message, { cause: err });
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? String(dateStr) : d.toLocaleDateString();
    } catch {
      return String(dateStr);
    }
  };

  return (
    <div className="sa-users-page" style={{ padding: '24px 32px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div className="sa-users-header" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div className="sa-users-title-group">
            <h1 className="sa-users-title" style={{ fontSize: '26px', fontWeight: '700', color: '#0f172a', margin: '0 0 6px 0' }}>
              Tech Admin Support Dashboard
            </h1>
            <p className="sa-users-subtitle" style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
              Live overview of technical support requests, priority workload, and ticket resolution telemetry.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              className="sa-btn-secondary"
              onClick={loadTicketsData}
              disabled={isLoading}
              title="Refresh telemetry"
              style={{
                background: '#ffffff',
                color: '#475569',
                border: '1px solid #cbd5e1',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              {isLoading ? 'Refreshing...' : '↻ Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {feedbackMessage && (
        <div className="sa-users-alert sa-users-alert-success" role="status" style={{ marginBottom: '20px' }}>
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
        <div className="sa-users-alert sa-users-alert-error" role="alert" style={{ marginBottom: '20px' }}>
          <span>⚠️ {errorMessage}</span>
          <button
            type="button"
            className="sa-users-alert-close"
            onClick={dismissError}
          >
            ✕
          </button>
        </div>
      )}

      {/* Loading state indicator */}
      {isLoading && tickets.length === 0 && (
        <div className="admin-ticket-state-box" style={{ padding: '40px', textAlign: 'center', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 24 }}>
          <p style={{ margin: 0, color: '#64748b' }}>⏳ Loading support tickets telemetry...</p>
        </div>
      )}

      {/* 4 KPI Cards in One Row on Desktop (Responsive on smaller screens) */}
      <div
        className="sa-users-metrics-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        {/* Card 1: Total Tickets (Blue accent / variant-primary) */}
        <SAMetricCard
          title="Total Tickets"
          value={isLoading && tickets.length === 0 ? '—' : kpis.total}
          subtitle="All logged support requests"
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

        {/* Card 2: Open Tickets (Amber accent / variant-warning) */}
        <SAMetricCard
          title="Open Tickets"
          value={isLoading && tickets.length === 0 ? '—' : kpis.open}
          subtitle="Active / Awaiting resolution"
          variant="warning"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
        />

        {/* Card 3: Resolved Tickets (Emerald accent / variant-success) */}
        <SAMetricCard
          title="Resolved Tickets"
          value={isLoading && tickets.length === 0 ? '—' : kpis.resolved}
          subtitle={`${kpis.resolutionRate}% overall resolution rate`}
          variant="success"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
        />

        {/* Card 4: High Priority Tickets (Rose accent / variant-danger) */}
        <SAMetricCard
          title="High Priority Tickets"
          value={isLoading && tickets.length === 0 ? '—' : kpis.highPriority}
          subtitle="Urgent open issues requiring action"
          variant="danger"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          }
        />
      </div>

      {/* Workload Overview: Priority & Category Distribution */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        {/* Priority Breakdown Card */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '24px',
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>
                Priority Workload Distribution
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Distribution of logged tickets by urgency level
              </p>
            </div>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#475569', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px' }}>
              {kpis.total} Total
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {priorityBreakdown.map((p) => (
              <div key={p.key} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: p.color }} />
                    <span style={{ fontWeight: '600', color: '#1e293b' }}>{p.label}</span>
                    {p.openCount > 0 && (
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        ({p.openCount} open)
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '700', color: '#0f172a' }}>{p.count}</span>
                    <span style={{ color: '#64748b', fontSize: '12px', minWidth: '36px', textAlign: 'right' }}>
                      {p.percentage}%
                    </span>
                  </div>
                </div>

                {/* Proportionate Progress Bar */}
                <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${p.percentage}%`,
                      height: '100%',
                      backgroundColor: p.color,
                      borderRadius: '4px',
                      transition: 'width 400ms ease',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Distribution Card */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '24px',
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>
                Category Distribution
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Tickets segmented by support domain
              </p>
            </div>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#475569', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px' }}>
              {categoryBreakdown.length} Domains
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {categoryBreakdown.map((item) => (
              <div key={item.category} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                  <span style={{ fontWeight: '500', color: '#334155' }}>
                    {item.category}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '700', color: '#0f172a' }}>{item.count}</span>
                    <span style={{ color: '#64748b', fontSize: '12px', minWidth: '36px', textAlign: 'right' }}>
                      {item.percentage}%
                    </span>
                  </div>
                </div>

                {/* Proportionate Progress Bar */}
                <div style={{ width: '100%', height: '7px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${item.percentage}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
                      borderRadius: '4px',
                      transition: 'width 400ms ease',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section: Recent Support Tickets */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '24px',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: '20px',
          }}
        >
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>
              Recent Support Tickets
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              Latest incoming issues and resolution requests sorted chronologically
            </p>
          </div>

          {onNavigateToTickets && (
            <button
              type="button"
              onClick={onNavigateToTickets}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#2563eb',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              View Full Queue ({tickets.length}) →
            </button>
          )}
        </div>

        {/* Empty State */}
        {!isLoading && tickets.length === 0 && (
          <div className="admin-ticket-state-box" style={{ padding: '36px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#334155' }}>
              No support tickets found
            </p>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              All technical issues and inquiries have been resolved.
            </span>
          </div>
        )}

        {/* Tickets Table (Reusing tickets.css .admin-ticket-table) */}
        {recentTickets.length > 0 && (
          <div className="admin-ticket-table-wrapper">
            <table className="admin-ticket-table">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Requester</th>
                  <th>Subject</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentTickets.map((ticket) => {
                  const priorityClass =
                    ticket.priority === 'HIGH'
                      ? 'ticket-priority-high'
                      : ticket.priority === 'LOW'
                      ? 'ticket-priority-low'
                      : 'ticket-priority-medium';

                  return (
                    <tr key={ticket.id}>
                      {/* Ticket ID & Created Date */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span className="admin-ticket-id-badge">
                          #{ticket.id?.substring(0, 8)}
                        </span>
                        <div className="admin-ticket-date-sub">
                          {formatDate(ticket.createdAt)}
                        </div>
                      </td>

                      {/* Requester */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: '500', color: '#1e293b' }}>
                          {ticket.travellerName || ticket.travellerId || 'Traveller'}
                        </span>
                      </td>

                      {/* Subject */}
                      <td>
                        <div className="admin-ticket-subject-cell" title={ticket.subject}>
                          {ticket.subject}
                        </div>
                      </td>

                      {/* Category */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span className="admin-ticket-category-tag">
                          {ticket.category || 'General'}
                        </span>
                      </td>

                      {/* Priority */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span className={`admin-ticket-priority-pill ${priorityClass}`}>
                          ● {ticket.priority || 'MEDIUM'}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <TicketStatusBadge status={ticket.status} />
                      </td>

                      {/* Action */}
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="admin-ticket-view-btn"
                          onClick={() => handleOpenDetails(ticket)}
                          aria-label={`View details for ticket #${ticket.id?.substring(0, 8)}`}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ticket Details Modal integration */}
      <TicketDetailsModal
        ticket={selectedTicket}
        isOpen={isDetailsOpen}
        onClose={handleCloseDetails}
        onResolve={handleResolveTicket}
      />
    </div>
  );
}
