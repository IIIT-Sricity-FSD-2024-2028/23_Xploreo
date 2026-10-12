// Display meta for experience booking statuses (backend ExperienceBookingStatus).
// `className` is the original stylesheet's status class (.status.confirmed / .checked / .cancelled ...).
const META = {
  CONFIRMED: { label: 'Confirmed', className: 'confirmed', group: 'confirmed' },
  CHECKED_IN: { label: 'Checked-In', className: 'checked', group: 'checked_in' },
  END_REQUESTED: { label: 'Pending Confirm', className: 'pending', group: 'end_requested' },
  COMPLETED: { label: 'Completed', className: 'completed', group: 'completed' },
  CANCELLED: { label: 'Cancelled', className: 'cancelled', group: 'cancelled' },
};

export function bookingStatusMeta(status) {
  return META[String(status).toUpperCase()] ?? { label: 'Cancelled', className: 'cancelled', group: 'cancelled' };
}

export const STATUS_FILTERS = [
  { value: 'all', label: 'All Status' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'checked_in', label: 'Checked-In' },
  { value: 'end_requested', label: 'Pending Confirm' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];
