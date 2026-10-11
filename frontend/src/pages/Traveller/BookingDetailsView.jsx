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

  const {
    id,
    guestName,
    email,
    phone,
    date,
    participants,
    totalAmount,
    status = 'CONFIRMED',
    createdAt,
    experience = {},
  } = booking;

  // Format booking for reuse with Day 1 BookingSummaryCard
  const cardBooking = {
    title: experience.title || 'Experience Booking',
    type: 'experience',
    location: experience.destination || 'India',
    date: date,
    guestCount: participants || 1,
    imageUrl: experience.image || null,
  };

  const cardPricing = {
    basePrice: experience.price || (totalAmount ? totalAmount / (participants || 1) : 0),
    guestCount: participants || 1,
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

      <div className="trav-details-header">
        <div>
          <span className="trav-page-eyebrow">Booking Reference</span>
          <h2 className="trav-card-title" style={{ fontSize: '1.5rem' }}>
            #{id}
          </h2>
          <span className="trav-card-meta">
            Booked on {formatDate(createdAt || date)}
          </span>
        </div>

        <div className="trav-card-badge-row">
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

        <div className="trav-info-block">
          <span className="trav-info-label">Participants</span>
          <span className="trav-info-val">
            {participants} {participants === 1 ? 'Person' : 'People'}
          </span>
        </div>
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
