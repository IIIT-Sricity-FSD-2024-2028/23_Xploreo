import { useState } from 'react';

// Day 2 — Traveller Bookings
import TravellerBookingsList from './TravellerBookingsList.jsx';
// Day 3 — Traveller Trips
import TravellerTripsList from './TravellerTripsList.jsx';
// Day 4 — Traveller Reviews
import TravellerReviewsPage from './TravellerReviewsPage.jsx';
// Day 5 — Traveller Browse
import TravellerBrowsePage from './TravellerBrowsePage.jsx';
// Day 6B — Traveller Support Tickets
import TravellerSupportTicketForm from './TravellerSupportTicketForm.jsx';
// Checkout & Payment Demo
import TravellerCheckoutPage from './TravellerCheckoutPage.jsx';

import './travellerDashboard.css';

/**
 * TravellerDashboard
 *
 * Navigation hub for the Traveller module. Renders an overview of all M5
 * feature sections and allows the user to enter each one via a sectional
 * state machine — no production routing required.
 *
 * Designed to be used inside the isolated M5 development preview.
 * Live API integration is out of scope for this stage.
 *
 * Props:
 *   bookings          {array}    – Fixture bookings list passed by the host.
 *   trips             {array}    – Fixture trips list passed by the host.
 *   reviews           {array}    – Fixture reviews list passed by the host.
 *   currentTravellerId {string}  – Mock traveller identity.
 *   onSubmitReview    {function} – Preview callback for review submission.
 *   onSubmitTicket    {function} – Preview callback for ticket submission.
 *   onRetry           {function} – Generic retry callback (passed through).
 *   onPollRefresh     {function} – Trip polling callback passed to TripsList.
 *   onSelectItem      {function} – Browse item select callback.
 *   onBookItem        {function} – Browse book/action callback.
 *   logAction         {function} – Optional logger from the parent preview.
 */
const SECTION = {
  HOME: 'home',
  BROWSE: 'browse',
  BOOKINGS: 'bookings',
  TRIPS: 'trips',
  REVIEWS: 'reviews',
  TICKETS: 'tickets',
  CHECKOUT: 'checkout',
};

const NAV_ITEMS = [
  {
    id: SECTION.BROWSE,
    icon: '🔍',
    label: 'Browse & Discover',
    description: 'Hotels, experiences, tour packages, and certified local guides.',
    accent: '#2563eb',
    available: true,
  },
  {
    id: SECTION.BOOKINGS,
    icon: '📑',
    label: 'My Bookings',
    description: 'View, filter, and manage your hotel and experience bookings.',
    accent: '#0891b2',
    available: true,
  },
  {
    id: SECTION.TRIPS,
    icon: '🧭',
    label: 'My Trips & Live Tracking',
    description: 'Track active journeys in real time and review completed trips.',
    accent: '#059669',
    available: true,
  },
  {
    id: SECTION.REVIEWS,
    icon: '⭐',
    label: 'Reviews & Feedback',
    description: 'Read verified reviews and share your own experience.',
    accent: '#d97706',
    available: true,
  },
  {
    id: SECTION.TICKETS,
    icon: '🎫',
    label: 'Support Tickets',
    description: 'Submit and track support requests for your bookings.',
    accent: '#7c3aed',
    available: true,
  },
  {
    id: SECTION.CHECKOUT,
    icon: '💳',
    label: 'Checkout & Payment Demo',
    description: 'Experience the 4-step checkout flow powered by the Mock Payment Adapter.',
    accent: '#10b981',
    available: true,
  },
];

