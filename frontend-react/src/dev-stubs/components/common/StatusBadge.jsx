// TEMP-STUB for components/common/StatusBadge.
// Props: { tone: 'success'|'warning'|'danger'|'info'|'neutral', children }
export function StatusBadge({ tone = 'neutral', children }) {
  return <span className={`ui-badge ui-badge-${tone}`}>{children}</span>;
}
