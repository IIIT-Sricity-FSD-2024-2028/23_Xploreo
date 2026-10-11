import { formatCurrency, formatDate, calculateDisplayPricing } from '../../utils/checkoutUtils.js';
import './checkout.css';

/**
 * BookingSummaryCard
 * Displays item overview (experience, hotel, or trip) with read-only price breakdown.
 * 
 * NOTE: Pricing shown is strictly caller-supplied display data.
 * Authoritative price calculation occurs on the backend during order creation.
 */
export default function BookingSummaryCard({
  booking = {},
  pricing = {},
  currency = 'INR',
}) {
  const {
    title = 'Booking Summary',
    type = 'experience',
    location = 'Location not specified',
    date = null,
    time = null,
    guestCount = 1,
    imageUrl = null,
  } = booking;

  const displayPricing = calculateDisplayPricing({
    basePrice: pricing.basePrice,
    guestCount: pricing.guestCount ?? guestCount,
    subtotal: pricing.subtotal,
    taxesAndFees: pricing.taxesAndFees,
    discount: pricing.discount,
    total: pricing.total,
  });

  return (
    <div className="trav-summary-card" data-testid="booking-summary-card">
      <div className="trav-summary-header">
        <span className="trav-summary-type">{type}</span>
        <h3 className="trav-summary-title">{title}</h3>
        <p className="trav-summary-location">
          <span aria-hidden="true">📍</span>
          <span>{location}</span>
        </p>
      </div>

      {imageUrl && (
        <div className="trav-summary-image-wrap">
          <img
            src={imageUrl}
            alt={title}
            className="trav-summary-image"
            loading="lazy"
          />
        </div>
      )}

      <div className="trav-summary-body">
        <div className="trav-meta-grid">
          <div className="trav-meta-item">
            <span className="trav-meta-label">Date</span>
            <span className="trav-meta-value">{formatDate(date)}</span>
          </div>

          {time && (
            <div className="trav-meta-item">
              <span className="trav-meta-label">Time</span>
              <span className="trav-meta-value">{time}</span>
            </div>
          )}

          <div className="trav-meta-item">
            <span className="trav-meta-label">Guests</span>
            <span className="trav-meta-value">
              {displayPricing.guestCount} {displayPricing.guestCount === 1 ? 'Guest' : 'Guests'}
            </span>
          </div>
        </div>

        <div className="trav-pricing-section">
          <div className="trav-price-row">
            <span>
              Base Fare ({displayPricing.guestCount} × {formatCurrency(displayPricing.basePrice, currency)})
            </span>
            <span>{formatCurrency(displayPricing.subtotal, currency)}</span>
          </div>

          {displayPricing.taxesAndFees > 0 && (
            <div className="trav-price-row">
              <span>Taxes & Service Fees</span>
              <span>{formatCurrency(displayPricing.taxesAndFees, currency)}</span>
            </div>
          )}

          {displayPricing.discount > 0 && (
            <div className="trav-price-row is-discount">
              <span>Discount</span>
              <span>-{formatCurrency(displayPricing.discount, currency)}</span>
            </div>
          )}

          <div className="trav-price-divider" role="separator" />

          <div className="trav-price-total">
            <span>Estimated Total</span>
            <span className="trav-price-total-amount" data-testid="estimated-total-amount">
              {formatCurrency(displayPricing.total, currency)}
            </span>
          </div>
        </div>

        <p className="trav-price-disclaimer">
          Final authoritative amount will be verified during secure checkout.
        </p>
      </div>
    </div>
  );
}
