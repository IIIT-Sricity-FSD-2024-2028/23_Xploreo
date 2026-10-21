import { useState } from 'react';
import { formatCurrency, formatDate } from '../../utils/checkoutUtils.js';
import { retryTripRefund } from '../../services/tripGuides.api.js';
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

  const handleRetryRefund = async () => {
    setRetrying(true);
    setRetryMessage(null);
    try {
      const res = await retryTripRefund(id);
      setRetryMessage({ type: 'success', text: `Refund retried: ${res.refund?.status || res.refundStatus || 'Success'}` });
      if (onTripUpdated) {
        onTripUpdated();
      }
    } catch (err) {
      setRetryMessage({ type: 'error', text: err?.message || 'Failed to retry refund.' });
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
            Plan ID: {planId} · Status: <strong>{status.toUpperCase()}</strong>
          </span>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span className="trav-info-label">Total Amount</span>
          <p className="trav-card-price" style={{ margin: 0 }}>
            {formatCurrency(totalAmount)}
          </p>
          {isConfirmed && onCancelClick && (
            <button
              type="button"
              className="trav-btn-cancel-trigger"
              onClick={() => onCancelClick(trip)}
              style={{ marginTop: '0.5rem' }}
            >
              Cancel Trip Package
            </button>
          )}
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
