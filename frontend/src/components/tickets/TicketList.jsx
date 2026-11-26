import { useMemo } from 'react';
import { usePortalState } from '@/store/hotel/useHotelState.js';
import TicketStatusBadge from './TicketStatusBadge.jsx';
import TicketDetailsModal from './TicketDetailsModal.jsx';
import './tickets.css';

/**
 * Refined Support Ticket Queue & Management Interface (TechAdmin / M4).
 * Features:
 * - Search by Ticket ID, Traveller name, and Subject.
 * - Filters for All, Open, and Resolved tickets.
 * - Clean, compact desktop table omitting verbose description.
 * - Dedicated "View Details" trigger that opens the TicketDetailsModal drawer.
 * - Mobile-responsive stacked card view.
 * - Loading, empty, and error state handling.
 * 
 * @param {Object} props
 * @param {Array<Object>} props.tickets - List of ticket records
 * @param {boolean} [props.isLoading] - Loading state
 * @param {string|null} [props.error] - Error message
 * @param {Function} [props.onResolveTicket] - Callback (ticketId, resolution) => Promise<void>
 * @param {string} [props.className] - Optional extra class
 */
export default function TicketList({
  tickets = [],
  hotelPartner = false,
  isLoading = false,
  error = null,
  onResolveTicket,
  allowResolve = true,
  className = '',
}) {
  const [filterStatus, setFilterStatus] = usePortalState('ALL', hotelPartner);
  const [filterPriority, setFilterPriority] = usePortalState('ALL', hotelPartner);
  const [searchQuery, setSearchQuery] = usePortalState('', hotelPartner);
  const [selected, setSelectedTicket] = usePortalState(null, hotelPartner);
  const [isDetailsOpen, setIsDetailsOpen] = usePortalState(false, hotelPartner);

  const canResolve = allowResolve && typeof onResolveTicket === 'function';
  const selectedTicket = canResolve ? selected : tickets.find((ticket) => ticket.id === selected);

  // Submitter actor-role inference helper
  const getSubmitterRole = (ticket) => {
    if (!ticket) return { role: 'Traveller', roleClass: 'admin-ticket-role-traveller' };
    const rawRole = String(ticket.role || ticket.submitterRole || '').toLowerCase();
    const id = String(ticket.travellerId || '').toUpperCase();
    const name = String(ticket.travellerName || '').toLowerCase();

    if (rawRole === 'hotel' || id.startsWith('HP') || name.includes('hotel') || name.includes('resort')) {
      return { role: 'Hotel Partner', roleClass: 'admin-ticket-role-hotel' };
    }
    if (rawRole === 'guide' || id.startsWith('G') || name.includes('guide')) {
      return { role: 'Guide', roleClass: 'admin-ticket-role-guide' };
    }
    if (rawRole === 'experience' || id.startsWith('XP') || name.includes('experience') || name.includes('safari') || name.includes('kayak')) {
      return { role: 'Experience Partner', roleClass: 'admin-ticket-role-experience' };
    }
    return { role: 'Traveller', roleClass: 'admin-ticket-role-traveller' };
  };

  // Filter and search
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // 1. Status filter
      if (filterStatus !== 'ALL') {
        if (String(t.status || '').toUpperCase() !== filterStatus) {
          return false;
        }
      }

      // 2. Priority filter
      if (filterPriority !== 'ALL') {
        if (String(t.priority || '').toUpperCase() !== filterPriority) {
          return false;
        }
      }

      // 3. Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchId = String(t.id || '').toLowerCase().includes(q);
      const matchSubject = String(t.subject || '').toLowerCase().includes(q);
      const matchTraveller = String(t.travellerName || t.travellerId || '').toLowerCase().includes(q);
      const matchCategory = String(t.category || '').toLowerCase().includes(q);

      return matchId || matchSubject || matchTraveller || matchCategory;
    });
  }, [tickets, filterStatus, filterPriority, searchQuery]);

  const handleOpenDetails = (ticket) => {
    setSelectedTicket(canResolve ? ticket : ticket.id);
    setIsDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    setSelectedTicket(null);
  };

  // Wrapper for resolution callback so selectedTicket in modal is updated after success
  const handleResolveFromModal = async (ticketId, resolution) => {
    if (!onResolveTicket) return;
    await onResolveTicket(ticketId, resolution);

    // Update locally selected ticket view so modal reflects resolved state immediately
    setSelectedTicket((prev) =>
      prev && prev.id === ticketId
        ? {
            ...prev,
            status: 'RESOLVED',
            resolvedAt: new Date().toISOString(),
            resolvedBy: 'techadmin',
            resolution: resolution || 'Resolved by technical admin',
          }
        : prev
    );
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

  const openCount = tickets.filter((t) => String(t.status || '').toUpperCase() === 'OPEN').length;
  const resolvedCount = tickets.filter((t) => String(t.status || '').toUpperCase() === 'RESOLVED').length;

  return (
    <div className={`admin-ticket-queue-card ${className}`}>
      {/* Search & Filter Toolbar */}
      <div className="admin-ticket-toolbar">
        <div className="admin-ticket-toolbar-left">
          <div className="admin-ticket-search-box">
            <span className="admin-ticket-search-icon" aria-hidden="true">🔍</span>
            <input
              type="text"
              className="admin-ticket-search-input"
              placeholder="Search by ticket ID, traveller, or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search tickets"
            />
            {searchQuery && (
              <button
                type="button"
                className="admin-ticket-search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="admin-ticket-filters">
          <div style={{ display: 'inline-flex', gap: '4px', marginRight: '6px' }}>
            <button
              type="button"
              className={`admin-ticket-filter-btn ${filterStatus === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilterStatus('ALL')}
            >
              All ({tickets.length})
            </button>
            <button
              type="button"
              className={`admin-ticket-filter-btn ${filterStatus === 'OPEN' ? 'active' : ''}`}
              onClick={() => setFilterStatus('OPEN')}
            >
              Open ({openCount})
            </button>
            <button
              type="button"
              className={`admin-ticket-filter-btn ${filterStatus === 'RESOLVED' ? 'active' : ''}`}
              onClick={() => setFilterStatus('RESOLVED')}
            >
              Resolved ({resolvedCount})
            </button>
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderLeft: '1px solid #e2e8f0', paddingLeft: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Priority:</span>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              aria-label="Filter by priority"
              style={{
                fontSize: '12px',
                fontWeight: '600',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">All Priorities</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="admin-ticket-state-box">
          <p>⏳ Loading support tickets...</p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="admin-ticket-alert-error" role="alert" style={{ margin: '16px 0' }}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredTickets.length === 0 && (
        <div className="admin-ticket-state-box">
          <p>
            {searchQuery
              ? `No tickets match "${searchQuery}". Try adjusting your search or filters.`
              : `No tickets found matching the selected filters.`}
          </p>
        </div>
      )}

      {/* Responsive View: Desktop Table */}
      {!isLoading && filteredTickets.length > 0 && (
        <div className="admin-ticket-table-wrapper">
          <table className="admin-ticket-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Submitter</th>
                <th>Subject</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map((ticket) => {
                const priorityClass =
                  ticket.priority === 'HIGH'
                    ? 'ticket-priority-high'
                    : ticket.priority === 'LOW'
                    ? 'ticket-priority-low'
                    : 'ticket-priority-medium';

                const { role: submitterRole, roleClass } = getSubmitterRole(ticket);

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

                    {/* Submitter & Inferred Role Badge */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>
                        {ticket.travellerName || ticket.travellerId || 'Submitter'}
                      </div>
                      <div>
                        <span className={`admin-ticket-role-badge ${roleClass}`}>
                          {submitterRole}
                        </span>
                      </div>
                    </td>

                    {/* Subject (Prominently displayed, description omitted from table) */}
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

                    {/* Actions: View Details Button */}
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

      {/* Responsive View: Mobile Stacked Cards (Visible on screens <= 768px via CSS) */}
      {!isLoading && filteredTickets.length > 0 && (
        <div className="admin-ticket-cards-mobile">
          {filteredTickets.map((ticket) => {
            const priorityClass =
              ticket.priority === 'HIGH'
                ? 'ticket-priority-high'
                : ticket.priority === 'LOW'
                ? 'ticket-priority-low'
                : 'ticket-priority-medium';

            const { role: submitterRole, roleClass } = getSubmitterRole(ticket);

            return (
              <div key={`mob-${ticket.id}`} className="admin-ticket-mobile-card">
                <div className="admin-ticket-mobile-header">
                  <div>
                    <span className="admin-ticket-id-badge">
                      #{ticket.id?.substring(0, 8)}
                    </span>
                    <span className="admin-ticket-date-sub" style={{ display: 'inline', marginLeft: '8px' }}>
                      {formatDate(ticket.createdAt)}
                    </span>
                  </div>
                  <TicketStatusBadge status={ticket.status} />
                </div>

                <div className="admin-ticket-mobile-subject">
                  {ticket.subject}
                </div>

                <div className="admin-ticket-mobile-meta" style={{ flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span>👤 {ticket.travellerName || ticket.travellerId || 'Submitter'}</span>
                    <span className={`admin-ticket-role-badge ${roleClass}`}>
                      {submitterRole}
                    </span>
                  </div>
                  <span>📁 {ticket.category || 'General'}</span>
                  <span className={priorityClass}>● {ticket.priority || 'MEDIUM'}</span>
                </div>

                <button
                  type="button"
                  className="admin-ticket-view-btn"
                  style={{ width: '100%', marginTop: '10px' }}
                  onClick={() => handleOpenDetails(ticket)}
                >
                  View Details
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Ticket Details Dedicated Drawer / Modal */}
      <TicketDetailsModal
        ticket={selectedTicket}
        isOpen={isDetailsOpen}
        onClose={handleCloseDetails}
        onResolve={canResolve ? handleResolveFromModal : undefined}
        allowResolve={canResolve}
      />
    </div>
  );
}
