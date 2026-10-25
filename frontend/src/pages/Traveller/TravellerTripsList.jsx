import { useState, useEffect, useMemo, useCallback } from 'react';
import Navbar from '../../components/Navbar/navbar.jsx';
import { formatCurrency } from '../../utils/checkoutUtils.js';
import { reconcileTripTracking, mapBackendTrip } from '../../utils/tripTrackingUtils.js';
import { apiRequest, getSavedUser } from '../../services/api.js';
// Production-safe fixture fallback when useFixtures is enabled without preview bundle
const sampleTripsList = [];
import TripLiveTrackerWidget from './TripLiveTrackerWidget.jsx';
import TravellerTripDetailsView from './TravellerTripDetailsView.jsx';
import TripGuidePanel from './TripGuidePanel.jsx';
import CancellationModal from '../../components/checkout/CancellationModal.jsx';
import './travellerTrips.css';


const DESTINATION_TRIP_IMAGES = {
  kerala: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&q=80&w=800',
  jaipur: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&q=80&w=800',
  goa: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&q=80&w=800',
  mumbai: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&q=80&w=800',
  delhi: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&q=80&w=800',
  udaipur: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800',
  defaultTrip: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=800',
};

function getTripImage(trip) {
  if (trip.itinerary?.day1?.hotel?.image) return trip.itinerary.day1.hotel.image;
  const loc = (trip.currentLocation || trip.itinerary?.day1?.hotel?.name || trip.id || '').toLowerCase();
  for (const [key, url] of Object.entries(DESTINATION_TRIP_IMAGES)) {
    if (loc.includes(key)) return url;
  }
  return DESTINATION_TRIP_IMAGES.defaultTrip;
}

/**
 * TravellerTripsList
 * Redesigned trips management and live tracking view for travellers.
 * Matches Xploreo Traveller Dashboard, Browse, and Bookings design system:
 * - Shared white & soft-slate backgrounds, teal-to-blue gradient accents
 * - Trip overview KPI metrics (Total Trips, Active & Ongoing, Completed, Total Value)
 * - Status filter tabs with dynamic counts derived from real data
 * - Rich trip cards with destination thumbnail, live pulse tracker, and details trigger
 * - Preserves live REST polling, monotonic tracking reconciliation, and auth isolation.
 */
