import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { formatCurrency, formatDate } from '../../utils/checkoutUtils.js';
import { getBookingCancellationEligibility } from '../../utils/bookingValidationUtils.js';
import { formatTripDates, extractTripDateRange } from '../../utils/tripTrackingUtils.js';
import { fetchNotifications } from '../../features/notificationsSlice.js';
import { retryTravellerTripRefund } from '../../store/traveller/index.js';
import TripLiveTrackerWidget from './TripLiveTrackerWidget.jsx';
import './travellerTrips.css';

/**
 * TravellerTripDetailsView
 * Detailed trip view displaying itinerary breakdown, guide assignment,
 * total package cost, embedded live tracker, and cancellation/refund breakdown.
 */
export default function TravellerTripDetailsView({
  trip,
  onBack,
  onManualRefresh,
  isRefreshing = false,
  onCancelClick,
  onTripUpdated,
}) {
  const dispatch = useDispatch();
  const [retrying, setRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState(null);

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
    cancelledAt,
    cancellationReason,
    cancellationPolicyNote,
    refundStatus,
    refundAmount,
    refundReference,
  } = trip;

  const isOngoing = trackingStatus === 'ongoing';
  const isCancelled = status === 'cancelled';
  const isConfirmed = status === 'confirmed';

  const travelDates =
    trip.travelDates ||
    formatTripDates(trip.startDate, trip.endDate) ||
    (() => {
      const range = extractTripDateRange(trip);
      return formatTripDates(range.startDate, range.endDate);
    })();

  const handleRetryRefund = async () => {
    setRetrying(true);
    setRetryMessage(null);
    try {
      const res = await dispatch(retryTravellerTripRefund(id)).unwrap();
      const result = res?.result;
      setRetryMessage({
        type: 'success',
        text: `Refund retried: ${result?.refund?.status || result?.refundStatus || 'Success'}`,
      });
      dispatch(fetchNotifications());
      if (onTripUpdated) {
        onTripUpdated();
      }
    } catch (err) {
      setRetryMessage({
        type: 'error',
        text: (typeof err === 'string' ? err : err?.message) || 'Failed to retry refund.',
      });
    } finally {
      setRetrying(false);
    }
  };

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
            {travelDates && (
              <span className="trav-trip-dates-detail" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#0f766e', fontWeight: 600, marginRight: '0.6rem' }} data-testid="trip-details-dates">
                <span aria-hidden="true">📅</span> {travelDates} ·
              </span>
            )}
            Plan ID: {planId} · Status: <strong>{status.toUpperCase()}</strong>
          </span>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span className="trav-info-label">Total Amount</span>
          <p className="trav-card-price" style={{ margin: 0 }}>
            {formatCurrency(totalAmount)}
          </p>
          {isConfirmed && onCancelClick && (() => {
            const tripEligibility = getBookingCancellationEligibility(trip, 'trip');
            return tripEligibility.canCancel ? (
              <button
                type="button"
                className="trav-btn-cancel-trigger"
                onClick={() => onCancelClick(trip)}
                style={{ marginTop: '0.5rem' }}
              >
                Cancel Trip Package
              </button>
            ) : (
              <div style={{ marginTop: '0.5rem', textAlign: 'right' }}>
                <button
                  type="button"
                  className="trav-btn-cancel-trigger is-disabled"
                  disabled
                  title={tripEligibility.message}
                  style={{ opacity: 0.55, cursor: 'not-allowed' }}
                >
                  Cancel Trip Package
                </button>
                <span className="trav-cancellation-expired-msg" style={{ display: 'block', color: '#dc2626', fontSize: '0.78rem', marginTop: '0.3rem' }}>
                  {tripEligibility.message}
                </span>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Cancellation & Honest Refund Breakdown */}
      {isCancelled && (
        <div className={`trav-cancellation-card ${refundStatus === 'NOT_ELIGIBLE' ? 'is-ineligible' : ''}`}>
          <div className="trav-cancellation-header">
            <h3 className="trav-cancellation-title">
              <span>✕</span> Trip Package Cancelled
            </h3>
            {refundStatus && (
              <span className={`trav-refund-pill is-${refundStatus.toLowerCase()}`}>
                Refund: {refundStatus} {refundAmount ? `(₹${refundAmount})` : ''}
              </span>
            )}
          </div>

          <div className="trav-cancellation-grid">
            <div className="trav-info-block">
              <span className="trav-info-label">Cancelled At</span>
              <span className="trav-info-val">{cancelledAt ? formatDate(cancelledAt) : 'Recently'}</span>
            </div>
            <div className="trav-info-block">
              <span className="trav-info-label">Cancellation Reason</span>
              <span className="trav-info-val">{cancellationReason || 'Traveller requested'}</span>
            </div>
            <div className="trav-info-block">
              <span className="trav-info-label">Refund Reference</span>
              <span className="trav-info-val" style={{ fontFamily: 'monospace' }}>
                {refundReference || 'N/A'}
              </span>
            </div>
            <div className="trav-info-block">
              <span className="trav-info-label">Refund Amount</span>
              <span className="trav-info-val" style={{ color: '#16a34a', fontWeight: 700 }}>
                {refundAmount ? `₹${refundAmount}` : (refundStatus === 'NOT_ELIGIBLE' ? '₹0 (Ineligible)' : '₹0')}
              </span>
            </div>
          </div>

          {cancellationPolicyNote && (
            <div className="trav-receipt-note" style={{ marginTop: '0.5rem' }}>
              <strong>Policy Applied:</strong> {cancellationPolicyNote}
            </div>
          )}

          {refundStatus === 'FAILED' && (
            <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                type="button"
                className="trav-btn-cancel-trigger"
                onClick={handleRetryRefund}
                disabled={retrying}
                style={{ borderColor: '#ef4444', color: '#ef4444' }}
              >
                {retrying ? 'Retrying Refund...' : '🔄 Retry Simulated Refund'}
              </button>
              {retryMessage && (
                <span style={{ fontSize: '0.85rem', color: retryMessage.type === 'success' ? '#16a34a' : '#ef4444' }}>
                  {retryMessage.text}
                </span>
              )}
            </div>
          )}

          <div className="trav-simulation-banner">
            <span>ℹ️</span>
            <div>
              <strong>Simulation Notice:</strong> All refund disbursements in this prototype are simulated. No actual payment gateway transactions or bank credits are executed.
            </div>
          </div>
        </div>
      )}


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
              <span className="trav-timeline-day">
                Day 1 Arrival {travelDates ? `(${travelDates})` : ''}
              </span>
              <h4 className="trav-timeline-title">
                {itinerary.day1.hotel?.name || 'Hotel Check-in & Transfer'}
              </h4>
              {itinerary.day1.hotel?.checkInDate && (
                <p className="trav-timeline-detail" style={{ marginTop: '0.15rem', color: '#0f766e', fontWeight: 600 }}>
                  📅 Stay: {formatTripDates(itinerary.day1.hotel.checkInDate, itinerary.day1.hotel.checkOutDate)}
                </p>
              )}
              {itinerary.day1.hotel?.hotelId && (
                <p className="trav-timeline-detail" style={{ marginBottom: 4 }}>
                  Hotel Status:{' '}
                  <strong>
                    {String(itinerary.day1.hotel?.status || 'planned').toUpperCase().replace('_', ' ')}
                  </strong>
                  {trip.hotelBookingId ? ` · Ref #${trip.hotelBookingId}` : ' · Awaiting NTA Dispatch'}
                </p>
              )}
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
                    {Array.isArray(dayItem.experiences) && dayItem.experiences.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '6px 0' }}>
                        {dayItem.experiences.map((exp, idx) => (
                          <span
                            key={`${exp.experienceId || idx}-${dayItem.dayNumber}`}
                            style={{
                              fontSize: 12,
                              padding: '2px 8px',
                              borderRadius: 999,
                              background:
                                exp.status === 'completed'
                                  ? '#dcfce7'
                                  : exp.status === 'cancelled'
                                    ? '#fee2e2'
                                    : exp.status === 'checked_in'
                                      ? '#dbeafe'
                                      : exp.status === 'confirmed'
                                        ? '#e0f2fe'
                                        : '#fef3c7',
                              color:
                                exp.status === 'completed'
                                  ? '#166534'
                                  : exp.status === 'cancelled'
                                    ? '#991b1b'
                                    : exp.status === 'checked_in'
                                      ? '#1e40af'
                                      : exp.status === 'confirmed'
                                        ? '#0369a1'
                                        : '#92400e',
                              fontWeight: 600,
                            }}
                          >
                            {exp.title}: {String(exp.status || 'planned').toUpperCase().replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="trav-timeline-detail">
                      Assigned Guide: {guideId && status !== 'rejected_by_guide' ? (trip.guideName || `Guide #${guideId}`) : 'Not assigned yet'}
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
