// Status pill used on the guide dashboard (applications and jobs). Labels and colours are the old page's.
const CHIPS = {
  pending: ['🕐 Pending', '#f59e0b', '#fffbeb'],
  accepted: ['✅ Accepted', '#16a34a', '#f0fdf4'],
  rejected: ['❌ Rejected', '#dc2626', '#fef2f2'],
  pending_guide_confirm: ['⏳ Awaiting Confirmation', '#7c3aed', '#f5f3ff'],
  confirmed: ['✅ Confirmed', '#16a34a', '#f0fdf4'],
  rejected_by_guide: ['❌ Guide Rejected', '#dc2626', '#fef2f2'],
  cancelled: ['🚫 Cancelled', '#6b7280', '#f9fafb'],
};

export default function StatusChip({ status }) {
  const [label, color, background] = CHIPS[status] || [String(status ?? ''), '#6b7280', '#f9fafb'];
  return (
    <span className="gd-chip" style={{ color, background, borderColor: `${color}20` }}>
      {label}
    </span>
  );
}
