import { formatCurrency } from '../../utils/checkoutUtils.js';

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
  } = experience;

  const spotsRemaining = Math.max(0, capacity - booked);

  return (
    <article className="trav-browse-card" data-testid={`experience-card-${id}`}>
      <div className="trav-browse-card-media">
        <div className="trav-browse-card-image-fallback" aria-hidden="true">
          🧭
        </div>
        <div className="trav-browse-card-badge-top">
          <span className="trav-browse-category-badge">
            {category.toUpperCase()}
          </span>
          <span className="trav-browse-duration-badge" aria-label={`Duration ${durationHours} hours`}>
            ⏱ {durationHours}h
          </span>
        </div>
      </div>

      <div className="trav-browse-card-content">
        <div className="trav-browse-card-header">
          <h3 className="trav-browse-card-title">{title}</h3>
          <p className="trav-browse-card-location">
            <span aria-hidden="true">📍</span> {destination || 'Explore Region'}
          </p>
        </div>

        <div className="trav-browse-experience-meta">
          <span className="trav-browse-slot-info">
            <span aria-hidden="true">🗓</span> Next: {nextSlot}
          </span>
          <span
            className={`trav-browse-capacity-pill ${spotsRemaining <= 3 ? 'trav-browse-capacity-low' : ''}`}
          >
            {spotsRemaining > 0 ? `${spotsRemaining} spots left` : 'Fully Booked'}
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
                className="trav-browse-btn trav-browse-btn-outline"
                onClick={() => onSelect(experience)}
                aria-label={`View details for ${title}`}
              >
                View Details
              </button>
            )}
            {onBook && (
              <button
                type="button"
                className="trav-browse-btn trav-browse-btn-primary"
                onClick={() => onBook(experience)}
                disabled={spotsRemaining === 0}
                aria-label={`Book slot for ${title}`}
              >
                {spotsRemaining > 0 ? 'Book Slot' : 'Waitlist'}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
