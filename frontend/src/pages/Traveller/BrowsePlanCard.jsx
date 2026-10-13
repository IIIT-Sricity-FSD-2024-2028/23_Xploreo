import { formatCurrency } from '../../utils/checkoutUtils.js';

/**
 * BrowsePlanCard
 * Accessible card representing a tour package / plan.
 * Conforms to backend Plan entity:
 * { id, title, description, originCity, destination, durationNights, pricePerPerson, hotelStars, tags }
 * Note: Flights are explicitly omitted from user display as per prompt requirements.
 */
export default function BrowsePlanCard({ plan, onSelect, onBook }) {
  if (!plan) return null;

  const {
    id,
    title = 'Curated Tour Package',
    originCity = '',
    destination = '',
    durationNights = 3,
    pricePerPerson = 0,
    hotelStars = 4,
    tags = [],
  } = plan;

  return (
    <article className="trav-browse-card" data-testid={`plan-card-${id}`}>
      <div className="trav-browse-card-media">
        <div className="trav-browse-card-image-fallback" aria-hidden="true">
          🗺
        </div>
        <div className="trav-browse-card-badge-top">
          <span className="trav-browse-duration-badge">
            {durationNights} Nights / {durationNights + 1} Days
          </span>
          {hotelStars > 0 && (
            <span className="trav-browse-star-badge" aria-label={`${hotelStars} star stay`}>
              {hotelStars}★ Stays
            </span>
          )}
        </div>
      </div>

      <div className="trav-browse-card-content">
        <div className="trav-browse-card-header">
          <h3 className="trav-browse-card-title">{title}</h3>
          <p className="trav-browse-card-location">
            <span aria-hidden="true">📍</span> {originCity ? `${originCity} → ` : ''}{destination}
          </p>
        </div>

        {tags && tags.length > 0 && (
          <div className="trav-browse-card-tags" aria-label="Package highlights">
            {tags.slice(0, 4).map((tag, idx) => (
              <span key={idx} className="trav-browse-tag">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="trav-browse-card-footer">
          <div className="trav-browse-price-block">
            <span className="trav-browse-price-label">All-inclusive from</span>
            <span className="trav-browse-price-amount">
              {formatCurrency(pricePerPerson)}
            </span>
            <span className="trav-browse-price-sub">per person</span>
          </div>

          <div className="trav-browse-card-actions">
            {onSelect && (
              <button
                type="button"
                className="trav-browse-btn trav-browse-btn-outline"
                onClick={() => onSelect(plan)}
                aria-label={`View itinerary for ${title}`}
              >
                View Itinerary
              </button>
            )}
            {onBook && (
              <button
                type="button"
                className="trav-browse-btn trav-browse-btn-primary"
                onClick={() => onBook(plan)}
                aria-label={`Select package ${title}`}
              >
                Select Package
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