export default function TravellerTripsList({
  user,
  showNavbar = true,
  trips: propTrips,
  isLoading: propIsLoading,
  error: propError,
  onRetry: propOnRetry,
  onPollRefresh: propOnPollRefresh,
  pollIntervalMs = 10000,
  currentTravellerId,
  useFixtures = false,
}) {
  const effectiveUser = user || {
    name: 'Anjali Sharma',
    username: 'Anjali Sharma',
    role: 'traveller',
    userId: currentTravellerId || 'T001',
  };

  const [liveTrips, setLiveTrips] = useState([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState(null);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [cancellingTrip, setCancellingTrip] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [reviewedTripIds, setReviewedTripIds] = useState(new Set());


  // Load reviews to track which completed trips already have a review
  useEffect(() => {
    if (useFixtures) return;
    let isCancelled = false;
    async function loadReviewed() {
      try {
        const data = await apiRequest('/reviews');
        const list = Array.isArray(data) ? data : data?.data || [];
        if (!isCancelled) {
          const ids = new Set(list.map((r) => r.tripId).filter(Boolean));
          setReviewedTripIds(ids);
        }
      } catch {
        // ignore error silently
      }
    }
    loadReviewed();
    return () => {
      isCancelled = true;
    };
  }, [useFixtures]);

  const handleWriteReview = (trip) => {
    if (typeof window !== 'undefined') {
      window.location.href = `/Traveller/reviews?tripId=${encodeURIComponent(trip.id)}`;
    }
  };

  // Tabs and keyword search
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Filter tabs logic
  const filteredTrips = authorizedTrips.filter((trip) => {
    const isOngoingOrUpcoming = trip.trackingStatus === 'ongoing' || trip.status === 'started' || trip.status === 'confirmed' || trip.trackingStatus === 'not_started';
    const isCompleted = trip.status === 'completed' || trip.trackingStatus === 'completed';
    const isCancelled = trip.status === 'cancelled';

    let tabMatch = true;
    if (activeTab === 'UPCOMING') tabMatch = isOngoingOrUpcoming;
    else if (activeTab === 'COMPLETED') tabMatch = isCompleted;
    else if (activeTab === 'CANCELLED') tabMatch = isCancelled;

    const query = searchQuery.trim().toLowerCase();
    const title = (trip.itinerary?.day1?.hotel?.name || trip.id || '').toLowerCase();
    const loc = (trip.currentLocation || '').toLowerCase();
    const stop = (trip.currentStop || '').toLowerCase();
    const plan = (trip.planId || '').toLowerCase();

    const searchMatch = !query || title.includes(query) || loc.includes(query) || stop.includes(query) || plan.includes(query);

    return tabMatch && searchMatch;
  });

  // Derived counts from real returned data
  const upcomingCount = authorizedTrips.filter(t => t.trackingStatus === 'ongoing' || t.status === 'started' || t.status === 'confirmed' || t.trackingStatus === 'not_started').length;
  const completedCount = authorizedTrips.filter(t => t.status === 'completed' || t.trackingStatus === 'completed').length;
  const cancelledCount = authorizedTrips.filter(t => t.status === 'cancelled').length;
  const totalAmountSum = authorizedTrips.reduce((sum, t) => sum + (Number(t.totalAmount) || 0), 0);
  const ongoingTripsCount = authorizedTrips.filter(t => t.trackingStatus === 'ongoing' || t.status === 'started').length;

  if (selectedTrip) {
    return (
      <div className="trav-trips-page-wrapper">
        {showNavbar && (
          <Navbar user={effectiveUser} />
        )}
        <div className="trav-trips-page" data-testid="traveller-trip-details-page">
          <TravellerTripDetailsView
            trip={selectedTrip}
            onBack={() => setSelectedTripId(null)}
            onManualRefresh={handleManualRefresh}
            isRefreshing={isRefreshing || detailsLoading}
            onCancelClick={(t) => setCancellingTrip(t)}
            onTripUpdated={refreshLiveTrips}
          />
          {cancellingTrip && (
            <CancellationModal
              isOpen={!!cancellingTrip}
              booking={cancellingTrip}
              bookingType="trip"
              onClose={() => setCancellingTrip(null)}
              onSuccess={() => {
                refreshLiveTrips();
              }}
            />
          )}
        </div>
      </div>
    );
  }


  return (
    <div className="trav-trips-page-wrapper">
      {showNavbar && (
        <Navbar user={effectiveUser} />
      )}

      <div className="trav-trips-page" data-testid="traveller-trips-page">
        {/* ── 1. Page Header Banner ── */}
        <header className="trav-trips-header">
          <div className="trav-trips-header-content">
            <div className="trav-trips-icon-badge" aria-hidden="true">
              🧭
            </div>
            <div>
              <p className="trav-page-eyebrow">Traveller Portal</p>
              <h1 className="trav-trips-title">My Trips & Live Tracking</h1>
              <p className="trav-trips-subtitle">
                Track real-time trip progress, check-in stops, and daily itineraries.
              </p>
            </div>
          </div>

          <div className="trav-trips-user-badge">
            <div className="trav-trips-avatar">
              {(effectiveUser.name || effectiveUser.username || 'T').charAt(0).toUpperCase()}
            </div>
            <div className="trav-trips-user-info">
              <span className="trav-trips-username">{effectiveUser.name || effectiveUser.username}</span>
              <span className="trav-trips-role-tag">Traveller</span>
            </div>
          </div>
        </header>

        {/* ── 2. Trip Summary Metrics Cards ── */}
        {authorizedTrips.length > 0 && (
          <section className="trav-trips-kpi-row" aria-label="Trips Overview Metrics">
            <div className="trav-trips-kpi-card">
              <div className="trav-kpi-icon-wrap kpi-blue">🗺️</div>
              <div className="trav-kpi-data">
                <span className="trav-kpi-val">{authorizedTrips.length}</span>
                <span className="trav-kpi-lbl">Total Journeys</span>
              </div>
            </div>

            <div className="trav-trips-kpi-card">
              <div className="trav-kpi-icon-wrap kpi-green">
                <span className="trav-live-pulse-dot" style={{ display: ongoingTripsCount > 0 ? 'inline-block' : 'none' }} />
                <span>⚡</span>
              </div>
              <div className="trav-kpi-data">
                <span className="trav-kpi-val">{ongoingTripsCount}</span>
                <span className="trav-kpi-lbl">Active & Ongoing</span>
              </div>
            </div>

            <div className="trav-trips-kpi-card">
              <div className="trav-kpi-icon-wrap kpi-teal">✓</div>
              <div className="trav-kpi-data">
                <span className="trav-kpi-val">{completedCount}</span>
                <span className="trav-kpi-lbl">Completed</span>
              </div>
            </div>

            <div className="trav-trips-kpi-card">
              <div className="trav-kpi-icon-wrap kpi-amber">₹</div>
              <div className="trav-kpi-data">
                <span className="trav-kpi-val">{formatCurrency(totalAmountSum)}</span>
                <span className="trav-kpi-lbl">Total Booked Value</span>
              </div>
            </div>
          </section>
        )}

        {/* ── 3. Tabs & Search Toolbar ── */}
        <section className="trav-trips-controls-card" aria-label="Filter Trips">
          <div className="trav-trips-tabs" role="tablist" aria-label="Filter trips by status">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'ALL'}
              className={`trav-tab-btn ${activeTab === 'ALL' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('ALL')}
            >
              <span>All Trips</span>
              <span className="trav-tab-count">{authorizedTrips.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'UPCOMING'}
              className={`trav-tab-btn ${activeTab === 'UPCOMING' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('UPCOMING')}
            >
              <span>Upcoming / Ongoing</span>
              <span className="trav-tab-count">{upcomingCount}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'COMPLETED'}
              className={`trav-tab-btn ${activeTab === 'COMPLETED' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('COMPLETED')}
            >
              <span>Completed</span>
              <span className="trav-tab-count">{completedCount}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'CANCELLED'}
              className={`trav-tab-btn ${activeTab === 'CANCELLED' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('CANCELLED')}
            >
              <span>Cancelled</span>
              <span className="trav-tab-count">{cancelledCount}</span>
            </button>
          </div>

          <div className="trav-trips-search-box">
            <span className="trav-search-icon" aria-hidden="true">🔍</span>
            <input
              type="search"
              className="trav-search-input"
              placeholder="Search by destination, hotel, or plan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search trips"
            />
            {searchQuery && (
              <button
                type="button"
                className="trav-search-clear-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </section>

        {/* ── 4. Loading State ── */}
        {activeLoading && (
          <div className="trav-loading-container" role="status" aria-label="Loading trips">
            <div className="trav-skeleton-card" />
            <div className="trav-skeleton-card" />
          </div>
        )}

        {/* ── 5. Error State ── */}
        {!activeLoading && activeError && (
          <div className="trav-state-error" role="alert">
            <div className="trav-error-icon" aria-hidden="true">⚠️</div>
            <h3>Failed to load trips</h3>
            <p>{typeof activeError === 'string' ? activeError : activeError.message || 'An unexpected error occurred.'}</p>
            <button type="button" className="trav-btn-retry" onClick={handleRetry}>
              Try Again
            </button>
          </div>
        )}

        {/* ── 6. Empty State ── */}
        {!activeLoading && !activeError && filteredTrips.length === 0 && (
          <div className="trav-state-empty" data-testid="traveller-trips-empty-state">
            <div className="trav-empty-icon" aria-hidden="true">🧭</div>
            <h3>No trips scheduled yet</h3>
            <p>
              {searchQuery || activeTab !== 'ALL'
                ? 'No trips match your current filter criteria. Try resetting the status tab or search filter.'
                : 'You do not have any planned or ongoing journeys. When a customized tour plan is booked, live tracking will appear right here.'}
            </p>
            {(searchQuery || activeTab !== 'ALL') && (
              <button
                type="button"
                className="trav-btn-reset-filters"
                onClick={() => {
                  setSearchQuery('');
                  setActiveTab('ALL');
                }}
              >
                Reset Filter
              </button>
            )}
          </div>
        )}

        {/* ── 7. Populated State ── */}
        {!activeLoading && !activeError && filteredTrips.length > 0 && (
          <div className="trav-trips-grid-wrap" data-testid="traveller-trips-grid">
            {filteredTrips.map((trip) => {
              const isOngoing = trip.trackingStatus === 'ongoing';
              const isCompleted = trip.status === 'completed' || trip.trackingStatus === 'completed';
              const hasReviewed = reviewedTripIds.has(trip.id);
              const cardImage = getTripImage(trip);
              const tripTitle = trip.itinerary?.day1?.hotel?.name
                ? `Journey via ${trip.itinerary.day1.hotel.name}`
                : `Custom Trip Package #${trip.id}`;

              return (
                <article
                  key={trip.id}
                  className={`trav-trip-card ${isOngoing ? 'is-active-trip' : ''}`}
                  data-testid={`trip-card-${trip.id}`}
                >
                  <div className="trav-trip-card-main-row">
                    {/* Destination Media */}
                    <div className="trav-trip-card-media">
                      <img
                        src={cardImage}
                        alt={tripTitle}
                        className="trav-trip-card-img"
                        loading="lazy"
                      />
                      <span className="trav-trip-dest-tag">
                        📍 {trip.currentLocation || 'India'}
                      </span>
                    </div>

                    {/* Trip Info Block */}
                    <div className="trav-trip-card-body">
                      <div className="trav-trip-badge-group">
                        <span className="trav-booking-id">#{trip.id}</span>
                        <span className={`trav-status-badge ${trip.status === 'rejected_by_guide' ? 'is-warning' : trip.status === 'pending_guide_confirm' ? 'is-pending' : trip.status === 'cancelled' ? 'is-cancelled' : 'is-confirmed'}`}>
                          {trip.status === 'rejected_by_guide'
                            ? 'GUIDE NEEDED'
                            : trip.status === 'pending_guide_confirm'
                              ? 'AWAITING GUIDE'
                              : (trip.status || 'draft').toUpperCase()}
                        </span>
                        {trip.status === 'cancelled' && trip.refundStatus && (
                          <span
                            className={`trav-refund-pill is-${trip.refundStatus.toLowerCase()}`}
                            title={`Refund Reference: ${trip.refundReference || 'N/A'}`}
                          >
                            {trip.refundStatus === 'SUCCESS' && '✓ Refunded '}
                            {trip.refundStatus === 'FAILED' && '✕ Refund Failed '}
                            {trip.refundStatus === 'NOT_ELIGIBLE' && '• Ineligible '}
                            {trip.refundStatus === 'PENDING' && '⏳ Processing '}
                            {trip.refundAmount ? `₹${trip.refundAmount}` : ''}
                          </span>
                        )}
                        {isOngoing && (
                          <span className="trav-live-indicator">
                            <span className="trav-live-pulse-dot" aria-hidden="true" />
                            Live Active
                          </span>
                        )}
                      </div>

                      <h3 className="trav-trip-title">{tripTitle}</h3>

                      <div className="trav-trip-meta-row">
                        <span className="trav-meta-item">
                          <span className="trav-meta-icon" aria-hidden="true">🗺️</span>
                          Plan: {trip.planId}
                        </span>
                        <span className="trav-meta-item">
                          <span className="trav-meta-icon" aria-hidden="true">💳</span>
                          Total: {formatCurrency(trip.totalAmount)}
                        </span>
                        {trip.guideId && trip.status !== 'rejected_by_guide' && (
                          <span className="trav-meta-item">
                            <span className="trav-meta-icon" aria-hidden="true">🧑‍🌾</span>
                            {trip.status === 'confirmed' || trip.status === 'started' || trip.status === 'completed' ? 'Guide' : 'Guide requested'}: {trip.guideName || `#${trip.guideId}`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Block */}
                    <div className="trav-trip-action-block">
                      <button
                        type="button"
                        className="trav-btn-view-details"
                        onClick={() => handleSelectTrip(trip.id)}
                        aria-label={`View live tracking for trip ${trip.id}`}
                      >
                        View Details & Itinerary
                      </button>
                      {trip.status === 'confirmed' && (
                        <button
                          type="button"
                          className="trav-btn-cancel-trigger"
                          onClick={() => setCancellingTrip(trip)}
                          aria-label={`Cancel trip ${trip.id}`}
                          style={{ marginTop: '0.4rem', width: '100%' }}
                        >
                          Cancel Trip
                        </button>
                      )}
                      {isCompleted && (
                        hasReviewed ? (
                          <button
                            type="button"
                            className="trav-btn-reviewed"
                            disabled
                            aria-label={`Review already submitted for trip ${trip.id}`}
                          >
                            ✓ Reviewed
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="trav-btn-write-review"
                            onClick={() => handleWriteReview(trip)}
                            aria-label={`Write a review for completed trip ${trip.id}`}
                          >
                            Write a Review
                          </button>
                        )
                      )}
                    </div>
                  </div>


                  <TripGuidePanel trip={trip} onChanged={refreshLiveTrips} />

                  {/* Visual Timeline & Live Progress Bar Component */}
                  <div className="trav-trip-card-tracking-section">
                    <TripLiveTrackerWidget
                      currentDay={trip.currentDay}
                      currentStop={trip.currentStop}
                      currentLocation={trip.currentLocation}
                      trackingStatus={trip.trackingStatus}
                      progressPercentage={trip.progressPercentage}
                      lastUpdatedAt={trip.lastUpdatedAt}
                      isLive={isOngoing}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Cancellation Modal for Trips */}
        {cancellingTrip && (
          <CancellationModal
            isOpen={!!cancellingTrip}
            booking={cancellingTrip}
            bookingType="trip"
            onClose={() => setCancellingTrip(null)}
            onSuccess={() => {
              refreshLiveTrips();
            }}
          />
        )}
      </div>
    </div>
  );
}


