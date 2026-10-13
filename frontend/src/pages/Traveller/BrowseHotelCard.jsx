import { formatCurrency } from '../../utils/checkoutUtils.js';

/**
 * BrowseHotelCard
 * Accessible card representing a hotel stay.
 * Conforms to backend Hotel entity:
 * { id, name, city, location, stars, rating, reviewCount, pricePerNight, taxesAndFees, amenities, status }
 */
export default function BrowseHotelCard({ hotel, onSelect, onBook }) {
  if (!hotel) return null;

  const {
    id,
    name = 'Unnamed Hotel',
    city = '',
    location = '',
    stars = 4,
    rating = 4.5,
    reviewCount = 0,
    pricePerNight = 0,
    taxesAndFees = 0,
    amenities = [],
  } = hotel;

  const displayLoc = [location, city].filter(Boolean).join(', ') || 'Prime Location';

  return (
    <article className="trav-browse-card" data-testid={`hotel-card-${id}`}>
      <div className="trav-browse-card-media">
        <div className="trav-browse-card-image-fallback" aria-hidden="true">
          🏨
        </div>
        <div className="trav-browse-card-badge-top">
          <span className="trav-browse-star-badge" aria-label={`${stars} stars`}>
            {'★'.repeat(Math.max(1, Math.min(5, stars)))}
          </span>
          <span className="trav-browse-score-badge" aria-label={`Rating ${rating} out of 5`}>
            ★ {rating}
          </span>
        </div>
      </div>

      <div className="trav-browse-card-content">
        <div className="trav-browse-card-header">
          <h3 className="trav-browse-card-title">{name}</h3>
          <p className="trav-browse-card-location">
            <span aria-hidden="true">📍</span> {displayLoc}
          </p>
        </div>

        {amenities && amenities.length > 0 && (
          <div className="trav-browse-card-tags" aria-label="Hotel amenities">
            {amenities.slice(0, 4).map((amenity, idx) => (
              <span key={idx} className="trav-browse-tag">
                {amenity}
              </span>
            ))}
            {amenities.length > 4 && (
              <span className="trav-browse-tag-more">+{amenities.length - 4} more</span>
            )}
          </div>
        )}

        <div className="trav-browse-card-reviews">
          <span>{Number(reviewCount).toLocaleString()} verified reviews</span>
        </div>

        <div className="trav-browse-card-footer">
          <div className="trav-browse-price-block">
            <span className="trav-browse-price-label">Per night from</span>
            <span className="trav-browse-price-amount">
              {formatCurrency(pricePerNight)}
            </span>
            {taxesAndFees > 0 && (
              <span className="trav-browse-price-taxes">
                + {formatCurrency(taxesAndFees)} taxes & fees
              </span>
            )}
          </div>

          <div className="trav-browse-card-actions">
            {onSelect && (
              <button
                type="button"
                className="trav-browse-btn trav-browse-btn-outline"
                onClick={() => onSelect(hotel)}
                aria-label={`View details for ${name}`}
              >
                View Details
              </button>
            )}
            {onBook && (
              <button
                type="button"
                className="trav-browse-btn trav-browse-btn-primary"
                onClick={() => onBook(hotel)}
                aria-label={`Book stay at ${name}`}
              >
                Book Now
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
