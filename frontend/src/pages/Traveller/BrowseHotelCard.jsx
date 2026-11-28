import { formatCurrency } from '../../utils/checkoutUtils.js';
import { getHotelAvailability } from '../../utils/browseUtils.js';

const FALLBACK_HOTEL_IMAGES = [
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1566665797719-1d0a58fa4922?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&q=80&w=800',
];

function getHotelImage(id, image) {
  if (image && typeof image === 'string' && image.startsWith('http')) return image;
  const hash = Math.abs((id || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
  return FALLBACK_HOTEL_IMAGES[hash % FALLBACK_HOTEL_IMAGES.length];
}

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
    image = '',
    badge,
  } = hotel;

  const availability = getHotelAvailability(hotel);
  const { isSoldOut, roomsLeft, statusText } = availability;
  const displayLoc = [location, city].filter(Boolean).join(', ') || 'Prime Location';
  const displayImage = getHotelImage(id, image);
  const flagBadge = badge || (stars >= 5 ? 'Luxury Heritage' : 'Guest Favourite');

  return (
    <article className="trav-browse-card" data-testid={`hotel-card-${id}`}>
      <div className="trav-browse-card-media">
        <img
          src={displayImage}
          alt={name}
          className="trav-browse-card-img"
          loading="lazy"
        />
        <div className="trav-browse-card-badge-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className="trav-browse-card-flag-badge">
              {flagBadge}
            </span>
            {isSoldOut && (
              <span className="trav-browse-soldout-badge">
                Sold Out
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span className="trav-browse-star-badge" aria-label={`${stars} stars`}>
              {'★'.repeat(Math.max(1, Math.min(5, stars)))}
            </span>
            <span className="trav-browse-score-badge" aria-label={`Rating ${rating} out of 5`}>
              ★ {rating}
            </span>
          </div>
        </div>
      </div>

      <div className="trav-browse-card-content">
        <div className="trav-browse-card-header">
          <p className="trav-browse-card-location">
            <span aria-hidden="true">📍</span> {displayLoc}
          </p>
          <h3 className="trav-browse-card-title">{name}</h3>
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

        <div className="trav-browse-card-reviews" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span>{Number(reviewCount).toLocaleString()} verified reviews</span>
          <span
            className={`trav-browse-capacity-pill ${
              isSoldOut
                ? 'trav-browse-capacity-soldout'
                : roomsLeft <= 3
                ? 'trav-browse-capacity-low'
                : 'trav-browse-capacity-available'
            }`}
            data-testid={`hotel-rooms-${id}`}
          >
            ● {statusText}
          </span>
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
                className={`trav-browse-btn ${isSoldOut ? 'trav-browse-btn-outline is-sold-out' : 'trav-browse-btn-outline'}`}
                onClick={() => onSelect(hotel)}
                aria-label={`View details for ${name}`}
              >
                {isSoldOut ? 'View Details (Sold Out)' : 'View Details'}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
