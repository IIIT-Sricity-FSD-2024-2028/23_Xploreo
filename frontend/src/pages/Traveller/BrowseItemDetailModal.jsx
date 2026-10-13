import { useEffect } from 'react';
import { formatCurrency } from '../../utils/checkoutUtils.js';

/**
 * BrowseItemDetailModal
 * Accessible modal displaying full entity details and specifications.
 */
export default function BrowseItemDetailModal({
  item,
  category,
  onClose,
  onBook,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!item) return null;

  return (
    <div
      className="trav-browse-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="browse-modal-title"
      onClick={onClose}
    >
      <div
        className="trav-browse-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="trav-browse-modal-header">
          <div>
            <span className="trav-browse-modal-badge">{category?.toUpperCase()}</span>
            <h2 id="browse-modal-title" className="trav-browse-modal-title">
              {item.name || item.title || `${item.fname || ''} ${item.lname || ''}`.trim()}
            </h2>
            <p className="trav-browse-modal-subtitle">
              📍 {item.location || item.city || item.destination || 'India'}
            </p>
          </div>
          <button
            type="button"
            className="trav-browse-modal-close"
            onClick={onClose}
            aria-label="Close details"
          >
            ✕
          </button>
        </header>

        <div className="trav-browse-modal-body">
          {item.description && (
            <div className="trav-browse-modal-section">
              <h4>Overview</h4>
              <p>{item.description}</p>
            </div>
          )}

          {item.bio && (
            <div className="trav-browse-modal-section">
              <h4>About the Guide</h4>
              <p>{item.bio}</p>
              {item.years_exp && (
                <p className="trav-browse-modal-meta">
                  <strong>Experience:</strong> {item.years_exp} years in field
                </p>
              )}
            </div>
          )}

          {/* Hotel Specifics */}
          {item.amenities && item.amenities.length > 0 && (
            <div className="trav-browse-modal-section">
              <h4>Included Amenities</h4>
              <ul className="trav-browse-modal-list">
                {item.amenities.map((amenity, i) => (
                  <li key={i}>✓ {amenity}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Experience Specifics */}
          {item.slots && item.slots.length > 0 && (
            <div className="trav-browse-modal-section">
              <h4>Available Schedule Slots</h4>
              <div className="trav-browse-modal-slots">
                {item.slots.map((s) => (
                  <div key={s.id} className="trav-browse-slot-chip">
                    <span>{s.date} at {s.time}</span>
                    <small>({s.capacity - s.booked} spots left)</small>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Plan Specifics */}
          {item.tags && item.tags.length > 0 && (
            <div className="trav-browse-modal-section">
              <h4>Package Highlights</h4>
              <div className="trav-browse-card-tags">
                {item.tags.map((tag, idx) => (
                  <span key={idx} className="trav-browse-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Guide Specifics */}
          {item.lang_spoken && item.lang_spoken.length > 0 && (
            <div className="trav-browse-modal-section">
              <h4>Languages Spoken</h4>
              <p>{item.lang_spoken.join(', ')}</p>
            </div>
          )}

          {item.certifications && item.certifications.length > 0 && (
            <div className="trav-browse-modal-section">
              <h4>Credentials & Certifications</h4>
              <ul className="trav-browse-modal-list">
                {item.certifications.map((c, i) => (
                  <li key={i}>🛡 {c}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Pricing Info */}
          {(item.pricePerNight !== undefined || item.price !== undefined || item.pricePerPerson !== undefined) && (
            <div className="trav-browse-modal-pricing">
              <span className="trav-browse-price-label">Starting Rate:</span>
              <span className="trav-browse-price-amount">
                {formatCurrency(item.pricePerNight || item.price || item.pricePerPerson || 0)}
              </span>
            </div>
          )}
        </div>

        <footer className="trav-browse-modal-footer">
          <button
            type="button"
            className="trav-browse-btn trav-browse-btn-outline"
            onClick={onClose}
          >
            Close
          </button>
          {onBook && (
            <button
              type="button"
              className="trav-browse-btn trav-browse-btn-primary"
              onClick={() => {
                onBook(item);
                if (onClose) onClose();
              }}
            >
              Proceed with Selection
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
