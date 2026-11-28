import { formatCurrency } from '../../utils/checkoutUtils.js';
import { getExperienceAvailability } from '../../utils/browseUtils.js';

const FALLBACK_EXP_IMAGES = [
  'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&q=80&w=800',
];

function getExpImage(id, image) {
  if (image && typeof image === 'string' && image.startsWith('http')) return image;
  const hash = Math.abs((id || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
  return FALLBACK_EXP_IMAGES[hash % FALLBACK_EXP_IMAGES.length];
}

/**
 * BrowseExperienceCard
 * Accessible card representing an Experience item.
 * Conforms to backend Experience entity:
 * { id, title, description, destination, category, price, durationHours, capacity, booked, nextSlot }
 */
export default function BrowseExperienceCard({ experience, onSelect, onBook }) {
  if (!experience) return null;

  const {
    id,
    title = 'Unnamed Experience',
    destination = '',
    category = 'adventure',
    price = 0,
    durationHours = 2,
    capacity = 10,
    booked = 0,
    nextSlot = 'Available daily',
    image = '',
    badge,
  } = experience;

  const availability = getExperienceAvailability(experience);
  const { isSoldOut, nextSlotText, spotsRemaining, statusText, isPast } = availability;
  const displayImage = getExpImage(id, image);
  const flagBadge = badge || (category === 'adventure' ? 'Top Rated Adventure' : 'Curated Activity');

  return (
    <article className="trav-browse-card" data-testid={`experience-card-${id}`}>
      <div className="trav-browse-card-media">
        <img
          src={displayImage}
          alt={title}
          className="trav-browse-card-img"
          loading="lazy"
        />
        <div className="trav-browse-card-badge-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className="trav-browse-category-badge">
              {category.toUpperCase()}
            </span>
            {isSoldOut && (
              <span className="trav-browse-soldout-badge">
                {isPast ? 'Session Passed' : 'Sold Out'}
              </span>
            )}
          </div>
          <span className="trav-browse-duration-badge" aria-label={`Duration ${durationHours} hours`}>
            ⏱ {durationHours}h
          </span>
        </div>
      </div>

      <div className="trav-browse-card-content">
        <div className="trav-browse-card-header">
          <p className="trav-browse-card-location">
            <span aria-hidden="true">📍</span> {destination || 'Explore Region'}
          </p>
          <h3 className="trav-browse-card-title">{title}</h3>
        </div>

        <div className="trav-browse-experience-meta">
          <span
            className="trav-browse-slot-info"
            style={isSoldOut && isPast ? { color: '#64748b', fontStyle: 'italic' } : {}}
          >
            <span aria-hidden="true">🗓</span> {isPast ? 'No upcoming sessions' : `Next: ${nextSlotText}`}
          </span>
          <span
            className={`trav-browse-capacity-pill ${
              isSoldOut
                ? 'trav-browse-capacity-soldout'
                : spotsRemaining <= 3
                ? 'trav-browse-capacity-low'
                : 'trav-browse-capacity-available'
            }`}
            data-testid={`experience-spots-${id}`}
          >
            ● {statusText}
          </span>
        </div>

        <div className="trav-browse-card-footer">
          <div className="trav-browse-price-block">
            <span className="trav-browse-price-label">Price per person</span>
            <span className="trav-browse-price-amount">
              {formatCurrency(price)}
            </span>
          </div>

          <div className="trav-browse-card-actions">
            {onSelect && (
              <button
                type="button"
                className={`trav-browse-btn ${isSoldOut ? 'trav-browse-btn-outline is-sold-out' : 'trav-browse-btn-outline'}`}
                onClick={() => onSelect(experience)}
                aria-label={`View details for ${title}`}
              >
                {isSoldOut ? 'View Details (Unavailable)' : 'View Details'}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