export default function TravellerDashboard({
  bookings = [],
  trips = [],
  reviews = [],
  currentTravellerId = 'trav-usr-20001',
  onSubmitReview,
  onSubmitTicket,
  onRetry,
  onPollRefresh,
  onSelectItem,
  onBookItem,
  logAction,
  useFixtures = false,
}) {
  const [activeSection, setActiveSection] = useState(SECTION.HOME);

  const isPreviewContext = useFixtures || bookings.length > 0 || trips.length > 0 || reviews.length > 0;

  const log = (action, payload) => {
    if (typeof logAction === 'function') logAction(action, payload);
  };

  const handleEnterSection = (sectionId) => {
    if (!NAV_ITEMS.find((n) => n.id === sectionId)?.available) return;
    log(`Dashboard: navigated to section`, sectionId);
    setActiveSection(sectionId);
  };

  const handleBack = () => {
    log('Dashboard: returned to hub');
    setActiveSection(SECTION.HOME);
  };

  // ── Section: Home Hub ──────────────────────────────────────────────────────
  if (activeSection === SECTION.HOME) {
    return (
      <div className="trav-dash-root" data-testid="traveller-dashboard">
        {/* Dashboard Header */}
        <header className="trav-dash-header">
          <div className="trav-dash-header-inner">
            <div className="trav-dash-avatar" aria-hidden="true">
              {currentTravellerId.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="trav-dash-greeting">Welcome back, Traveller</h1>
              <p className="trav-dash-meta">
                ID&nbsp;<code className="trav-dash-id">{currentTravellerId}</code>
                &nbsp;·&nbsp;
                <span className="trav-dash-badge">Traveller</span>
              </p>
            </div>
          </div>
          <div className="trav-dash-stats-row">
            <div className="trav-dash-stat">
              <span className="trav-dash-stat-value">{bookings.length}</span>
              <span className="trav-dash-stat-label">Bookings</span>
            </div>
            <div className="trav-dash-stat">
              <span className="trav-dash-stat-value">{trips.length}</span>
              <span className="trav-dash-stat-label">Trips</span>
            </div>
            <div className="trav-dash-stat">
              <span className="trav-dash-stat-value">{reviews.length}</span>
              <span className="trav-dash-stat-label">Reviews</span>
            </div>
          </div>
        </header>

        {/* Navigation Grid */}
        <nav className="trav-dash-grid" aria-label="Traveller sections">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`trav-dash-card ${item.available ? '' : 'trav-dash-card--disabled'}`}
              onClick={() => handleEnterSection(item.id)}
              aria-disabled={!item.available}
              data-testid={`dashboard-nav-${item.id}`}
              style={{ '--accent': item.accent }}
            >
              <span className="trav-dash-card-icon" aria-hidden="true">
                {item.icon}
              </span>
              <div className="trav-dash-card-body">
                <h2 className="trav-dash-card-title">{item.label}</h2>
                <p className="trav-dash-card-desc">{item.description}</p>
              </div>
              {item.available ? (
                <span className="trav-dash-card-arrow" aria-hidden="true">→</span>
              ) : (
                <span className="trav-dash-card-soon">Coming soon</span>
              )}
            </button>
          ))}
        </nav>

        {/* Informational footer strip */}
        <div className="trav-dash-info-strip">
          <span>🔒</span>
          <span>
            {isPreviewContext
              ? 'This dashboard shell uses fixture data in preview mode. Live API integration is active in production.'
              : 'This dashboard shell uses fixture data when previewing. Live backend integration is active.'}
          </span>
        </div>
      </div>
    );
  }

  // ── Section: Browse ────────────────────────────────────────────────────────
  if (activeSection === SECTION.BROWSE) {
    return (
      <div className="trav-dash-section-wrapper" data-testid="section-browse">
        <button
          type="button"
          className="trav-dash-back-btn"
          onClick={handleBack}
          aria-label="Back to Traveller Dashboard"
        >
          ← Dashboard
        </button>
        <TravellerBrowsePage
          useFixtures={useFixtures}
          onSelectItem={(item, category) => {
            log('Browse: item selected', { category, name: item?.name || item?.title });
            if (typeof onSelectItem === 'function') onSelectItem(item, category);
          }}
          onBookItem={(item, category) => {
            log('Browse: book action', { category, name: item?.name || item?.title });
            if (typeof onBookItem === 'function') onBookItem(item, category);
          }}
        />
      </div>
    );
  }

  // ── Section: Bookings ──────────────────────────────────────────────────────
  if (activeSection === SECTION.BOOKINGS) {
    return (
      <div className="trav-dash-section-wrapper" data-testid="section-bookings">
        <button
          type="button"
          className="trav-dash-back-btn"
          onClick={handleBack}
          aria-label="Back to Traveller Dashboard"
        >
          ← Dashboard
        </button>
        <TravellerBookingsList
          bookings={bookings}
          currentTravellerId={currentTravellerId}
          onRetry={() => {
            log('Bookings: retry clicked');
            if (typeof onRetry === 'function') onRetry();
          }}
          useFixtures={useFixtures}
        />
      </div>
    );
  }

  // ── Section: Trips ─────────────────────────────────────────────────────────
  if (activeSection === SECTION.TRIPS) {
    return (
      <div className="trav-dash-section-wrapper" data-testid="section-trips">
        <button
          type="button"
          className="trav-dash-back-btn"
          onClick={handleBack}
          aria-label="Back to Traveller Dashboard"
        >
          ← Dashboard
        </button>
        <TravellerTripsList
          trips={trips}
          currentTravellerId={currentTravellerId}
          onPollRefresh={async () => {
            log('Trips: poll refresh triggered');
            if (typeof onPollRefresh === 'function') await onPollRefresh();
          }}
          onRetry={() => {
            log('Trips: retry clicked');
            if (typeof onRetry === 'function') onRetry();
          }}
          useFixtures={useFixtures}
        />
      </div>
    );
  }

  // ── Section: Reviews ───────────────────────────────────────────────────────
  if (activeSection === SECTION.REVIEWS) {
    return (
      <div className="trav-dash-section-wrapper" data-testid="section-reviews">
        <button
          type="button"
          className="trav-dash-back-btn"
          onClick={handleBack}
          aria-label="Back to Traveller Dashboard"
        >
          ← Dashboard
        </button>
        <TravellerReviewsPage
          reviews={reviews}
          currentTravellerId={currentTravellerId}
          onRetry={() => {
            log('Reviews: retry clicked');
            if (typeof onRetry === 'function') onRetry();
          }}
          onSubmitReview={onSubmitReview}
          useFixtures={useFixtures}
        />
      </div>
    );
  }

  // ── Section: Support Tickets ───────────────────────────────────────────────
  if (activeSection === SECTION.TICKETS) {
    return (
      <div className="trav-dash-section-wrapper" data-testid="section-tickets">
        <TravellerSupportTicketForm
          currentTravellerId={currentTravellerId}
          onBack={handleBack}
          onSubmit={onSubmitTicket}
          useFixtures={useFixtures}
        />
      </div>
    );
  }

  // ── Section: Checkout & Payment Demo ──────────────────────────────────────
  if (activeSection === SECTION.CHECKOUT) {
    return (
      <div className="trav-dash-section-wrapper" data-testid="section-checkout">
        <button
          type="button"
          className="trav-dash-back-btn"
          onClick={handleBack}
          aria-label="Back to Traveller Dashboard"
        >
          ← Dashboard
        </button>
        <TravellerCheckoutPage
          user={{ name: 'Traveller One', userId: currentTravellerId }}
          onComplete={() => log('Checkout: payment completed')}
        />
      </div>
    );
  }

  // ── Fallback (should never reach) ─────────────────────────────────────────
  return (
    <div className="trav-dash-root">
      <p>Unknown section. <button type="button" onClick={handleBack}>Return to Dashboard</button></p>
    </div>
  );
}
