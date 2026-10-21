import { useState } from 'react';
import { cancelBooking } from '../../services/hotels.api.js';
import { cancelExperienceBooking } from '../../services/partners.api.js';
import { cancelTrip } from '../../services/tripGuides.api.js';
import { formatCurrency, formatDate } from '../../utils/checkoutUtils.js';

const REASON_OPTIONS = [
  'Change of travel plans',
  'Schedule conflict',
  'Flight or train delayed/cancelled',
  'Personal or medical emergency',
  'Found alternative accommodation',
  'Other reasons',
];

export default function CancellationModal({
  isOpen,
  booking,
  bookingType = 'hotel',
  onClose,
  onSuccess,
}) {
  const [reason, setReason] = useState(REASON_OPTIONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cancellationResult, setCancellationResult] = useState(null);

  if (!isOpen || !booking) return null;

  const isHotel = bookingType === 'hotel' || !!booking.hotel;
  const isTrip = bookingType === 'trip' || (!isHotel && (booking.planId || booking.itinerary));
  const isExperience = !isHotel && !isTrip;

  const title = isHotel
    ? (booking.hotel?.name || 'Hotel Reservation')
    : isTrip
      ? (booking.itinerary?.day1?.hotel?.name || `Trip #${booking.id}`)
      : (booking.experience?.title || 'Experience Booking');

  const totalAmount = Number(booking.totalAmount) || 0;
  const dateStr = isHotel ? booking.checkIn : isTrip ? (booking.itinerary?.day1?.hotel?.checkInDate || booking.date) : booking.date;

  const handleConfirmCancel = async () => {
    setLoading(true);
    setError(null);
    const selectedReason = reason === 'Other reasons' && customReason.trim() ? customReason.trim() : reason;

    try {
      let result;
      if (isHotel) {
        result = await cancelBooking(booking.id, { reason: selectedReason });
      } else if (isExperience) {
        result = await cancelExperienceBooking(booking.id, { reason: selectedReason });
      } else {
        result = await cancelTrip(booking.id, { reason: selectedReason });
      }

      setCancellationResult(result);
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      setError(err?.message || 'Failed to cancel booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setCancellationResult(null);
    onClose();
  };

  return (
    <div className="trav-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="cancel-modal-title">
      <div className="trav-cancel-modal">
        {/* Modal Header */}
        <div className="trav-cancel-modal-header">
          <div>
            <span className="trav-cancel-eyebrow">Booking #{booking.id}</span>
            <h3 id="cancel-modal-title" className="trav-cancel-title">
              {cancellationResult ? 'Cancellation Complete' : 'Cancel Reservation'}
            </h3>
          </div>
          <button
            type="button"
            className="trav-cancel-modal-close"
            onClick={handleClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Modal Body: Active cancellation confirmation */}
        {!cancellationResult ? (
          <div className="trav-cancel-modal-body">
            {error && (
              <div className="trav-cancel-alert is-error" role="alert">
                ⚠️ {error}
              </div>
            )}

            <div className="trav-cancel-item-summary">
              <h4 className="trav-cancel-item-name">{title}</h4>
              <p className="trav-cancel-item-dates">
                {dateStr ? `Scheduled for ${formatDate(dateStr)}` : 'Dates pending'} · Total Paid: <strong>{formatCurrency(totalAmount)}</strong>
              </p>
            </div>

            {/* Honest Policy Breakdown */}
            <div className="trav-cancel-policy-card">
              <h5 className="trav-policy-heading">Cancellation &amp; Refund Policy</h5>
              <p className="trav-policy-text">
                {isHotel && 'Free cancellation is available up to 24–48 hours before check-in. If eligible, your refund of the full amount will be processed automatically.'}
                {isExperience && 'Free cancellation is permitted up to 24 hours prior to the scheduled session. If cancelled inside 24 hours, the booking is non-refundable.'}
                {isTrip && 'Trips qualify for full cancellation up to 48 hours before departure date. Cancellations inside 48 hours are non-refundable.'}
              </p>
              <div className="trav-policy-note">
                ℹ️ <em>Refunds in this demo environment are processed through our simulated payment processor and credited immediately upon confirmation.</em>
              </div>
            </div>

            {/* Reason selector */}
            <div className="trav-cancel-form-group">
              <label htmlFor="cancel-reason-select" className="trav-cancel-label">
                Please select a reason for cancellation:
              </label>
              <select
                id="cancel-reason-select"
                className="trav-cancel-select"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={loading}
              >
                {REASON_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {reason === 'Other reasons' && (
              <div className="trav-cancel-form-group">
                <label htmlFor="cancel-custom-reason" className="trav-cancel-label">
                  Specific reason (optional):
                </label>
                <textarea
                  id="cancel-custom-reason"
                  className="trav-cancel-textarea"
                  rows={2}
                  placeholder="Provide brief details..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}

            <div className="trav-cancel-actions">
              <button
                type="button"
                className="trav-btn-cancel-keep"
                onClick={handleClose}
                disabled={loading}
              >
                Keep Reservation
              </button>
              <button
                type="button"
                className="trav-btn-cancel-confirm"
                onClick={handleConfirmCancel}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        ) : (
          /* Modal Body: Success and exact refund status */
          <div className="trav-cancel-modal-body">
            <div className="trav-cancel-success-hero">
              <div className="trav-cancel-success-icon" aria-hidden="true">
                ✓
              </div>
              <h4 className="trav-cancel-success-title">
                Reservation Successfully Cancelled
              </h4>
              <p className="trav-cancel-success-msg">
                Your booking #{booking.id} has been cancelled successfully. Refund status: <strong>{cancellationResult.refundStatus || 'SUCCESS'}</strong>.
              </p>
            </div>

            {/* Refund detail status card */}
            <div className="trav-cancel-refund-receipt">
              <div className="trav-receipt-row">
                <span>Refund Eligibility</span>
                <span className={`trav-badge ${cancellationResult.refundEligibility === 'ELIGIBLE' ? 'is-confirmed' : 'is-cancelled'}`}>
                  {cancellationResult.refundEligibility || 'ELIGIBLE'}
                </span>
              </div>
              <div className="trav-receipt-row">
                <span>Eligible Refund Amount</span>
                <strong style={{ fontSize: '1.1rem', color: '#0f766e' }}>
                  {formatCurrency(cancellationResult.refundAmount ?? totalAmount)}
                </strong>
              </div>
              <div className="trav-receipt-row">
                <span>Refund Processing Status</span>
                <span className="trav-status-badge is-confirmed">
                  {cancellationResult.refundStatus || 'SUCCESS'} (Simulated)
                </span>
              </div>
              {cancellationResult.refundReference && (
                <div className="trav-receipt-row">
                  <span>Refund Reference</span>
                  <code>{cancellationResult.refundReference}</code>
                </div>
              )}
              {cancellationResult.cancellationPolicyNote && (
                <div className="trav-receipt-note">
                  {cancellationResult.cancellationPolicyNote}
                </div>
              )}
            </div>

            {cancellationResult.refundStatus === 'SUCCESS' && (
              <div className="trav-cancel-alert is-success">
                💳 Your refund of {formatCurrency(cancellationResult.refundAmount ?? totalAmount)} for booking #{booking.id} has been processed successfully. An in-app notification has been delivered.
              </div>
            )}

            {cancellationResult.refundStatus === 'FAILED' && (
              <div className="trav-cancel-alert is-error">
                ⚠️ Your refund could not be automatically processed. Please contact customer support or visit your support tickets to resolve this.
              </div>
            )}

            <div className="trav-cancel-actions" style={{ marginTop: '1.5rem' }}>
              <button
                type="button"
                className="trav-btn-cancel-keep"
                style={{ width: '100%', background: '#0f766e', color: '#ffffff' }}
                onClick={handleClose}
              >
                Close &amp; Return to Bookings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
