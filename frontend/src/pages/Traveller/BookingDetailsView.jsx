import { BookingSummaryCard } from '../../components/checkout/index.js';
import { formatDate } from '../../utils/checkoutUtils.js';
import './travellerBookings.css';

/**
 * BookingDetailsView
 * Renders full booking breakdown for an authorized traveller.
 * Reuses BookingSummaryCard from Day 1 for consistent presentation.
 * 
 * NOTE: Operates as a pure presentation view accepting the booking object
 * and navigation callback. No direct network or auth hacks used.
 */
export default function BookingDetailsView({
  booking,
  onBack,
}) {
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

  return (
    <div className="trav-details-view" data-testid="traveller-booking-details-view">
      {onBack && (
        <div className="trav-back-nav">
          <button type="button" className="trav-back-btn" onClick={onBack}>
            <span aria-hidden="true">←</span> Back to My Bookings
          </button>
        </div>
      )}

      {isDemo && (
        <div
          className="trav-demo-banner"
          style={{
            background: 'rgba(217, 119, 6, 0.12)',
            border: '1px solid rgba(217, 119, 6, 0.35)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.9rem',
            color: '#b45309',
          }}
          data-testid="booking-details-demo-banner"
        >
          <span aria-hidden="true">ℹ️</span>
          <div>
            <strong>Demo Record (Mock Adapter):</strong> This reservation is rendered via the Mock Hotel Adapter because backend hotel booking retrieval (<code>GET /api/bookings</code>) is not yet available.
          </div>
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

        <div className="trav-card-badge-row">
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
        </div>
      </div>

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
