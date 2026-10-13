/**
 * BrowseGuideCard
 * Accessible card representing a Local Guide profile.
 * Conforms to backend Guide entity:
 * { userId, fname, lname, location, prof_title, years_exp, bio, lang_spoken, certifications }
 */
export default function BrowseGuideCard({ guide, onSelect, onRequest }) {
  if (!guide) return null;

  const {
    userId,
    fname = 'Local',
    lname = 'Guide',
    location = 'Region',
    prof_title = 'Certified Tour Guide',
    years_exp = 1,
    bio = '',
    lang_spoken = [],
    certifications = [],
  } = guide;

  const fullName = `${fname} ${lname}`.trim();

  return (
    <article className="trav-browse-card" data-testid={`guide-card-${userId}`}>
      <div className="trav-browse-card-media">
        <div className="trav-browse-card-image-fallback" aria-hidden="true">
          🧑‍🌾
        </div>
        <div className="trav-browse-card-badge-top">
          <span className="trav-browse-exp-badge">
            {years_exp}+ Years Exp.
          </span>
          <span className="trav-browse-verified-badge" aria-label="Verified Local Guide">
            ✓ Verified
          </span>
        </div>
      </div>

      <div className="trav-browse-card-content">
        <div className="trav-browse-card-header">
          <h3 className="trav-browse-card-title">{fullName}</h3>
          <p className="trav-browse-guide-title">{prof_title}</p>
          <p className="trav-browse-card-location">
            <span aria-hidden="true">📍</span> {location}
          </p>
        </div>

        {bio && (
          <p className="trav-browse-guide-bio">
            {bio.length > 110 ? `${bio.slice(0, 110)}...` : bio}
          </p>
        )}

        {lang_spoken && lang_spoken.length > 0 && (
          <div className="trav-browse-card-tags" aria-label="Languages spoken">
            <span className="trav-browse-tag-label">Speaks:</span>
            {lang_spoken.map((lang, idx) => (
              <span key={idx} className="trav-browse-tag trav-browse-tag-lang">
                {lang}
              </span>
            ))}
          </div>
        )}

        {certifications && certifications.length > 0 && (
          <div className="trav-browse-card-tags" aria-label="Certifications">
            {certifications.slice(0, 2).map((cert, idx) => (
              <span key={idx} className="trav-browse-tag trav-browse-tag-cert">
                🛡 {cert}
              </span>
            ))}
          </div>
        )}

        <div className="trav-browse-card-footer">
          <div className="trav-browse-guide-status">
            <span className="trav-browse-status-dot" aria-hidden="true" />
            <span>Available for Booking</span>
          </div>

          <div className="trav-browse-card-actions">
            {onSelect && (
              <button
                type="button"
                className="trav-browse-btn trav-browse-btn-outline"
                onClick={() => onSelect(guide)}
                aria-label={`View profile for ${fullName}`}
              >
                View Profile
              </button>
            )}
            {onRequest && (
              <button
                type="button"
                className="trav-browse-btn trav-browse-btn-primary"
                onClick={() => onRequest(guide)}
                aria-label={`Request guide ${fullName}`}
              >
                Book Guide
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
