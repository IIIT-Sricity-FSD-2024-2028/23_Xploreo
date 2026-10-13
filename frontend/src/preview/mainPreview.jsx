import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

// Day 1 Checkout Components & Utils
import {
  BookingSummaryCard,
  CheckoutStepper,
  PaymentMethodSelector,
  TravellerDetailsForm,
  DEFAULT_CHECKOUT_STEPS,
  DEFAULT_PAYMENT_METHODS,
} from '../components/checkout/index.js';

// Day 2 Traveller Bookings Components
import TravellerBookingsList from '../pages/Traveller/TravellerBookingsList.jsx';
import BookingDetailsView from '../pages/Traveller/BookingDetailsView.jsx';

// Day 3 Traveller Trips Components
import TravellerTripsList from '../pages/Traveller/TravellerTripsList.jsx';
import TravellerTripDetailsView from '../pages/Traveller/TravellerTripDetailsView.jsx';
import TripLiveTrackerWidget from '../pages/Traveller/TripLiveTrackerWidget.jsx';

// Day 4 Traveller Reviews Components
import TravellerReviewsPage from '../pages/Traveller/TravellerReviewsPage.jsx';
import TravellerReviewsList from '../pages/Traveller/TravellerReviewsList.jsx';
import ReviewSubmissionForm from '../pages/Traveller/ReviewSubmissionForm.jsx';

// Day 5 Traveller Browse & Search Components
import TravellerBrowsePage from '../pages/Traveller/TravellerBrowsePage.jsx';

// Day 6A Traveller Dashboard Shell
import TravellerDashboard from '../pages/Traveller/TravellerDashboard.jsx';

// Sample Mock Data
import {
  sampleBooking,
  sampleBookingsList,
  sampleTrip,
  sampleTripsList,
  sampleReviewsList,
} from './sampleData.js';

import './preview.css';

