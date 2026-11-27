// Support tickets for experience partners, built on the exact same M4/M5 ticket components and
// styling as the Traveller Support Tickets page (TravellerSupportTicketsPage.jsx) — only the
// copy differs.
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TicketCreateForm, TicketList } from '@/components/tickets/index.js';
import {
  fetchExperienceTickets,
  selectExperienceTickets,
  selectExperienceTicketsLoading,
  selectExperienceTicketsError,
} from '@/store/experience/ticketsSlice.js';
import '../Traveller/travellerSupportTickets.css';

export default function ExperienceSupport() {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('list');
  const [notification, setNotification] = useState(null);

  const tickets = useSelector(selectExperienceTickets);
  const isLoading = useSelector(selectExperienceTicketsLoading);
  const error = useSelector(selectExperienceTicketsError);

  useEffect(() => {
    dispatch(fetchExperienceTickets());
  }, [dispatch]);

  const fetchTickets = () => {
    dispatch(fetchExperienceTickets());
  };

  const handleTicketSubmitted = (createdTicket) => {
    setNotification({
      type: 'success',
      message: `Ticket #${createdTicket?.id?.substring(0, 8) || 'new'} created successfully! Our operations desk has received your request.`,
    });
    dispatch(fetchExperienceTickets());
    setActiveTab('list');
  };

  return (
    <div className="trav-tickets-page-wrapper" data-testid="experience-support-tickets-page">
      <main className="trav-tickets-page">
        <header className="trav-tickets-header">
          <div className="trav-tickets-header-text">
            <div className="trav-tickets-eyebrow">
              <span className="trav-tickets-eyebrow-dot" />
              Help &amp; Support Desk
            </div>
            <h1 className="trav-tickets-title">Support Tickets</h1>
            <p className="trav-tickets-subtitle">
              Submit inquiries, report booking or payout issues, or view resolution notes from the Xploreo operations desk.
            </p>
          </div>

          <div className="trav-tickets-tabs" role="tablist" aria-label="Support ticket tabs">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'list'}
              className={`trav-tickets-tab-btn ${activeTab === 'list' ? 'active' : ''}`}
              onClick={() => setActiveTab('list')}
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
            >
              <span>+ Submit Ticket</span>
            </button>
          </div>
        </header>

        {notification && (
          <div className={`trav-tickets-notification ${notification.type}`} role={notification.type === 'error' ? 'alert' : 'status'}>
            <span>{notification.message}</span>
            <button type="button" className="trav-tickets-notification-close" onClick={() => setNotification(null)} aria-label="Dismiss notification">
              ✕
            </button>
          </div>
        )}

        {activeTab === 'list' && (
          <section aria-labelledby="heading-my-tickets">
            {isLoading ? (
              <div className="trav-tickets-loading-card" role="status" aria-live="polite">
                <div className="trav-tickets-spinner" />
                <span>Loading your support tickets...</span>
              </div>
            ) : error ? (
              <div className="trav-tickets-error-card" role="alert">
                <p>{typeof error === 'string' ? error : error?.message || 'Failed to load your support tickets.'}</p>
                <button type="button" className="trav-tickets-retry-btn" onClick={fetchTickets}>Try Again</button>
              </div>
            ) : tickets.length === 0 ? (
              <div className="trav-tickets-empty-card" data-testid="experience-tickets-empty">
                <div className="trav-tickets-empty-icon" aria-hidden="true">🎫</div>
                <h2 className="trav-tickets-empty-title">No Support Tickets Yet</h2>
                <p className="trav-tickets-empty-desc">
                  Have an issue with a booking, a slot, or a payout? Open a support ticket and our operations desk will review it.
                </p>
                <button type="button" className="trav-tickets-create-cta-btn" onClick={() => setActiveTab('create')}>
                  + Submit Your First Ticket
                </button>
              </div>
            ) : (
              <TicketList tickets={tickets} isLoading={isLoading} error={error} allowResolve={false} />
            )}
          </section>
        )}

        {activeTab === 'create' && (
          <section aria-labelledby="heading-create-ticket">
            <TicketCreateForm onSubmitSuccess={handleTicketSubmitted} initialCategory="Experience" />
          </section>
        )}
      </main>
    </div>
  );
}
