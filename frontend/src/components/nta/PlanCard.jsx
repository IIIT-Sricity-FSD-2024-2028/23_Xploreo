import './nta.css';

/**
 * Reusable Package Card for NTA / SuperAdmin Plan Browsing.
 * Strictly adheres to product requirement:
 * - Partner Hotel Stays + Curated Experiences ONLY.
 * - Zero flights. Zero transport.
 * 
 * @param {Object} props
 * @param {Object} props.plan - Plan data object
 * @param {Function} props.onViewDetails - Callback to open details view: (plan) => void
 * @param {Function} [props.onEdit] - Callback to open edit view: (plan) => void
 * @param {Function} [props.onDelete] - Optional delete callback (SuperAdmin only): (plan) => void
 * @param {Object} [props.currentUser] - Session user { userId, role, region }
 * @param {string} [props.className] - Additional CSS class name
 */
export default function PlanCard({
  plan,
  onViewDetails,
  onEdit,
  onDelete,
  currentUser = null,
  className = '',
}) {
  if (!plan) return null;

  const userRole = (currentUser?.role || '').toLowerCase();
  const isNTA = userRole.includes('nontech') || userRole === 'nta';
  const assignedRegion = currentUser?.region || '';

  // Check if NTA can edit this plan based on region assignment
  const isRegionMatch =
    !assignedRegion ||
    (plan.destination && plan.destination.toLowerCase() === assignedRegion.toLowerCase());
  const canEdit = !isNTA || isRegionMatch;

  // Format price
  const formattedPrice =
    plan.pricePerPerson !== undefined && plan.pricePerPerson !== null
      ? `₹${Number(plan.pricePerPerson).toLocaleString('en-IN')}`
      : plan.price !== undefined
      ? `₹${Number(plan.price).toLocaleString('en-IN')}`
      : 'Price on request';

  // Duration
  const nights =
    plan.durationNights !== undefined
      ? plan.durationNights
      : plan.duration !== undefined
      ? plan.duration
      : 0;

  // Hotel Stars
  const stars = Number(plan.hotelStars || 4);
  const starsDisplay = '★'.repeat(Math.min(5, Math.max(1, stars))) + '☆'.repeat(Math.max(0, 5 - stars));

  // Status
  const planStatus = (plan.status || 'available').toLowerCase();
  const statusLabel =
    planStatus === 'sold_out'
      ? 'Sold Out'
      : planStatus === 'draft'
      ? 'Draft'
      : planStatus === 'unavailable'
      ? 'Unavailable'
      : 'Available';
  const isAvailable = planStatus === 'available';

  return (
    <article className={`nta-plan-card ${className}`} data-testid={`plan-card-${plan.id}`}>
      {/* Card Media Header */}
      <div className="nta-plan-card-media">
        {plan.image ? (
          <img
            src={plan.image}
            alt={plan.title || 'Travel Package'}
            className="nta-plan-card-img"
            loading="lazy"
            onError={(e) => {
              // Graceful fallback if image fails to load
              e.currentTarget.style.display = 'none';
              if (e.currentTarget.nextElementSibling) {
                e.currentTarget.nextElementSibling.style.display = 'flex';
              }
            }}
          />
        ) : null}
        <div
          className="nta-plan-card-placeholder-img"
          style={{ display: plan.image ? 'none' : 'flex' }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>{plan.destination || 'Xploreo Stay'}</span>
        </div>

        {/* Status Badge */}
        <div className="nta-plan-card-badge-container">
          <span className={`nta-plan-status-badge ${planStatus}`}>
            <span className="nta-plan-status-dot" />
            {statusLabel}
          </span>
          {assignedRegion && isRegionMatch && isNTA && (
            <span className="nta-plan-region-match-badge" title="Assigned to your regional territory">
              Your Region
            </span>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="nta-plan-card-body">
        {/* Destination Meta */}
        <div className="nta-plan-card-route">
          <span className="nta-plan-card-destination">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {plan.destination || 'Unspecified'}
          </span>
        </div>

        {/* Title */}
        <h3 className="nta-plan-card-title" title={plan.title}>
          {plan.title || 'Untitled Package'}
        </h3>

        {/* Quick Highlights: Nights & Hotel Stars */}
        <div className="nta-plan-card-meta-row">
          <span className="nta-plan-meta-pill" title={`${nights} Nights Accommodation`}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
            {nights} {nights === 1 ? 'Night' : 'Nights'}
          </span>
          <span className="nta-plan-meta-pill stars" title={`${stars}-Star Partner Accommodation`}>
            <span className="stars-icons">{starsDisplay}</span>
            <span className="stars-num">{stars}★</span>
          </span>
        </div>

        {/* Description snippet */}
        {plan.description && (
          <p className="nta-plan-card-description">
            {plan.description}
          </p>
        )}

        {/* Tags */}
        {Array.isArray(plan.tags) && plan.tags.length > 0 && (
          <div className="nta-plan-card-tags">
            {plan.tags.slice(0, 3).map((tag, idx) => (
              <span key={idx} className="nta-plan-tag">
                #{tag}
              </span>
            ))}
            {plan.tags.length > 3 && (
              <span className="nta-plan-tag-more">+{plan.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Footer: Price & Actions */}
        <div className="nta-plan-card-footer">
          <div className="nta-plan-card-price-block">
            <span className="nta-plan-card-price-amount">{formattedPrice}</span>
            <span className="nta-plan-card-price-sub">/ person</span>
          </div>

          <div className="nta-plan-card-actions">
            <button
              type="button"
              className="nta-card-btn nta-card-btn-view"
              onClick={() => onViewDetails && onViewDetails(plan)}
              aria-label={`View details for ${plan.title}`}
            >
              View Details
            </button>

            {onEdit && (
              <button
                type="button"
                className={`nta-card-btn nta-card-btn-edit ${!canEdit ? 'disabled' : ''}`}
                onClick={() => canEdit && onEdit(plan)}
                disabled={!canEdit}
                title={
                  !canEdit
                    ? `Editing restricted: Assigned to ${assignedRegion} region`
                    : 'Edit package'
                }
                aria-label={`Edit ${plan.title}`}
              >
                {canEdit ? 'Edit' : 'Locked'}
              </button>
            )}

            {onDelete && canEdit && (
              <button
                type="button"
                className="nta-card-btn nta-card-btn-delete"
                onClick={() => onDelete(plan)}
                title={`Delete package (${assignedRegion || plan.destination})`}
                aria-label={`Delete ${plan.title}`}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
