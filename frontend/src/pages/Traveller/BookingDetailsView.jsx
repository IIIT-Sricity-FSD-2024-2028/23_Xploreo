import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { BookingSummaryCard } from '../../components/checkout/index.js';
import { formatDate } from '../../utils/checkoutUtils.js';
import { retryBookingRefund } from '../../store/traveller/index.js';
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


  const isPackage = booking.bookingType === 'package';
  const isHotel = !isPackage && (!!booking.hotel || booking.bookingType === 'hotel');
  const isDemo = !!booking.isDemo || booking.source === 'mock';

  if (isPackage) {
    const itineraryHotel = booking.itinerary?.day1?.hotel;
    const experienceDays = booking.itinerary?.days || [];
    const progressPct = Number(booking.progressPercentage) || 0;
    const isConfirmed = String(booking.status || '').toUpperCase() === 'CONFIRMED';

    const componentBadge = (st, dispatched) => {
      const s = String(st || 'planned').toLowerCase();
      if (s === 'cancelled') return { label: 'Cancelled', bg: '#fee2e2', color: '#991b1b' };
      if (s === 'completed' || s === 'checked_out') return { label: s.replace('_', ' ').toUpperCase(), bg: '#dcfce7', color: '#166534' };
      if (s === 'checked_in') return { label: 'Checked In', bg: '#dbeafe', color: '#1e40af' };
      if (s === 'confirmed' || dispatched) return { label: 'Confirmed / Dispatched', bg: '#e0f2fe', color: '#0369a1' };
      return { label: 'Awaiting NTA Dispatch', bg: '#fef3c7', color: '#92400e' };
    };

    return (
      <div className="trav-booking-details-container" data-testid="booking-details-view">
        {onBack && (
          <div className="trav-back-nav">
            <button type="button" className="trav-back-btn" onClick={onBack}>
              <span aria-hidden="true">←</span> Back to My Bookings
            </button>
          </div>
        )}

        <div className="trav-details-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
            <div>
              <span className="trav-page-eyebrow">Holiday Package · #{booking.id}</span>
              <h2 style={{ margin: '4px 0' }}>{booking.planTitle || 'Holiday Package'}</h2>
              <p style={{ margin: 0, color: '#64748b' }}>
                Destination: {booking.destination || booking.currentLocation || itineraryHotel?.name || 'India'} · {booking.travellers || booking.guests || 1} Traveller(s)
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{formatDate && booking.totalAmount != null ? `₹${Number(booking.totalAmount).toLocaleString('en-IN')}` : '₹0'}</div>
              <span className="trav-status-badge is-confirmed">{booking.status}</span>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
              <span>Overall Package Progress</span>
              <strong>{progressPct}%</strong>
            </div>
            <div style={{ height: 8, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${progressPct}%`, height: '100%', background: '#0ea5e9' }} />
            </div>
          </div>

          {itineraryHotel?.hotelId ? (
            <div style={{ marginBottom: 18 }}>
              <h3 style={{ fontSize: 15, marginBottom: 8 }}>Included Hotel Stay</h3>
              {(() => {
                const badge = componentBadge(itineraryHotel.status, Boolean(booking.hotelBookingId));
                return (
                  <div style={{ padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <strong>{itineraryHotel.name || itineraryHotel.hotelId}</strong>
                      <div style={{ fontSize: 13, color: '#64748b' }}>
                        {itineraryHotel.roomType} · {formatDate(itineraryHotel.checkInDate)} → {formatDate(itineraryHotel.checkOutDate)}
                      </div>
                    </div>
                    <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: badge.bg, color: badge.color }}>
                      {badge.label}
                    </span>
                  </div>
                );
              })()}
            </div>
          ) : null}

          <div style={{ marginBottom: 18 }}>
            <h3 style={{ fontSize: 15, marginBottom: 8 }}>Included Experiences</h3>
            {experienceDays.flatMap((d) => (d.experiences || []).map((e) => ({ ...e, dayNumber: d.dayNumber }))).length === 0 ? (
              <p style={{ color: '#64748b', fontSize: 14 }}>No experiences scheduled in this package.</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {experienceDays.flatMap((day) =>
                  (day.experiences || []).map((exp, idx) => {
                    const badge = componentBadge(exp.status, (booking.experienceBookingIds || []).length > 0);
                    return (
                      <div key={`${day.dayNumber}-${exp.experienceId || idx}`} style={{ padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <strong>Day {day.dayNumber}: {exp.title}</strong>
                          <div style={{ fontSize: 13, color: '#64748b' }}>
                            {String(exp.startsAt || '').slice(0, 10)} · {exp.location}
                          </div>
                        </div>
                        <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: badge.bg, color: badge.color }}>
                          {badge.label}
                        </span>
                      </div>
                    );
                  }),
                )}
              </div>
            )}
          </div>

          {isConfirmed && onCancelClick && (
            <button type="button" className="trav-btn-cancel-trigger" onClick={() => onCancelClick(booking)}>
              Cancel Holiday Package
            </button>
          )}
        </div>
      </div>
    );
  }

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
              isConfirmed ? 'is-confirmed' : isCancelled ? 'is-cancelled' : 'is-pending'
            }`}
          >
            {status}
          </span>
          {isConfirmed && onCancelClick && (
            <button
              type="button"
              className="trav-btn-cancel-trigger"
              onClick={() => onCancelClick(booking)}
              style={{ marginLeft: '8px' }}
            >
              Cancel Reservation
            </button>
          )}
        </div>
      </div>

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
