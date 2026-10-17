import { useEffect } from 'react';
import './nta.css';

/**
 * Reusable Package Details Modal for NTA & SuperAdmin views.
 * Strictly adheres to product requirement:
 * - Partner Hotel Stays (Day 1) + Curated Local Experiences (Days 2+) ONLY.
 * - Zero flights. Zero transport.
 * 
 * @param {Object} props
 * @param {Object} props.plan - Plan details object
 * @param {Function} props.onClose - Modal close handler: () => void
 * @param {Function} [props.onEdit] - Optional edit handler: (plan) => void
 * @param {Object} [props.currentUser] - Session user { userId, role, region }
 */
export default function PlanDetailsModal({
  plan,
  onClose,
  onEdit,
  currentUser = null,
}) {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!plan) return null;

  const userRole = (currentUser?.role || '').toLowerCase();
  const isNTA = userRole.includes('nontech') || userRole === 'nta';
  const assignedRegion = currentUser?.region || '';
  const isRegionMatch =
    !assignedRegion ||
    (plan.destination && plan.destination.toLowerCase() === assignedRegion.toLowerCase());
  const canEdit = !isNTA || isRegionMatch;

  const formattedPrice =
    plan.pricePerPerson !== undefined && plan.pricePerPerson !== null
      ? `₹${Number(plan.pricePerPerson).toLocaleString('en-IN')}`
      : plan.price !== undefined
      ? `₹${Number(plan.price).toLocaleString('en-IN')}`
      : 'Price on request';

  const nights =
    plan.durationNights !== undefined
      ? plan.durationNights
      : plan.duration !== undefined
      ? plan.duration
      : 0;

  const stars = Number(plan.hotelStars || 4);
  const starsDisplay = '★'.repeat(Math.min(5, Math.max(1, stars))) + '☆'.repeat(Math.max(0, 5 - stars));
  const planStatus = (plan.status || 'available').toLowerCase();
  const statusLabel =
    planStatus === 'sold_out'
      ? 'Sold Out'
      : planStatus === 'draft'
      ? 'Draft'
      : planStatus === 'unavailable'
      ? 'Unavailable'
      : 'Available';

  // Extract itinerary sections
  const day1Hotel = plan.itinerary?.day1?.hotel;
  const experienceDays = Array.isArray(plan.itinerary?.days) ? plan.itinerary.days : [];

  return (
    <div
      className="nta-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        className="nta-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-details-title"
      >
        {/* Modal Header */}
        <div className="nta-modal-header">
          <div className="nta-modal-header-text">
            <div className="nta-modal-header-badges">
              <span className={`nta-plan-status-badge ${planStatus}`}>
                <span className="nta-plan-status-dot" />
                {statusLabel}
              </span>
              <span className="nta-modal-region-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {plan.destination}
              </span>
            </div>
            <h2 id="plan-details-title" className="nta-modal-title">
              {plan.title || 'Travel Package Details'}
            </h2>
          </div>

          <button
            type="button"
            className="nta-modal-close-btn"
            onClick={onClose}
            aria-label="Close details modal"
          >
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <div className="nta-modal-body">
          {/* Cover Media Banner if available */}
          {plan.image && (
            <div className="nta-modal-cover">
              <img
                src={plan.image}
                alt={plan.title}
                className="nta-modal-cover-img"
                onError={(e) => {
                  e.currentTarget.parentElement.style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="nta-modal-metrics-bar">
            <div className="nta-modal-metric">
              <span className="nta-metric-label">Duration</span>
              <span className="nta-metric-value">{nights} Nights Stay</span>
            </div>
            <div className="nta-modal-metric">
              <span className="nta-metric-label">Price / Person</span>
              <span className="nta-metric-value price">{formattedPrice}</span>
            </div>
            <div className="nta-modal-metric">
              <span className="nta-metric-label">Hotel Rating</span>
              <span className="nta-metric-value">
                {stars}★ <span style={{ color: '#f59e0b', fontSize: '13px' }}>{starsDisplay}</span>
              </span>
            </div>
            <div className="nta-modal-metric">
              <span className="nta-metric-label">Curated Days</span>
              <span className="nta-metric-value">{experienceDays.length + 1} Days Total</span>
            </div>
          </div>

          {/* Package Description */}
          <div className="nta-modal-section">
            <h4 className="nta-modal-section-title">Package Overview</h4>
            <p className="nta-modal-description">
              {plan.description || 'No detailed overview provided for this package.'}
            </p>

            {Array.isArray(plan.tags) && plan.tags.length > 0 && (
              <div className="nta-modal-tags">
                {plan.tags.map((tag, idx) => (
                  <span key={idx} className="nta-plan-tag">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Day 1: Partner Hotel Accommodation */}
          <div className="nta-modal-section">
            <div className="nta-modal-section-header">
              <h4 className="nta-modal-section-title">
                Day 1 — Partner Hotel Accommodation
              </h4>
              <span className="nta-modal-day1-pill">Stay & Check-In</span>
            </div>

            {day1Hotel ? (
              <div className="nta-modal-hotel-card">
                <div className="nta-modal-hotel-header">
                  <div className="nta-modal-hotel-name-group">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    <div>
                      <h5 className="nta-modal-hotel-name">
                        {day1Hotel.name || `${plan.destination} Partner Hotel`}
                      </h5>
                      <span className="nta-modal-hotel-room">
                        {day1Hotel.roomType || 'Standard Room'}
                      </span>
                    </div>
                  </div>
                  <span className="nta-modal-hotel-stars">
                    {day1Hotel.stars || stars}★ Partner
                  </span>
                </div>

                <div className="nta-modal-hotel-meta-grid">
                  <div>
                    <span className="nta-meta-label">Check-In</span>
                    <span className="nta-meta-text">
                      {day1Hotel.checkInDate || 'Scheduled Day 1'}
                    </span>
                  </div>
                  <div>
                    <span className="nta-meta-label">Check-Out</span>
                    <span className="nta-meta-text">
                      {day1Hotel.checkOutDate || `Day ${nights + 1}`}
                    </span>
                  </div>
                  <div>
                    <span className="nta-meta-label">Location / City</span>
                    <span className="nta-meta-text">{plan.destination}</span>
                  </div>
                  <div>
                    <span className="nta-meta-label">Status</span>
                    <span className="nta-meta-text" style={{ textTransform: 'capitalize' }}>
                      {day1Hotel.status || 'Confirmed'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="nta-modal-empty-state">
                <p>Hotel accommodation details to be assigned upon booking confirmation.</p>
              </div>
            )}
          </div>

          {/* Days 2+: Curated Local Experiences Timeline */}
          <div className="nta-modal-section">
            <h4 className="nta-modal-section-title">
              Days 2+ — Curated Daily Experiences Timeline
            </h4>

            {experienceDays.length > 0 ? (
              <div className="nta-modal-timeline">
                {experienceDays.map((dayGroup, dayIdx) => {
                  const dayNumber = dayGroup.dayNumber || dayIdx + 2;
                  const experiences = Array.isArray(dayGroup.experiences)
                    ? dayGroup.experiences
                    : [];

                  return (
                    <div key={dayIdx} className="nta-modal-timeline-day">
                      <div className="nta-timeline-day-marker">
                        <span className="nta-timeline-day-pill">Day {dayNumber}</span>
                      </div>

                      <div className="nta-timeline-day-content">
                        {experiences.length > 0 ? (
                          <div className="nta-timeline-exp-list">
                            {experiences.map((exp, expIdx) => (
                              <div key={expIdx} className="nta-timeline-exp-card">
                                <div className="nta-timeline-exp-header">
                                  <h6 className="nta-timeline-exp-title">
                                    {exp.title || 'Curated Guided Activity'}
                                  </h6>
                                  {exp.status && (
                                    <span className="nta-timeline-exp-status">
                                      {exp.status}
                                    </span>
                                  )}
                                </div>

                                <div className="nta-timeline-exp-details">
                                  <span className="nta-timeline-exp-location">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                      <circle cx="12" cy="10" r="3" />
                                    </svg>
                                    {exp.location || plan.destination}
                                  </span>
                                  {(exp.startsAt || exp.endsAt) && (
                                    <span className="nta-timeline-exp-time">
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <polyline points="12 6 12 12 16 14" />
                                      </svg>
                                      {exp.startsAt ? exp.startsAt.slice(0, 10).includes('T') ? exp.startsAt.split('T')[1].slice(0, 5) : exp.startsAt : ''}
                                      {exp.endsAt ? ` – ${exp.endsAt.slice(0, 10).includes('T') ? exp.endsAt.split('T')[1].slice(0, 5) : exp.endsAt}` : ''}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="nta-timeline-day-empty">
                            Free day for leisure and independent hotel relaxation.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="nta-modal-empty-state">
                <p>No extra guided activities specified. Package is centered on partner hotel stay and leisure.</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="nta-modal-footer">
          {onEdit && canEdit && (
            <button
              type="button"
              className="nta-modal-btn-edit"
              onClick={() => {
                onClose();
                onEdit(plan);
              }}
            >
              Edit Package
            </button>
          )}

          <button
            type="button"
            className="nta-modal-btn-close"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
