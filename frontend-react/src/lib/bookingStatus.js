// Display meta for experience booking statuses (backend ExperienceBookingStatus).
const META = {
  CONFIRMED: { label: 'Confirmed', tone: 'info', group: 'confirmed' },
  CHECKED_IN: { label: 'Checked in', tone: 'success', group: 'checked_in' },
  END_REQUESTED: { label: 'Awaiting traveller', tone: 'warning', group: 'end_requested' },
  COMPLETED: { label: 'Completed', tone: 'success', group: 'completed' },
  CANCELLED: { label: 'Cancelled', tone: 'danger', group: 'cancelled' },
};

export function bookingStatusMeta(status) {
  return META[String(status).toUpperCase()] ?? { label: String(status), tone: 'neutral', group: 'confirmed' };
}

export const STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'checked_in', label: 'Checked in' },
  { value: 'end_requested', label: 'Awaiting traveller' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];
