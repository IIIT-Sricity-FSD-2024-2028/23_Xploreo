import { useState, useEffect, useMemo } from 'react';
import { formatCurrency } from '../../utils/checkoutUtils.js';
import { reconcileTripTracking } from '../../utils/tripTrackingUtils.js';
import TripLiveTrackerWidget from './TripLiveTrackerWidget.jsx';
import TravellerTripDetailsView from './TravellerTripDetailsView.jsx';
import './travellerTrips.css';

/**
 * TravellerTripsList
 * Manages traveller trips with live REST polling and strict backend-driven state:
 * - Loading, Error, Empty, and Populated list states
 * - Automatic REST polling when an active trip is ongoing
 * - Window focus / online event listeners for immediate state reconciliation
 * - Out-of-order & stale response protection via reconcileTripTracking()
 * - Drill-down to TravellerTripDetailsView
 */
export default function TravellerTripsList({
  trips = [],
  isLoading = false,
  error = null,
  onRetry,
  onPollRefresh,
  pollIntervalMs = 10000,
  currentTravellerId,
}) {
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Compute reconciled trips derived cleanly without cascading setState effects
  const reconciledTrips = useMemo(() => {
    if (!trips || trips.length === 0) return [];
    return trips.map((trip) => reconcileTripTracking(null, trip));
  }, [trips]);

  // REST Polling & Window Focus / Online listener setup
  useEffect(() => {
    let timer = null;

    const triggerRefresh = async () => {
      if (onPollRefresh && !isRefreshing) {
        setIsRefreshing(true);
        try {
          await onPollRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }
    };

    // Periodic polling only if there are trips and onPollRefresh provided
    if (onPollRefresh && pollIntervalMs > 0) {
      timer = setInterval(triggerRefresh, pollIntervalMs);
    }

    // Refresh when user returns to tab / regains network connectivity
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerRefresh();
      }
    };

    const handleOnline = () => {
      triggerRefresh();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      if (timer) clearInterval(timer);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [onPollRefresh, pollIntervalMs, isRefreshing]);

  // Strict ownership check (presentation guard; authoritative check is server-side)
  const authorizedTrips = currentTravellerId
    ? reconciledTrips.filter((t) => t.travellerId === currentTravellerId)
    : reconciledTrips;

  const selectedTrip = selectedTripId
    ? authorizedTrips.find((t) => t.id === selectedTripId)
    : null;

  if (selectedTrip) {
    return (
      <div className="trav-trips-page">
        <TravellerTripDetailsView
          trip={selectedTrip}
          onBack={() => setSelectedTripId(null)}
          onManualRefresh={onPollRefresh}
          isRefreshing={isRefreshing}
        />
      </div>
    );
  }

  return (
    <div className="trav-trips-page" data-testid="traveller-trips-page">
      <div className="trav-trips-header">
        <p className="trav-page-eyebrow">Traveller Portal</p>
        <h1 className="trav-trips-title">My Trips & Live Tracking</h1>
        <p className="trav-trips-subtitle">
          Track real-time trip progress, check-in stops, and daily itineraries.
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="trav-loading-container" role="status" aria-label="Loading trips">
          <div className="trav-skeleton-card" />
          <div className="trav-skeleton-card" />
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="trav-state-error" role="alert">
          <h3>Failed to load trips</h3>
          <p>{typeof error === 'string' ? error : error.message || 'An unexpected error occurred.'}</p>
          {onRetry && (
            <button type="button" className="trav-btn-retry" onClick={onRetry}>
              Try Again
            </button>
          )}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && authorizedTrips.length === 0 && (
        <div className="trav-state-empty" data-testid="traveller-trips-empty-state">
          <div className="trav-empty-icon" aria-hidden="true">🧭</div>
          <h3>No trips scheduled yet</h3>
          <p>
            You do not have any planned or ongoing journeys. When a customized tour plan is booked,
            live tracking will appear right here.
          </p>
        </div>
      )}

      {/* Populated State */}
      {!isLoading && !error && authorizedTrips.length > 0 && (
        <div data-testid="traveller-trips-grid">
          {authorizedTrips.map((trip) => {
            const isOngoing = trip.trackingStatus === 'ongoing';

            return (
              <article
                key={trip.id}
                className="trav-trip-card"
                data-testid={`trip-card-${trip.id}`}
              >
                <div className="trav-trip-card-header">
                  <div>
                    <div className="trav-trip-badge-group">
                      <span className="trav-booking-id">#{trip.id}</span>
                      <span className="trav-status-badge is-confirmed">
                        {trip.status.toUpperCase()}
                      </span>
                    </div>

                    <h3 className="trav-trip-title">
                      {trip.itinerary?.day1?.hotel?.name
                        ? `Journey via ${trip.itinerary.day1.hotel.name}`
                        : `Custom Trip Package #${trip.id}`}
                    </h3>

                    <div className="trav-trip-meta-row">
                      <span>Plan: {trip.planId}</span>
                      <span>Total: {formatCurrency(trip.totalAmount)}</span>
                      {trip.guideId && <span>Guide Assigned: #{trip.guideId}</span>}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="trav-btn-view-details"
                    onClick={() => setSelectedTripId(trip.id)}
                    aria-label={`View live tracking for trip ${trip.id}`}
                  >
                    View Details & Itinerary
                  </button>
                </div>

                {/* Live Tracker progress bar directly on card */}
                <TripLiveTrackerWidget
                  currentDay={trip.currentDay}
                  currentStop={trip.currentStop}
                  currentLocation={trip.currentLocation}
                  trackingStatus={trip.trackingStatus}
                  progressPercentage={trip.progressPercentage}
                  lastUpdatedAt={trip.lastUpdatedAt}
                  isLive={isOngoing}
                />
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
