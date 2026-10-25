import { formatCurrency } from '../../utils/checkoutUtils.js';

const FALLBACK_PLAN_IMAGES = [
  'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&q=80&w=800',
];

function getPlanImage(id, image) {
  if (image && typeof image === 'string' && image.startsWith('http')) return image;
  const hash = Math.abs((id || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
  return FALLBACK_PLAN_IMAGES[hash % FALLBACK_PLAN_IMAGES.length];
}

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
    image = '',
    status = 'available',
  } = plan;

  const isSoldOut = (status || '').toLowerCase() === 'sold_out';
  const displayImage = getPlanImage(id, image);

  return (
    <article className="trav-browse-card" data-testid={`plan-card-${id}`}>
      <div className="trav-browse-card-media">
        <img
          src={displayImage}
          alt={title}
          className="trav-browse-card-img"
          loading="lazy"
        />
        <div className="trav-browse-card-badge-top">
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span className="trav-browse-duration-badge">
              {durationNights} Nights / {durationNights + 1} Days
            </span>
            {isSoldOut && (
              <span
                className="trav-browse-soldout-badge"
                style={{
                  background: 'rgba(239, 68, 68, 0.9)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '0.35rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Sold Out
              </span>
            )}
          </div>
          {hotelStars > 0 && (
            <span className="trav-browse-star-badge" aria-label={`${hotelStars} star stay`}>
              {hotelStars}★ Stays
            </span>
          )}
        </div>
      </div>

      <div className="trav-browse-card-content">
        <div className="trav-browse-card-header">
          <p className="trav-browse-card-location">
            <span aria-hidden="true">📍</span> {originCity ? `${originCity} → ` : ''}{destination}
          </p>
          <h3 className="trav-browse-card-title">{title}</h3>
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
                aria-label={`View details for ${title}`}
              >
                View Details
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