function MainPreviewApp() {
  const [activeTab, setActiveTab] = useState('day1');
  const [lastActionLog, setLastActionLog] = useState('Ready for interaction.');

  // Day 1 Checkout Sub-state
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState('razorpay_upi');
  const [isSubmittingCheckout, setIsSubmittingCheckout] = useState(false);

  // Day 2 Bookings Sub-state
  const [day2SubView, setDay2SubView] = useState('list'); // 'list' | 'details' | 'loading' | 'error' | 'empty'

  // Day 3 Trips Sub-state
  const [day3SubView, setDay3SubView] = useState('list'); // 'list' | 'details' | 'widget' | 'loading' | 'empty'

  // Day 4 Reviews Sub-state
  const [reviewsState, setReviewsState] = useState(sampleReviewsList);
  const [day4SubView, setDay4SubView] = useState('page'); // 'page' | 'list' | 'form'

  const logAction = (actionName, payload) => {
    const text = `[${new Date().toLocaleTimeString()}] ${actionName}: ${
      payload ? JSON.stringify(payload) : ''
    }`;
    setLastActionLog(text);
  };

  return (
    <div className="m5-preview-shell">
      {/* Top Bar Navigation */}
      <header className="m5-preview-topbar">
        <div className="m5-preview-brand">
          <span className="m5-preview-badge">Dev Preview</span>
          <div>
            <h1 className="m5-preview-title">Xploreo M5 — Traveller & Checkout Interactive Showcase</h1>
            <p className="m5-preview-subtitle">
              Visual verification of Days 1–6 modules without modifying production routing or auth infrastructure.
            </p>
          </div>
        </div>

        <nav className="m5-preview-nav">
          <button
            type="button"
            className={`m5-preview-nav-btn ${activeTab === 'day1' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('day1')}
          >
            <span>🛒</span> Day 1: Checkout
          </button>
          <button
            type="button"
            className={`m5-preview-nav-btn ${activeTab === 'day2' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('day2')}
          >
            <span>📑</span> Day 2: Bookings
          </button>
          <button
            type="button"
            className={`m5-preview-nav-btn ${activeTab === 'day3' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('day3')}
          >
            <span>🧭</span> Day 3: Trips & Tracking
          </button>
          <button
            type="button"
            className={`m5-preview-nav-btn ${activeTab === 'day4' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('day4')}
          >
            <span>⭐</span> Day 4: Reviews
          </button>
          <button
            type="button"
            className={`m5-preview-nav-btn ${activeTab === 'day5' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('day5')}
          >
            <span>🔍</span> Day 5: Browse & Search
          </button>
          <button
            type="button"
            className={`m5-preview-nav-btn ${activeTab === 'dashboard' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <span>🏠</span> Day 6A: Dashboard
          </button>
        </nav>
      </header>

      {/* Main Container */}
      <main className="m5-preview-container">
        <div className="m5-preview-card-wrapper">
          {/* ============================================================ */}
          {/* DAY 1: CHECKOUT PRESENTATION COMPONENTS                      */}
          {/* ============================================================ */}
          {activeTab === 'day1' && (
            <div>
              <div className="m5-preview-section-header">
                <h2 className="m5-preview-section-title">Day 1: Checkout Presentation Components</h2>
                <p className="m5-preview-section-desc">
                  Interactive stepper, booking summary card, traveller details form, and payment method selector.
                </p>
              </div>

              {/* Stepper */}
              <div style={{ marginBottom: '2rem' }}>
                <CheckoutStepper
                  currentStep={checkoutStep}
                  onStepClick={(step) => {
                    setCheckoutStep(step);
                    logAction('Stepper clicked step', step);
                  }}
                  steps={DEFAULT_CHECKOUT_STEPS}
                />
              </div>

              {/* Two-Column Checkout Layout */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: '2rem',
                }}
              >
                {/* Left Column: Form & Payment Selector */}
                <div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <TravellerDetailsForm
                      initialValues={{
                        firstName: 'Aarav',
                        lastName: 'Sharma',
                        email: 'aarav.sharma@example.com',
                        phone: '9876543210',
                      }}
                      isSubmitting={isSubmittingCheckout}
                      onSubmit={(data) => {
                        setIsSubmittingCheckout(true);
                        logAction('TravellerDetailsForm submitted', data);
                        setTimeout(() => {
                          setIsSubmittingCheckout(false);
                          setCheckoutStep(2);
                        }, 800);
                      }}
                    />
                  </div>

                  <div>
                    <PaymentMethodSelector
                      selectedMethod={selectedPayment}
                      onChange={(method) => {
                        setSelectedPayment(method);
                        logAction('Payment method selected', method);
                      }}
                      paymentMethods={DEFAULT_PAYMENT_METHODS}
                    />
                  </div>
                </div>

                {/* Right Column: Booking Summary Card */}
                <div>
                  <BookingSummaryCard
                    title={sampleBooking.experience.title}
                    destination={sampleBooking.experience.destination}
                    duration={sampleBooking.experience.duration}
                    date={sampleBooking.date}
                    participants={sampleBooking.participants}
                    pricing={{
                      subtotal: 18500,
                      taxes: 0,
                      total: 18500,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* DAY 2: TRAVELLER BOOKINGS & DETAILS                          */}
          {/* ============================================================ */}
          {activeTab === 'day2' && (
            <div>
              <div className="m5-preview-section-header">
                <h2 className="m5-preview-section-title">Day 2: Traveller Bookings & Drill-Down Details</h2>
                <p className="m5-preview-section-desc">
                  Filtering tabs, loading skeletons, empty state, error state, and detail view.
                </p>

                <div className="m5-preview-subnav">
                  <button
                    type="button"
                    className={`m5-preview-subnav-btn ${day2SubView === 'list' ? 'is-active' : ''}`}
                    onClick={() => setDay2SubView('list')}
                  >
                    Populated Bookings List
                  </button>
                  <button
                    type="button"
                    className={`m5-preview-subnav-btn ${day2SubView === 'details' ? 'is-active' : ''}`}
                    onClick={() => setDay2SubView('details')}
                  >
                    Booking Details View
                  </button>
                  <button
                    type="button"
                    className={`m5-preview-subnav-btn ${day2SubView === 'loading' ? 'is-active' : ''}`}
                    onClick={() => setDay2SubView('loading')}
                  >
                    Loading Skeleton State
                  </button>
                  <button
                    type="button"
                    className={`m5-preview-subnav-btn ${day2SubView === 'empty' ? 'is-active' : ''}`}
                    onClick={() => setDay2SubView('empty')}
                  >
                    Empty State
                  </button>
                  <button
                    type="button"
                    className={`m5-preview-subnav-btn ${day2SubView === 'error' ? 'is-active' : ''}`}
                    onClick={() => setDay2SubView('error')}
                  >
                    Error State
                  </button>
                </div>
              </div>

              {day2SubView === 'list' && (
                <TravellerBookingsList
                  bookings={sampleBookingsList}
                  currentTravellerId="trav-usr-20001"
                />
              )}

              {day2SubView === 'details' && (
                <BookingDetailsView
                  booking={sampleBooking}
                  onBack={() => setDay2SubView('list')}
                />
              )}

              {day2SubView === 'loading' && (
                <TravellerBookingsList isLoading={true} bookings={[]} />
              )}

              {day2SubView === 'empty' && (
                <TravellerBookingsList isLoading={false} bookings={[]} />
              )}

              {day2SubView === 'error' && (
                <TravellerBookingsList
                  isLoading={false}
                  bookings={[]}
                  error="Unable to connect to Bookings service. Please verify your connection."
                  onRetry={() => {
                    logAction('Retry Bookings fetch clicked');
                    setDay2SubView('list');
                  }}
                />
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* DAY 3: TRAVELLER TRIPS & LIVE TRACKING                       */}
          {/* ============================================================ */}
          {activeTab === 'day3' && (
            <div>
              <div className="m5-preview-section-header">
                <h2 className="m5-preview-section-title">Day 3: Traveller Trips & Live Tracking</h2>
                <p className="m5-preview-section-desc">
                  Monotonic REST polling tracker widget, live trip status indicators, and trip itinerary breakdown.
                </p>

                <div className="m5-preview-subnav">
                  <button
                    type="button"
                    className={`m5-preview-subnav-btn ${day3SubView === 'list' ? 'is-active' : ''}`}
                    onClick={() => setDay3SubView('list')}
                  >
                    Populated Trips List
                  </button>
                  <button
                    type="button"
                    className={`m5-preview-subnav-btn ${day3SubView === 'details' ? 'is-active' : ''}`}
                    onClick={() => setDay3SubView('details')}
                  >
                    Trip Details & Itinerary
                  </button>
                  <button
                    type="button"
                    className={`m5-preview-subnav-btn ${day3SubView === 'widget' ? 'is-active' : ''}`}
                    onClick={() => setDay3SubView('widget')}
                  >
                    Standalone Live Tracker Widget
                  </button>
                  <button
                    type="button"
                    className={`m5-preview-subnav-btn ${day3SubView === 'loading' ? 'is-active' : ''}`}
                    onClick={() => setDay3SubView('loading')}
                  >
                    Loading State
                  </button>
                  <button
                    type="button"
                    className={`m5-preview-subnav-btn ${day3SubView === 'empty' ? 'is-active' : ''}`}
                    onClick={() => setDay3SubView('empty')}
                  >
                    Empty State
                  </button>
                </div>
              </div>

              {day3SubView === 'list' && (
                <TravellerTripsList
                  trips={sampleTripsList}
                  currentTravellerId="trav-usr-20001"
                  onPollRefresh={async () => {
                    logAction('Simulated 10s REST poll refresh triggered');
                  }}
                />
              )}

              {day3SubView === 'details' && (
                <TravellerTripDetailsView
                  trip={sampleTrip}
                  onBack={() => setDay3SubView('list')}
                  onManualRefresh={() => {
                    logAction('Manual trip refresh clicked');
                  }}
                />
              )}

              {day3SubView === 'widget' && (
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                  <TripLiveTrackerWidget
                    currentDay={2}
                    currentStop="Vembanad Lake Kayaking Stop"
                    currentLocation="Kumarakom, Kerala"
                    trackingStatus="ongoing"
                    progressPercentage={45}
                    lastUpdatedAt={new Date().toISOString()}
                    isLive={true}
                  />
                </div>
              )}

              {day3SubView === 'loading' && (
                <TravellerTripsList isLoading={true} trips={[]} />
              )}

              {day3SubView === 'empty' && (
                <TravellerTripsList isLoading={false} trips={[]} />
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* DAY 4: TRAVELLER REVIEWS                                     */}
          {/* ============================================================ */}
          {activeTab === 'day4' && (
            <div>
              <div className="m5-preview-section-header">
                <h2 className="m5-preview-section-title">Day 4: Traveller Reviews & Feedback</h2>
                <p className="m5-preview-section-desc">
                  Review list with category filters (guide, hotel, experience), rating thresholds, and accessible submission modal.
                </p>

                <div className="m5-preview-subnav">
                  <button
                    type="button"
                    className={`m5-preview-subnav-btn ${day4SubView === 'page' ? 'is-active' : ''}`}
                    onClick={() => setDay4SubView('page')}
                  >
                    Full Interactive Reviews Page
                  </button>
                  <button
                    type="button"
                    className={`m5-preview-subnav-btn ${day4SubView === 'list' ? 'is-active' : ''}`}
                    onClick={() => setDay4SubView('list')}
                  >
                    Standalone Reviews List
                  </button>
                  <button
                    type="button"
                    className={`m5-preview-subnav-btn ${day4SubView === 'form' ? 'is-active' : ''}`}
                    onClick={() => setDay4SubView('form')}
                  >
                    Standalone Review Submission Form
                  </button>
                </div>
              </div>

              {day4SubView === 'page' && (
                <TravellerReviewsPage
                  reviews={reviewsState}
                  currentTravellerId={20001}
                  onSubmitReview={async (newReview) => {
                    logAction('New review submitted', newReview);
                    // Add to local state for instant visual feedback
                    const created = {
                      ...newReview,
                      id: reviewsState.length + 1,
                      createdAt: new Date().toISOString(),
                    };
                    setReviewsState([created, ...reviewsState]);
                  }}
                />
              )}

              {day4SubView === 'list' && (
                <TravellerReviewsList
                  reviews={reviewsState}
                  currentTravellerId={20001}
                />
              )}

              {day4SubView === 'form' && (
                <div style={{ maxWidth: '520px', margin: '0 auto' }}>
                  <ReviewSubmissionForm
                    currentUserId={20001}
                    defaultTargetType="guide"
                    defaultTargetId="10001"
                    onSubmit={async (formData) => {
                      logAction('Standalone Review Form submitted', formData);
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* DAY 5: TRAVELLER BROWSE & SEARCH INTEGRATION                */}
          {/* ============================================================ */}
          {activeTab === 'day5' && (
            <div>
              <div className="m5-preview-section-header">
                <h2 className="m5-preview-section-title">Day 5: Traveller Browse & Search Integration</h2>
                <p className="m5-preview-section-desc">
                  Interactive multi-category discovery hub for Hotels, Experiences, Tour Packages (Plans), and Certified Local Guides. Flights are strictly excluded.
                </p>
              </div>

              <TravellerBrowsePage
                useFixtures={true}
                onSelectItem={(item, category) => {
                  logAction(`Selected ${category} item for details`, item.name || item.title || item.fname);
                }}
                onBookItem={(item, category) => {
                  logAction(`Action clicked: Book/Select ${category}`, item.name || item.title || item.fname);
                }}
              />
            </div>
          )}

          {/* ============================================================ */}
          {/* DAY 6A: TRAVELLER DASHBOARD SHELL                            */}
          {/* ============================================================ */}
          {activeTab === 'dashboard' && (
            <div>
              <div className="m5-preview-section-header">
                <h2 className="m5-preview-section-title">Day 6A: Traveller Dashboard Shell</h2>
                <p className="m5-preview-section-desc">
                  Unified navigation hub for Browse, Bookings, Trips, Reviews, and Support Tickets.
                  Fixture data only — no production routing or live API calls.
                </p>
              </div>

              <TravellerDashboard
                bookings={sampleBookingsList}
                trips={sampleTripsList}
                reviews={reviewsState}
                currentTravellerId="trav-usr-20001"
                logAction={logAction}
                onSubmitReview={async (newReview) => {
                  logAction('Dashboard: review submitted', newReview);
                  const created = {
                    ...newReview,
                    id: reviewsState.length + 1,
                    createdAt: new Date().toISOString(),
                  };
                  setReviewsState([created, ...reviewsState]);
                }}
                onPollRefresh={async () => {
                  logAction('Dashboard: trip poll refresh triggered');
                }}
                onSelectItem={(item, category) => {
                  logAction(`Dashboard: browse selected ${category}`, item?.name || item?.title);
                }}
                onBookItem={(item, category) => {
                  logAction(`Dashboard: browse book ${category}`, item?.name || item?.title);
                }}
                onSubmitTicket={async (ticketPayload) => {
                  logAction('Dashboard: support ticket submitted', ticketPayload);
                  // Preview mock confirmation conforming strictly to backend Ticket entity
                  const createdTicket = {
                    id: `tick-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
                    travellerId: 'trav-usr-20001',
                    travellerName: 'trav-usr-20001',
                    subject: ticketPayload.subject,
                    message: ticketPayload.message,
                    category: ticketPayload.category || 'General',
                    priority: ticketPayload.priority || 'MEDIUM',
                    status: 'OPEN',
                    createdAt: new Date().toISOString(),
                  };
                  logAction('Dashboard: ticket confirmed by mock server', createdTicket.id);
                  return createdTicket;
                }}
              />
            </div>
          )}

          {/* Interactive Log Console */}
          <div className="m5-preview-interactive-log">
            <strong>Console Activity:</strong> {lastActionLog}
          </div>
        </div>
      </main>
    </div>
  );
}

export default MainPreviewApp;

const rootEl = document.getElementById('preview-root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(React.createElement(MainPreviewApp));
}

