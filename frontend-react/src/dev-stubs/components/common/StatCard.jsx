// TEMP-STUB for components/common/StatCard. Props: { label, value, hint, tone }
export function StatCard({ label, value, hint, tone = 'blue' }) {
  return (
    <article className={`ui-stat ui-stat-${tone}`}>
      <p className="ui-stat-label">{label}</p>
      <h2 className="ui-stat-value">{value}</h2>
      {hint ? <span className="ui-stat-hint">{hint}</span> : null}
    </article>
  );
}
