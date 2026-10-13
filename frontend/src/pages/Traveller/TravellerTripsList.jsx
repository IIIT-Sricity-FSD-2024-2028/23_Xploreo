import { useState, useEffect, useMemo, useCallback } from 'react';
import { formatCurrency } from '../../utils/checkoutUtils.js';
import { reconcileTripTracking, mapBackendTrip } from '../../utils/tripTrackingUtils.js';
import { apiRequest, getSavedUser } from '../../services/api.js';
import { sampleTripsList } from '../../preview/sampleData.js';
import TripLiveTrackerWidget from './TripLiveTrackerWidget.jsx';
import TravellerTripDetailsView from './TravellerTripDetailsView.jsx';
import './travellerTrips.css';

/**
 * TravellerTripsList
 * Manages traveller trips with live REST polling and strict backend-driven state:
 * - Real API integration via apiRequest('/trips/traveller/:travellerId')
 * - Single-trip detail synchronization via apiRequest('/trips/:id')
 * - Loading, Error, Empty, and Populated list states
 * - Automatic REST polling when an active trip is ongoing
 * - Window focus / online event listeners for immediate state reconciliation
 * - Out-of-order & stale response protection via reconcileTripTracking()
 * - Strictly does not fall back to mock data after a failed API call
 */
export default function TravellerTripsList({
  trips: propTrips,
  isLoading: propIsLoading,
  error: propError,
  onRetry: propOnRetry,
  onPollRefresh: propOnPollRefresh,
  pollIntervalMs = 10000,
  currentTravellerId,
  user,
  useFixtures = false,
}) {
  const [liveTrips, setLiveTrips] = useState([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState(null);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Resolve effective traveller ID from props or saved session
  const effectiveTravellerId = useMemo(() => {
    if (currentTravellerId) return String(currentTravellerId).trim();
    if (user?.userId) return String(user.userId).trim();
    if (user?.id) return String(user.id).trim();
    const saved = typeof getSavedUser === 'function' ? getSavedUser() : null;
    if (saved?.userId) return String(saved.userId).trim();
    if (saved?.id) return String(saved.id).trim();
    return '';
  }, [currentTravellerId, user]);

  // Fetch all trips for traveller via GET /trips/traveller/:travellerId
  const fetchLiveTrips = useCallback(async () => {
    if (propTrips !== undefined || useFixtures) return;

    if (!effectiveTravellerId) {
      setLiveError('Authentication required. Missing or invalid saved session.');
      setLiveTrips([]);
      return;
    }

    setLiveLoading(true);
    setLiveError(null);

    try {
      const rawData = await apiRequest(`/trips/traveller/${encodeURIComponent(effectiveTravellerId)}`);
      const mapped = Array.isArray(rawData) ? rawData.map(mapBackendTrip).filter(Boolean) : [];

      setLiveTrips((prevTrips) => {
        const prevMap = new Map((prevTrips || []).map((t) => [t.id, t]));
        return mapped.map((incoming) => {
          const existing = prevMap.get(incoming.id);
          return existing ? reconcileTripTracking(existing, incoming) : incoming;
        });
      });
      setLiveError(null);
    } catch (err) {
      setLiveError(err.message || 'Failed to load trips');
      // Strictly do not fall back to fixtures on error
      setLiveTrips([]);
    } finally {
      setLiveLoading(false);
    }
  }, [propTrips, useFixtures, effectiveTravellerId]);

  // Initial load when in live mode
  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      await Promise.resolve();
      if (!isCancelled && propTrips === undefined && !useFixtures) {
        await fetchLiveTrips();
      }
    };

    load();

    return () => {
      isCancelled = true;
    };
  }, [propTrips, useFixtures, fetchLiveTrips]);

  // Refresh function used by periodic polling and manual refresh button
  const refreshLiveTrips = useCallback(async () => {
    if (propOnPollRefresh) {
      await propOnPollRefresh();
      return;
    }

    if (propTrips !== undefined || useFixtures) return;
    if (!effectiveTravellerId) return;

    try {
      if (selectedTripId) {
        // Detail view is open: fetch specific trip to avoid duplicate polling
        const rawDetail = await apiRequest(`/trips/${encodeURIComponent(selectedTripId)}`);
        if (rawDetail) {
          const mappedDetail = mapBackendTrip(rawDetail);
          setLiveTrips((prevTrips) =>
            prevTrips.map((t) =>
              t.id === selectedTripId ? reconcileTripTracking(t, mappedDetail) : t
            )
          );
        }
      } else {
        // List view is open: poll all trips for traveller
        const rawData = await apiRequest(`/trips/traveller/${encodeURIComponent(effectiveTravellerId)}`);
        const mapped = Array.isArray(rawData) ? rawData.map(mapBackendTrip).filter(Boolean) : [];

        setLiveTrips((prevTrips) => {
          const prevMap = new Map((prevTrips || []).map((t) => [t.id, t]));
          return mapped.map((incoming) => {
            const existing = prevMap.get(incoming.id);
            return existing ? reconcileTripTracking(existing, incoming) : incoming;
          });
        });
      }
    } catch (err) {
      // Background poll failure preserves current state without regressions
      void err;
    }
  }, [propOnPollRefresh, propTrips, useFixtures, effectiveTravellerId, selectedTripId]);

  // Active trips dataset
  const activeTrips = propTrips !== undefined
    ? propTrips
    : (useFixtures ? sampleTripsList : liveTrips);

  const activeLoading = propIsLoading !== undefined
    ? propIsLoading
    : (useFixtures ? false : liveLoading);

  const activeError = propError !== undefined
    ? propError
    : (useFixtures ? null : liveError);

  // Compute reconciled trips derived cleanly
  const reconciledTrips = useMemo(() => {
    if (!activeTrips || activeTrips.length === 0) return [];
    return activeTrips.map((trip) => reconcileTripTracking(null, trip));
  }, [activeTrips]);

  // Strict ownership check (presentation guard; authoritative check is server-side)
  const authorizedTrips = effectiveTravellerId
    ? reconciledTrips.filter((t) => !t.travellerId || t.travellerId === effectiveTravellerId)
    : reconciledTrips;

  const selectedTrip = selectedTripId
    ? authorizedTrips.find((t) => t.id === selectedTripId) || activeTrips.find((t) => t.id === selectedTripId)
    : null;

  // Single polling & window focus/online listener setup
  useEffect(() => {
    let timer = null;

    const triggerRefresh = async () => {
      if (isRefreshing) return;
      setIsRefreshing(true);
      try {
        await refreshLiveTrips();
      } finally {
        setIsRefreshing(false);
      }
    };

    // Periodic polling only if an ongoing trip exists
    const hasOngoingTrip = selectedTrip
      ? (selectedTrip.trackingStatus === 'ongoing' || selectedTrip.status === 'started')
      : authorizedTrips.some((t) => t.trackingStatus === 'ongoing' || t.status === 'started');

    if (pollIntervalMs > 0 && hasOngoingTrip) {
      timer = setInterval(triggerRefresh, pollIntervalMs);
    }

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
  }, [pollIntervalMs, isRefreshing, refreshLiveTrips, selectedTrip, authorizedTrips]);

  // Drill down to detail view & fetch single trip details if in live mode
  const handleSelectTrip = useCallback(async (tripId) => {
    setSelectedTripId(tripId);

    if (propTrips === undefined && !useFixtures && tripId) {
      setDetailsLoading(true);
      try {
        const rawDetail = await apiRequest(`/trips/${encodeURIComponent(tripId)}`);
        if (rawDetail) {
          const mappedDetail = mapBackendTrip(rawDetail);
          setLiveTrips((prevTrips) => {
            const exists = prevTrips.some((t) => t.id === tripId);
            if (exists) {
              return prevTrips.map((t) =>
                t.id === tripId ? reconcileTripTracking(t, mappedDetail) : t
              );
            }
            return [...prevTrips, mappedDetail];
          });
        }
      } catch (err) {
        // Fall back cleanly to the trip already in list
        void err;
      } finally {
        setDetailsLoading(false);
      }
    }
  }, [propTrips, useFixtures]);

  const handleRetry = () => {
    if (typeof propOnRetry === 'function') {
      propOnRetry();
    } else if (propTrips === undefined && !useFixtures) {
      fetchLiveTrips();
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshLiveTrips();
    } finally {
      setIsRefreshing(false);
    }
  };

  if (selectedTrip) {
    return (
      <div className="trav-trips-page">
        <TravellerTripDetailsView
          trip={selectedTrip}
          onBack={() => setSelectedTripId(null)}
          onManualRefresh={handleManualRefresh}
          isRefreshing={isRefreshing || detailsLoading}
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
      {activeLoading && (
        <div className="trav-loading-container" role="status" aria-label="Loading trips">
          <div className="trav-skeleton-card" />
          <div className="trav-skeleton-card" />
        </div>
      )}

      {/* Error State */}
      {!activeLoading && activeError && (
        <div className="trav-state-error" role="alert">
          <h3>Failed to load trips</h3>
          <p>{typeof activeError === 'string' ? activeError : activeError.message || 'An unexpected error occurred.'}</p>
          <button type="button" className="trav-btn-retry" onClick={handleRetry}>
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!activeLoading && !activeError && authorizedTrips.length === 0 && (
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
      {!activeLoading && !activeError && authorizedTrips.length > 0 && (
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
                        {(trip.status || 'draft').toUpperCase()}
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
                    onClick={() => handleSelectTrip(trip.id)}
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
