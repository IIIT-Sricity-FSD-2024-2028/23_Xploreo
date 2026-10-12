import { formatCurrency } from '../../utils/checkoutUtils.js';
import TripLiveTrackerWidget from './TripLiveTrackerWidget.jsx';
import './travellerTrips.css';

/**
 * TravellerTripDetailsView
 * Detailed trip view displaying itinerary breakdown, guide assignment,
 * total package cost, and embedded live tracker.
 */
export default function TravellerTripDetailsView({
  trip,
  onBack,
  onManualRefresh,
  isRefreshing = false,
}) {
  if (!trip) {
    return (
      <div className="trav-state-empty">
        <div className="trav-empty-icon" aria-hidden="true">🗺️</div>
        <h3>Trip Not Found</h3>
        <p>The requested trip details could not be found or you are not authorized to view it.</p>
        {onBack && (
          <button type="button" className="trav-btn-view-details" onClick={onBack}>
            Return to Trips
          </button>
        )}
      </div>
    );
  }

  const {
    id,
    planId,
    guideId,
    status = 'draft',
    totalAmount = 0,
    currentDay = 1,
    currentStop = 'Not started',
    currentLocation = 'Origin',
    trackingStatus = 'not_started',
    progressPercentage = 0,
    lastUpdatedAt = null,
    itinerary = {},
  } = trip;

  const isOngoing = trackingStatus === 'ongoing';

  return (
    <div className="trav-trip-details-container" data-testid="traveller-trip-details-view">
      {onBack && (
        <div className="trav-back-nav">
          <button type="button" className="trav-back-btn" onClick={onBack}>
            <span aria-hidden="true">←</span> Back to Trips List
          </button>
        </div>
      )}

      {/* Polling Refresh Control Strip */}
      <div className="trav-polling-bar">
        <span>Live REST Polling Active (Every 10s & on focus)</span>
        {onManualRefresh && (
          <button
            type="button"
            className="trav-btn-poll-refresh"
            onClick={onManualRefresh}
            disabled={isRefreshing}
          >
            <span>{isRefreshing ? 'Refreshing...' : '🔄 Refresh Now'}</span>
          </button>
        )}
      </div>

      <div className="trav-details-header">
        <div>
          <span className="trav-page-eyebrow">Trip Package #{id}</span>
          <h2 className="trav-trips-title" style={{ fontSize: '1.6rem' }}>
            Itinerary & Live Tracking
          </h2>
          <span className="trav-card-meta">
            Plan ID: {planId} · Status: <strong>{status.toUpperCase()}</strong>
          </span>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span className="trav-info-label">Total Amount</span>
          <p className="trav-card-price" style={{ margin: 0 }}>
            {formatCurrency(totalAmount)}
          </p>
        </div>
      </div>

      {/* Embedded Live Tracking Widget */}
      <div style={{ margin: '1.5rem 0' }}>
        <TripLiveTrackerWidget
          currentDay={currentDay}
          currentStop={currentStop}
          currentLocation={currentLocation}
          trackingStatus={trackingStatus}
          progressPercentage={progressPercentage}
          lastUpdatedAt={lastUpdatedAt}
          isLive={isOngoing}
        />
      </div>

      {/* Itinerary Timeline */}
      <div>
        <h3 className="trav-page-eyebrow" style={{ marginTop: '2rem' }}>
          Structured Day-by-Day Itinerary
        </h3>

        {/* Day 1 Transport / Hotel */}
        {itinerary.day1 && (
          <div className="trav-itinerary-timeline">
            <div className={`trav-timeline-node ${currentDay === 1 ? 'is-active' : ''}`}>
              <div className="trav-timeline-dot" aria-hidden="true" />
              <span className="trav-timeline-day">Day 1 Arrival</span>
              <h4 className="trav-timeline-title">
                {itinerary.day1.hotel?.name || 'Hotel Check-in & Transfer'}
              </h4>
              <p className="trav-timeline-detail">
                Transport: {itinerary.day1.transport?.provider || 'Standard'} (
                {itinerary.day1.transport?.pickupLocation || 'Pickup'} →{' '}
                {itinerary.day1.transport?.dropoffLocation || 'Drop-off'})
              </p>
            </div>

            {/* Subsequent Days */}
            {itinerary.days &&
              itinerary.days.map((dayItem) => {
                const isDayActive = currentDay === dayItem.dayNumber;

                return (
                  <div
                    key={dayItem.dayNumber}
                    className={`trav-timeline-node ${isDayActive ? 'is-active' : ''}`}
                  >
                    <div className="trav-timeline-dot" aria-hidden="true" />
                    <span className="trav-timeline-day">Day {dayItem.dayNumber}</span>
                    <h4 className="trav-timeline-title">
                      {dayItem.experiences && dayItem.experiences.length > 0
                        ? dayItem.experiences.map((exp) => exp.title).join(', ')
                        : 'Scheduled Sightseeing & Activities'}
                    </h4>
                    <p className="trav-timeline-detail">
                      Assigned Guide: {guideId ? `Guide #${guideId}` : 'Unassigned / Self-guided'}
                    </p>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
