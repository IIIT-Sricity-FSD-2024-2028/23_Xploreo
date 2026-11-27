import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useInRouterContext, useLocation } from 'react-router-dom';
import Navbar from '../../components/Navbar/navbar.jsx';
import { TicketCreateForm, TicketList } from '../../components/tickets/index.js';
import { selectAuthUser } from '../../features/authSlice.js';
import {
  clearCreateTicketState,
  clearSupportTicketsError,
  createSupportTicket,
  fetchSupportTickets,
  selectSupportTickets,
  selectSupportTicketsError,
  selectSupportTicketsLoading,
} from '../../features/supportTicketsSlice.js';
import './travellerSupportTickets.css';

/**
 * TravellerSupportTicketsPage
 *
 * Integrated M5 Traveller Support Tickets portal bridging existing M4 Ticket components:
 * - Reuses TicketCreateForm for client-validated ticket creation (3-140 subject, 10-1200 message)
 * - Reuses TicketList for searching, filtering, and inspecting ticket status & resolution records
 * - Scoped to the authenticated Traveller using shared identityHeaders() via tickets.api.js
 * - Handles loading, empty, success, and error states gracefully
 */
function TravellerSupportTicketsCore({
  user,
  currentTravellerId,
  showNavbar = true,
  onSubmitTicket,
  initialTab = 'list',
  location = null,
  inRouter = false,
}) {
  const dispatch = useDispatch();
  const authUser = useSelector(selectAuthUser);
  const tickets = useSelector(selectSupportTickets);
  const isLoading = useSelector(selectSupportTicketsLoading);
  const error = useSelector(selectSupportTicketsError);

  // Resolve authenticated traveller session from Redux
  const effectiveUser = useMemo(() => {
    const activeAuthUser = authUser && authUser.role !== 'default' ? authUser : null;
    return (
      user ||
      activeAuthUser || {
        name: 'Anjali Sharma',
        username: 'Anjali Sharma',
        role: 'traveller',
        userId: currentTravellerId || 'T001',
      }
    );
  }, [user, authUser, currentTravellerId]);

  // Tab state: 'list' (My Tickets) or 'create' (Submit a Ticket)
  const locationSearch = location?.search || '';
  const defaultTab = useMemo(() => {
    if (locationSearch) {
      const params = new URLSearchParams(locationSearch);
      if (params.get('tab') === 'create' || params.get('new') === '1') {
        return 'create';
      }
    }
    return initialTab;
  }, [locationSearch, initialTab]);

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [notification, setNotification] = useState(null);

  // Load caller's tickets via Redux supportTicketsSlice
  const fetchTickets = useCallback(() => {
    dispatch(fetchSupportTickets());
  }, [dispatch]);

  useEffect(() => {
    fetchTickets();
    return () => {
      dispatch(clearCreateTicketState());
      dispatch(clearSupportTicketsError());
    };
  }, [dispatch, fetchTickets]);

  const handleSubmitTicketRequest = useCallback(
    (payload) => dispatch(createSupportTicket(payload)).unwrap(),
    [dispatch],
  );

  // Handler invoked when a new ticket is submitted in TicketCreateForm
  const handleTicketSubmitted = (createdTicket) => {
    setNotification({
      type: 'success',
      message: `Ticket #${createdTicket?.id?.substring(0, 8) || 'new'} created successfully! Our operations desk has received your request.`,
    });

    if (typeof onSubmitTicket === 'function') {
      onSubmitTicket(createdTicket);
    }

    // Refresh tickets list and switch to ticket queue view
    fetchTickets();
    setActiveTab('list');
  };

  return (
    <div
      className="trav-tickets-page-wrapper"
      data-testid="traveller-support-tickets-page"
    >
      {showNavbar && inRouter && <Navbar user={effectiveUser} />}

      <main className="trav-tickets-page">
        {/* Page Header */}
        <header className="trav-tickets-header">
          <div className="trav-tickets-header-text">
            <div className="trav-tickets-eyebrow">
              <span className="trav-tickets-eyebrow-dot" />
              Help &amp; Support Desk
            </div>
            <h1 className="trav-tickets-title">Support Tickets</h1>
            <p className="trav-tickets-subtitle">
              Submit inquiries, report booking issues, or view resolution notes from the Xploreo operations desk.
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="trav-tickets-tabs" role="tablist" aria-label="Support ticket tabs">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'list'}
              className={`trav-tickets-tab-btn ${activeTab === 'list' ? 'active' : ''}`}
              onClick={() => setActiveTab('list')}
              data-testid="tab-my-tickets"
            >
              <span>My Tickets</span>
              <span className="trav-tickets-tab-badge">{tickets.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'create'}
              className={`trav-tickets-tab-btn ${activeTab === 'create' ? 'active' : ''}`}
              onClick={() => setActiveTab('create')}
              data-testid="tab-create-ticket"
            >
              <span>+ Submit Ticket</span>
            </button>
          </div>
        </header>

        {/* Global Notification Banner */}
        {notification && (
          <div
            className={`trav-tickets-notification ${notification.type}`}
            role={notification.type === 'error' ? 'alert' : 'status'}
            data-testid="tickets-notification-banner"
          >
            <span>{notification.message}</span>
            <button
              type="button"
              className="trav-tickets-notification-close"
              onClick={() => setNotification(null)}
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tab 1: Ticket Queue List */}
        {activeTab === 'list' && (
          <section aria-labelledby="heading-my-tickets">
            {isLoading ? (
              <div className="trav-tickets-loading-card" role="status" aria-live="polite">
                <div className="trav-tickets-spinner" />
                <span>Loading your support tickets...</span>
              </div>
            ) : error ? (
              <div className="trav-tickets-error-card" role="alert">
                <p>{error}</p>
                <button
                  type="button"
                  className="trav-tickets-retry-btn"
                  onClick={fetchTickets}
                >
                  Try Again
                </button>
              </div>
            ) : tickets.length === 0 ? (
              <div
                className="trav-tickets-empty-card"
                data-testid="traveller-tickets-empty"
              >
                <div className="trav-tickets-empty-icon" aria-hidden="true">
                  🎫
                </div>
                <h2 className="trav-tickets-empty-title">No Support Tickets Yet</h2>
                <p className="trav-tickets-empty-desc">
                  Have an issue with a booking, questions about a tour itinerary, or need assistance? Open a support ticket and our operations desk will review it.
                </p>
                <button
                  type="button"
                  className="trav-tickets-create-cta-btn"
                  onClick={() => setActiveTab('create')}
                  data-testid="btn-empty-create-ticket"
                >
                  + Submit Your First Ticket
                </button>
              </div>
            ) : (
              <TicketList
                tickets={tickets}
                isLoading={isLoading}
                error={error}
                allowResolve={false}
              />
            )}
          </section>
        )}

        {/* Tab 2: Ticket Creation Form */}
        {activeTab === 'create' && (
          <section aria-labelledby="heading-create-ticket">
            <TicketCreateForm
              submitTicket={handleSubmitTicketRequest}
              currentUser={effectiveUser}
              onSubmitSuccess={handleTicketSubmitted}
            />
          </section>
        )}
      </main>
    </div>
  );
}

function TravellerSupportTicketsWithRouter(props) {
  const location = useLocation();
  return <TravellerSupportTicketsCore {...props} location={location} inRouter />;
}

export default function TravellerSupportTicketsPage(props) {
  const inRouter = useInRouterContext();
  return inRouter ? (
    <TravellerSupportTicketsWithRouter {...props} />
  ) : (
    <TravellerSupportTicketsCore {...props} location={null} inRouter={false} />
  );
}
