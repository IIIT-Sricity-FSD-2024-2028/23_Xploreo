import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { BookingSummaryCard } from '../../components/checkout/index.js';
import { formatDate } from '../../utils/checkoutUtils.js';
import { getBookingCancellationEligibility } from '../../utils/bookingValidationUtils.js';
import { confirmExperienceBookingEnd, retryBookingRefund } from '../../features/bookingsSlice.js';
import { fetchNotifications } from '../../features/notificationsSlice.js';
import './travellerBookings.css';

/**
 * BookingDetailsView
 * Renders full booking breakdown for an authorized traveller.
 * Reuses BookingSummaryCard from Day 1 for consistent presentation.
 * Displays cancellation and honest refund tracking data when cancelled.
 */
export default function BookingDetailsView({
  booking,
  onBack,
  onCancelClick,
  onBookingUpdated,
}) {
  const dispatch = useDispatch();
  const [retrying, setRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState(null);

  if (!booking) {
    return (
      <div className="trav-state-empty">
        <div className="trav-empty-icon" aria-hidden="true">🔍</div>
        <h3>Booking Not Found</h3>
        <p>The requested booking could not be located or you are not authorized to view it.</p>
        {onBack && (
          <button type="button" className="trav-btn-view-details" onClick={onBack}>
            Return to Bookings
          </button>
        )}
      </div>
    );
  }


  const isHotel = !!booking.hotel || booking.bookingType === 'hotel';
  const isDemo = !!booking.isDemo || booking.source === 'mock';

  const {
    id,
    guestName,
    email,
    phone,
    date,
    checkIn,
    checkOut,
    roomType,
    guests,
    participants,
    totalAmount,
    status = 'CONFIRMED',
    createdAt,
    experience = {},
    hotel = {},
  } = booking;

  // Compute dates and counts for card formatting
  const effectiveGuests = isHotel ? (guests || 1) : (participants || 1);
  const effectiveDate = isHotel
    ? (checkIn ? `${formatDate(checkIn)} - ${formatDate(checkOut)}` : 'Dates not specified')
    : date;

  // Format booking for reuse with Day 1 BookingSummaryCard
  const cardBooking = {
    title: isHotel ? (hotel.name || 'Hotel Reservation') : (experience.title || 'Experience Booking'),
    type: isHotel ? 'hotel' : 'experience',
    location: isHotel
      ? (hotel.city ? `${hotel.city}${hotel.address ? ` (${hotel.address})` : ''}` : 'India')
      : (experience.destination || 'India'),
    date: effectiveDate,
    guestCount: effectiveGuests,
    imageUrl: (isHotel ? hotel.image : experience.image) || null,
  };

  const cardPricing = {
    basePrice: isHotel
      ? (hotel.pricePerNight || (totalAmount ? totalAmount / effectiveGuests : 0))
      : (experience.price || (totalAmount ? totalAmount / effectiveGuests : 0)),
    guestCount: effectiveGuests,
    taxesAndFees: isHotel ? (hotel.taxesAndFees || 0) : 0,
    subtotal: totalAmount || 0,
    total: totalAmount || 0,
  };

  const isConfirmed = status.toUpperCase() === 'CONFIRMED';
  const isCancelled = status.toUpperCase() === 'CANCELLED';
  const isEndRequested = status.toUpperCase() === 'END_REQUESTED';
  const isCompleted = status.toUpperCase() === 'COMPLETED';

  const handleConfirmEnd = async () => {
    setConfirming(true);
    setConfirmMessage(null);
    try {
      await dispatch(confirmExperienceBookingEnd(id)).unwrap();
      setConfirmMessage({
        type: 'success',
        text: 'Experience concluded and confirmed! Booking is now marked completed for both sides.',
      });
      dispatch(fetchNotifications());
      if (onBookingUpdated) {
        onBookingUpdated();
      }
    } catch (err) {
      setConfirmMessage({
        type: 'error',
        text: (typeof err === 'string' ? err : err?.message) || 'Failed to confirm end request.',
      });
    } finally {
      setConfirming(false);
    }
  };

  const handleRetryRefund = async () => {
    setRetrying(true);
    setRetryMessage(null);
    try {
      const res = await dispatch(
        retryBookingRefund({ id, bookingType: isHotel ? 'hotel' : 'experience' }),
      ).unwrap();
      const result = res?.result;
      setRetryMessage({
        type: 'success',
        text: `Refund retried: ${result?.refund?.status || result?.refundStatus || 'Success'}`,
      });
      dispatch(fetchNotifications());
      if (onBookingUpdated) {
        onBookingUpdated();
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
    <div className="trav-details-view" data-testid="traveller-booking-details-view">
      {onBack && (
        <div className="trav-back-nav">
          <button type="button" className="trav-back-btn" onClick={onBack}>
            <span aria-hidden="true">←</span> Back to My Bookings
          </button>
        </div>
      )}

      <div className="trav-details-header">
        <div>
          <span className="trav-page-eyebrow">
            {isHotel ? 'Hotel Booking Reference' : 'Booking Reference'}
          </span>
          <h2 className="trav-card-title" style={{ fontSize: '1.5rem' }}>
            #{id}
          </h2>
          <span className="trav-card-meta">
            Booked on {formatDate(createdAt || checkIn || date)}
          </span>
        </div>

        <div className="trav-card-badge-row" style={{ alignItems: 'center' }}>
          {isDemo && (
            <span
              className="trav-status-badge"
              style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}
            >
              Demo Data
            </span>
          )}
          <span
            className={`trav-status-badge ${
              isConfirmed
                ? 'is-confirmed'
                : isCompleted
                ? 'is-completed'
                : isCancelled
                ? 'is-cancelled'
                : isEndRequested
                ? 'is-end-requested'
                : 'is-pending'
            }`}
          >
            {isEndRequested ? 'End Requested' : status}
          </span>
          {isEndRequested && (
            <button
              type="button"
              className="trav-btn-confirm-end"
              onClick={handleConfirmEnd}
              disabled={confirming}
              style={{ marginLeft: '8px' }}
            >
              {confirming ? 'Ending...' : '✓ Accept & Confirm End'}
            </button>
          )}
          {isConfirmed && onCancelClick && (() => {
            const cancellationEligibility = getBookingCancellationEligibility(
              booking,
              isHotel ? 'hotel' : 'experience'
            );
            return cancellationEligibility.canCancel ? (
              <button
                type="button"
                className="trav-btn-cancel-trigger"
                onClick={() => onCancelClick(booking)}
                style={{ marginLeft: '8px' }}
              >
                Cancel Reservation
              </button>
            ) : (
              <div style={{ display: 'inline-block', marginLeft: '8px', verticalAlign: 'top', textAlign: 'right' }}>
                <button
                  type="button"
                  className="trav-btn-cancel-trigger is-disabled"
                  disabled
                  title={cancellationEligibility.message}
                  style={{ opacity: 0.55, cursor: 'not-allowed' }}
                >
                  Cancel Reservation
                </button>
                <span className="trav-cancellation-expired-msg" style={{ display: 'block', color: '#dc2626', fontSize: '0.78rem', marginTop: '0.3rem' }}>
                  {cancellationEligibility.message}
                </span>
              </div>
            );
          })()}
        </div>
      </div>

      {/* End Request Confirmation Banner */}
      {isEndRequested && (
        <div className="trav-end-request-card" data-testid="traveller-end-request-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#166534', fontWeight: '700', fontSize: '1rem' }}>
                <span aria-hidden="true">🏁</span> Host Requested End of Experience
              </div>
              <p style={{ margin: '0.35rem 0 0', color: '#15803d', fontSize: '0.875rem', lineHeight: '1.4' }}>
                The experience partner has checked out this session and submitted an end request. Please confirm to complete this booking for both sides.
              </p>
            </div>
            <button
              type="button"
              className="trav-btn-confirm-end"
              onClick={handleConfirmEnd}
              disabled={confirming}
              style={{ padding: '0.55rem 1.25rem', fontSize: '0.9rem' }}
            >
              {confirming ? 'Ending Experience...' : '✓ Accept & Confirm End Request'}
            </button>
          </div>
          {confirmMessage && (
            <div style={{ fontSize: '0.85rem', color: confirmMessage.type === 'success' ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
              {confirmMessage.text}
            </div>
          )}
        </div>
      )}
      {confirmMessage && !isEndRequested && (
        <div style={{ margin: '1rem 0', padding: '0.75rem 1rem', background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '0.5rem', color: '#166534', fontSize: '0.875rem' }}>
          ✓ {confirmMessage.text}
        </div>
      )}

      {/* Cancellation & Honest Refund Breakdown */}
      {isCancelled && (
        <div className={`trav-cancellation-card ${booking.refundStatus === 'NOT_ELIGIBLE' ? 'is-ineligible' : ''}`}>
          <div className="trav-cancellation-header">
            <h3 className="trav-cancellation-title">
              <span>✕</span> Reservation Cancelled
            </h3>
            {booking.refundStatus && (
              <span className={`trav-refund-pill is-${booking.refundStatus.toLowerCase()}`}>
                Refund: {booking.refundStatus} {booking.refundAmount ? `(₹${booking.refundAmount})` : ''}
              </span>
            )}
          </div>

          <div className="trav-cancellation-grid">
            <div className="trav-info-block">
              <span className="trav-info-label">Cancelled At</span>
              <span className="trav-info-val">{booking.cancelledAt ? formatDate(booking.cancelledAt) : 'Recently'}</span>
            </div>
            <div className="trav-info-block">
              <span className="trav-info-label">Cancellation Reason</span>
              <span className="trav-info-val">{booking.cancellationReason || 'Traveller requested'}</span>
            </div>
            <div className="trav-info-block">
              <span className="trav-info-label">Refund Reference</span>
              <span className="trav-info-val" style={{ fontFamily: 'monospace' }}>
                {booking.refundReference || 'N/A'}
              </span>
            </div>
            <div className="trav-info-block">
              <span className="trav-info-label">Refund Amount</span>
              <span className="trav-info-val" style={{ color: '#16a34a', fontWeight: 700 }}>
                {booking.refundAmount ? `₹${booking.refundAmount}` : (booking.refundStatus === 'NOT_ELIGIBLE' ? '₹0 (Ineligible)' : '₹0')}
              </span>
            </div>
          </div>

          {booking.cancellationPolicyNote && (
            <div className="trav-receipt-note" style={{ marginTop: '0.5rem' }}>
              <strong>Policy Applied:</strong> {booking.cancellationPolicyNote}
            </div>
          )}

          {booking.refundStatus === 'FAILED' && (
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
              <strong>Simulation Notice:</strong> All refund processing and monetary disbursements in this development prototype are honestly simulated. No actual payment gateway transactions or bank credits are executed.
            </div>
          </div>
        </div>
      )}


      <div className="trav-details-info-grid">
        <div className="trav-info-block">
          <span className="trav-info-label">Lead Guest</span>
          <span className="trav-info-val">{guestName || 'Not specified'}</span>
        </div>

        <div className="trav-info-block">
          <span className="trav-info-label">Contact Email</span>
          <span className="trav-info-val">{email || 'Not specified'}</span>
        </div>

        <div className="trav-info-block">
          <span className="trav-info-label">Contact Phone</span>
          <span className="trav-info-val">{phone || 'Not specified'}</span>
        </div>

        {isHotel ? (
          <>
            <div className="trav-info-block">
              <span className="trav-info-label">Room Type</span>
              <span className="trav-info-val">{roomType || 'Standard'}</span>
            </div>
            <div className="trav-info-block">
              <span className="trav-info-label">Check-in / Check-out</span>
              <span className="trav-info-val">
                {formatDate(checkIn)} → {formatDate(checkOut)}
              </span>
            </div>
            <div className="trav-info-block">
              <span className="trav-info-label">Total Guests</span>
              <span className="trav-info-val">
                {effectiveGuests} {effectiveGuests === 1 ? 'Guest' : 'Guests'}
              </span>
            </div>
          </>
        ) : (
          <div className="trav-info-block">
            <span className="trav-info-label">Participants</span>
            <span className="trav-info-val">
              {participants} {participants === 1 ? 'Person' : 'People'}
            </span>
          </div>
        )}
      </div>

      {/* Reuse Day 1 BookingSummaryCard */}
      <div style={{ marginTop: '2rem' }}>
        <h3 className="trav-page-eyebrow" style={{ marginBottom: '1rem' }}>
          Itinerary & Pricing Breakdown
        </h3>
        <BookingSummaryCard booking={cardBooking} pricing={cardPricing} />
      </div>
    </div>
  );
}
