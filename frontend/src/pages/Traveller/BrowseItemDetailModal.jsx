import { useEffect } from 'react';
import { formatCurrency } from '../../utils/checkoutUtils.js';

const FALLBACK_MODAL_IMAGES = {
  hotels: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=1200',
  experiences: 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&q=80&w=1200',
  plans: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&q=80&w=1200',
  guides: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800',
};

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

  const title = item.name || item.title || `${item.fname || ''} ${item.lname || ''}`.trim() || 'Item Details';
  const heroImage = item.image || item.images?.[0] || FALLBACK_MODAL_IMAGES[category] || FALLBACK_MODAL_IMAGES.hotels;
  const startingRate = item.pricePerNight ?? item.price ?? item.pricePerPerson ?? 0;
  const isSoldOut = (item.status || '').toLowerCase() === 'sold_out';

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
        <div style={{ position: 'relative', width: '100%', height: '240px', overflow: 'hidden' }}>
          <img
            src={heroImage}
            alt={title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <button
            type="button"
            className="trav-browse-modal-close"
            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(15,23,42,0.7)', color: '#ffffff' }}
            onClick={onClose}
            aria-label="Close details"
          >
            ✕
          </button>
        </div>

        <header className="trav-browse-modal-header">
          <div>
            <span className="trav-browse-modal-badge">{category?.toUpperCase()}</span>
            <h2 id="browse-modal-title" className="trav-browse-modal-title">
              {title}
            </h2>
            <p className="trav-browse-modal-subtitle">
              📍 {item.location || item.city || item.destination || 'India'}
            </p>
          </div>
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
                <p className="trav-browse-modal-meta" style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
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
                    <small style={{ display: 'block', color: '#64748b' }}>({s.capacity - s.booked} spots left)</small>
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
              <span className="trav-browse-price-amount" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                {formatCurrency(startingRate)}
              </span>
            </div>
          )}

          {isSoldOut && (
            <div
              role="alert"
              style={{
                marginTop: '1rem',
                padding: '12px 16px',
                borderRadius: '8px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                fontWeight: 600,
                fontSize: '0.9rem',
                textAlign: 'center',
              }}
            >
              This travel package is currently Sold Out. Bookings are unavailable.
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
              className={`trav-browse-btn ${isSoldOut ? 'trav-browse-btn-disabled' : 'trav-browse-btn-primary'}`}
              disabled={isSoldOut}
              style={isSoldOut ? { opacity: 0.6, cursor: 'not-allowed', background: '#94a3b8', borderColor: '#94a3b8' } : {}}
              onClick={() => {
                if (isSoldOut) return;
                onBook(item);
                if (onClose) onClose();
              }}
            >
              {isSoldOut ? 'Sold Out' : 'Proceed with Selection'}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
