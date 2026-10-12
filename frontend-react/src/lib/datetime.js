// Small pure helpers shared by M2 pages (display only; nothing here talks to the server).

const pad = (n) => String(n).padStart(2, '0');

export function toIsoDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayIso() {
  return toIsoDate(new Date());
}

export function tomorrowIso() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toIsoDate(d);
}

// '09:30 AM' | '9:30 am' | '14:05'  ->  minutes since midnight (unknown -> Infinity)
export function timeToMinutes(value) {
  const text = String(value ?? '').trim();
  const h24 = text.match(/^(\d{1,2}):(\d{2})$/);
  if (h24) return Number(h24[1]) * 60 + Number(h24[2]);
  const h12 = text.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
  if (!h12) return Number.POSITIVE_INFINITY;
  let hour = Number(h12[1]) % 12;
  if (h12[3].toUpperCase() === 'PM') hour += 12;
  return hour * 60 + Number(h12[2]);
}

// '14:05' -> '02:05 PM' (the format experience slots use); already-12h values pass through.
export function to12Hour(value) {
  const text = String(value ?? '').trim();
  const h24 = text.match(/^(\d{1,2}):(\d{2})$/);
  if (!h24) return text;
  const hour = Number(h24[1]);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  return `${pad(hour % 12 === 0 ? 12 : hour % 12)}:${h24[2]} ${suffix}`;
}

// '02:05 PM' -> '14:05' (for <input type="time">)
export function to24Hour(value) {
  const minutes = timeToMinutes(value);
  if (!Number.isFinite(minutes)) return '';
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

export function compareSlots(a, b) {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  return timeToMinutes(a.time) - timeToMinutes(b.time);
}

export function formatDate(iso, options) {
  if (!iso) return '—';
  const date = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return String(iso);
  return date.toLocaleDateString('en-US', options ?? { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

// Display state for one slot. The server decides availability; this only labels it.
export function slotState(slot) {
  const capacity = Number(slot.capacity) || 0;
  const booked = Number(slot.booked) || 0;
  const percent = capacity ? Math.min(100, Math.round((booked / capacity) * 100)) : 0;
  if (capacity && booked >= capacity) return { key: 'full', label: 'Full', tone: 'danger', percent };
  if (!slot.available) return { key: 'closed', label: 'Closed', tone: 'neutral', percent };
  if (percent > 85) return { key: 'nearly-full', label: 'Nearly full', tone: 'warning', percent };
  return { key: 'available', label: 'Available', tone: 'success', percent };
}
