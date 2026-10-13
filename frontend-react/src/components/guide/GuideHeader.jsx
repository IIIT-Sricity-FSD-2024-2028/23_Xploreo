// The blue banner at the top of the guide dashboard / earnings / reviews (.guide-page-header).
export default function GuideHeader({ name, subtitle, children }) {
  const initial = String(name || 'G').trim()[0]?.toUpperCase() || 'G';
  return (
    <div className="guide-page-header">
      <div className="guide-page-header-left">
        <div className="guide-page-avatar" aria-hidden="true">{initial}</div>
        <div>
          <h1 className="guide-page-title">Welcome, {name || 'Guide'}!</h1>
          <p className="guide-page-subtitle">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export function HeaderStat({ value, label, tone }) {
  return (
    <div className="guide-header-stat">
      <span className={`guide-header-stat-num${tone ? ` guide-stat-${tone}` : ''}`}>{value}</span>
      <span className="guide-header-stat-label">{label}</span>
    </div>
  );
}
