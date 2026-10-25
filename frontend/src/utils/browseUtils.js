/**
 * browseUtils.js
 * Utility functions, filters, sorting algorithms, and standard fixtures
 * conforming to backend contracts (HotelRecord, ExperienceRecord, PlanRecord, Guide).
 */

export const BROWSE_CATEGORIES = Object.freeze({
  HOTELS: 'hotels',
  EXPERIENCES: 'experiences',
  PLANS: 'plans',
  GUIDES: 'guides',
});

export const SORT_OPTIONS = Object.freeze({
  DEFAULT: 'default',
  PRICE_LOW: 'price_asc',
  PRICE_HIGH: 'price_desc',
  RATING: 'rating_desc',
  NAME: 'name_asc',
});

/**
 * Validates search input query.
 * @param {string} query
 * @returns {{ isValid: boolean, sanitized: string, error?: string }}
 */
export function validateSearchInput(query) {
  if (typeof query !== 'string') {
    return { isValid: true, sanitized: '' };
  }
  const trimmed = query.trim();
  if (trimmed.length > 80) {
    return {
      isValid: false,
      sanitized: trimmed.slice(0, 80),
      error: 'Search query cannot exceed 80 characters',
    };
  }
  return { isValid: true, sanitized: trimmed };
}

// How far ahead a traveller can search/book (native <input type="date"> happily accepts a
// 6-digit year like "211000" when typed — the HTML date spec allows years up to 275760, it's
// just nonsense for a travel booking. Reject anything outside [today, today + N years].
const MAX_BOOKING_YEARS_AHEAD = 2;

/**
 * Validate a date-input value (expects the native "YYYY-MM-DD" format).
 * Returns { isValid, sanitized, error }: sanitized is '' when invalid/unparseable, or clamped
 * to the nearest allowed bound when the date is real but out of range.
 */
export function validateDateInput(value, { minDate, maxDate } = {}) {
  if (!value) return { isValid: true, sanitized: '' };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { isValid: false, sanitized: '', error: 'Enter a valid date.' };
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return { isValid: false, sanitized: '', error: 'Enter a valid date.' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const min = minDate ? new Date(`${minDate}T00:00:00`) : today;
  const max = maxDate
    ? new Date(`${maxDate}T00:00:00`)
    : new Date(today.getFullYear() + MAX_BOOKING_YEARS_AHEAD, today.getMonth(), today.getDate());

  if (parsed < min) {
    return { isValid: false, sanitized: toIsoDate(min), error: `Date cannot be before ${toIsoDate(min)}.` };
  }
  if (parsed > max) {
    return { isValid: false, sanitized: toIsoDate(max), error: `Date cannot be after ${toIsoDate(max)}.` };
  }
  return { isValid: true, sanitized: value };
}

function toIsoDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Filter and sort hotels based on search parameters.
 */
export function filterHotels(hotels = [], filters = {}) {
  if (!Array.isArray(hotels)) return [];
  const { query = '', location = '', minStars = 0, maxPrice = Infinity, sortBy = SORT_OPTIONS.DEFAULT } = filters;
  const q = query.trim().toLowerCase();
  const loc = location.trim().toLowerCase();

  let result = hotels.filter((h) => {
    if (!h) return false;
    const nameMatch = !q || (h.name && h.name.toLowerCase().includes(q)) || (h.city && h.city.toLowerCase().includes(q));
    const locMatch = !loc || (h.location && h.location.toLowerCase().includes(loc)) || (h.city && h.city.toLowerCase().includes(loc));
    const starMatch = !minStars || Number(h.stars || 0) >= Number(minStars);
    const priceMatch = !maxPrice || Number(h.pricePerNight || 0) <= Number(maxPrice);
    const statusMatch = !h.status || h.status === 'active';
    return nameMatch && locMatch && starMatch && priceMatch && statusMatch;
  });

  if (sortBy === SORT_OPTIONS.PRICE_LOW) {
    result.sort((a, b) => Number(a.pricePerNight || 0) - Number(b.pricePerNight || 0));
  } else if (sortBy === SORT_OPTIONS.PRICE_HIGH) {
    result.sort((a, b) => Number(b.pricePerNight || 0) - Number(a.pricePerNight || 0));
  } else if (sortBy === SORT_OPTIONS.RATING) {
    result.sort((a, b) => Number(b.rating || b.stars || 0) - Number(a.rating || a.stars || 0));
  } else if (sortBy === SORT_OPTIONS.NAME) {
    result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  return result;
}

/**
 * Filter and sort experiences.
 */
export function filterExperiences(experiences = [], filters = {}) {
  if (!Array.isArray(experiences)) return [];
  const { query = '', destination = '', category = '', maxPrice = Infinity, sortBy = SORT_OPTIONS.DEFAULT } = filters;
  const q = query.trim().toLowerCase();
  const dest = destination.trim().toLowerCase();
  const cat = category.trim().toLowerCase();

  let result = experiences.filter((e) => {
    if (!e) return false;
    const textMatch =
      !q ||
      (e.title && e.title.toLowerCase().includes(q)) ||
      (e.destination && e.destination.toLowerCase().includes(q)) ||
      (e.description && e.description.toLowerCase().includes(q));
    const destMatch = !dest || (e.destination && e.destination.toLowerCase().includes(dest));
    const catMatch = !cat || cat === 'all' || (e.category && e.category.toLowerCase() === cat);
    const priceMatch = !maxPrice || Number(e.price || 0) <= Number(maxPrice);
    return textMatch && destMatch && catMatch && priceMatch;
  });

  if (sortBy === SORT_OPTIONS.PRICE_LOW) {
    result.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  } else if (sortBy === SORT_OPTIONS.PRICE_HIGH) {
    result.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
  } else if (sortBy === SORT_OPTIONS.NAME) {
    result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  }

  return result;
}

/**
 * Filter and sort tour packages / plans.
 */
export function filterPlans(plans = [], filters = {}) {
  if (!Array.isArray(plans)) return [];
  const { query = '', destination = '', maxPrice = Infinity, sortBy = SORT_OPTIONS.DEFAULT } = filters;
  const q = query.trim().toLowerCase();
  const dest = destination.trim().toLowerCase();

  let result = plans.filter((p) => {
    if (!p) return false;
    const pStatus = (p.status || 'available').toLowerCase();
    if (pStatus === 'draft' || pStatus === 'unpublished' || pStatus === 'unavailable') {
      return false;
    }
    const textMatch =
      !q ||
      (p.title && p.title.toLowerCase().includes(q)) ||
      (p.destination && p.destination.toLowerCase().includes(q)) ||
      (p.originCity && p.originCity.toLowerCase().includes(q));
    const destMatch = !dest || (p.destination && p.destination.toLowerCase().includes(dest));
    const priceMatch = !maxPrice || Number(p.pricePerPerson || 0) <= Number(maxPrice);
    return textMatch && destMatch && priceMatch;
  });

  if (sortBy === SORT_OPTIONS.PRICE_LOW) {
    result.sort((a, b) => Number(a.pricePerPerson || 0) - Number(b.pricePerPerson || 0));
  } else if (sortBy === SORT_OPTIONS.PRICE_HIGH) {
    result.sort((a, b) => Number(b.pricePerPerson || 0) - Number(a.pricePerPerson || 0));
  } else if (sortBy === SORT_OPTIONS.NAME) {
    result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  }

  return result;
}

/**
 * Filter and sort local guides.
 */
export function filterGuides(guides = [], filters = {}) {
  if (!Array.isArray(guides)) return [];
  const { query = '', location = '', language = '', sortBy = SORT_OPTIONS.DEFAULT } = filters;
  const q = query.trim().toLowerCase();
  const loc = location.trim().toLowerCase();
  const lang = language.trim().toLowerCase();

  let result = guides.filter((g) => {
    if (!g) return false;
    const fullName = `${g.fname || ''} ${g.lname || ''}`.trim().toLowerCase();
    const textMatch =
      !q ||
      fullName.includes(q) ||
      (g.location && g.location.toLowerCase().includes(q)) ||
      (g.prof_title && g.prof_title.toLowerCase().includes(q));
    const locMatch = !loc || (g.location && g.location.toLowerCase().includes(loc));
    const langMatch =
      !lang ||
      lang === 'all' ||
      (Array.isArray(g.lang_spoken) && g.lang_spoken.some((l) => l.toLowerCase() === lang));
    return textMatch && locMatch && langMatch;
  });

  if (sortBy === SORT_OPTIONS.NAME) {
    result.sort((a, b) => (a.fname || '').localeCompare(b.fname || ''));
  } else if (sortBy === SORT_OPTIONS.RATING) {
    result.sort((a, b) => Number(b.years_exp || 0) - Number(a.years_exp || 0));
  }

  return result;
}

import browseData from '@database/fixtures/browse/browse_fixtures.json';

export const DEFAULT_HOTEL_FIXTURES = browseData.hotels;
export const DEFAULT_EXPERIENCE_FIXTURES = browseData.experiences;
export const DEFAULT_PLAN_FIXTURES = browseData.plans;
export const DEFAULT_GUIDE_FIXTURES = browseData.guides;


/**
 * Maps raw backend Hotel entity/DTO to frontend BrowseHotelCard props.
 * @param {object} raw
 * @returns {object|null}
 */
export function mapBackendHotel(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    id: raw.id || `hotel-${Math.random().toString(36).slice(2, 9)}`,
    name: raw.name || 'Unnamed Hotel',
    city: raw.city || '',
    location: raw.location || raw.city || '',
    description: raw.description || '',
    stars: typeof raw.stars === 'number' ? raw.stars : (Number(raw.stars) || 3),
    rating: typeof raw.rating === 'number' ? raw.rating : (Number(raw.rating) || 0),
    reviewCount: typeof raw.reviewCount === 'number' ? raw.reviewCount : (Number(raw.reviewCount) || 0),
    pricePerNight: typeof raw.pricePerNight === 'number' ? raw.pricePerNight : (Number(raw.pricePerNight) || 0),
    taxesAndFees: typeof raw.taxesAndFees === 'number' ? raw.taxesAndFees : (Number(raw.taxesAndFees) || 0),
    image: raw.image || '',
    amenities: Array.isArray(raw.amenities) ? raw.amenities : [],
    status: raw.status || 'active',
  };
}

/**
 * Maps raw backend Experience entity/DTO to frontend BrowseExperienceCard props.
 * @param {object} raw
 * @returns {object|null}
 */
export function mapBackendExperience(raw) {
  if (!raw || typeof raw !== 'object') return null;
  let nextSlot = raw.nextSlot;
  if (!nextSlot && Array.isArray(raw.slots) && raw.slots[0]) {
    nextSlot = `${raw.slots[0].date} ${raw.slots[0].time || ''}`.trim();
  }
  return {
    id: raw.id || `exp-${Math.random().toString(36).slice(2, 9)}`,
    partnerId: raw.partnerId || '',
    title: raw.title || 'Unnamed Experience',
    description: raw.description || '',
    destination: raw.destination || '',
    category: (raw.category || 'adventure').toLowerCase(),
    availability: raw.availability || 'available',
    price: typeof raw.price === 'number' ? raw.price : (Number(raw.price) || 0),
    durationHours: typeof raw.durationHours === 'number' ? raw.durationHours : (Number(raw.durationHours) || 2),
    capacity: typeof raw.capacity === 'number' ? raw.capacity : (Number(raw.capacity) || 10),
    booked: typeof raw.booked === 'number' ? raw.booked : (Number(raw.booked) || 0),
    image: raw.image || '',
    nextSlot: nextSlot || 'Available daily',
    slots: Array.isArray(raw.slots) ? raw.slots : [],
  };
}

/**
 * Maps raw backend Plan entity/DTO to frontend BrowsePlanCard props.
 * Flights are strictly excluded per project requirements.
 * @param {object} raw
 * @returns {object|null}
 */
export function mapBackendPlan(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    id: raw.id || `plan-${Math.random().toString(36).slice(2, 9)}`,
    title: raw.title || 'Curated Tour Package',
    description: raw.description || '',
    originCity: raw.originCity || raw.from || '',
    destination: raw.destination || raw.to || '',
    durationNights: typeof raw.durationNights === 'number'
      ? raw.durationNights
      : (Number(raw.duration || raw.durationNights) || 3),
    pricePerPerson: typeof raw.pricePerPerson === 'number'
      ? raw.pricePerPerson
      : (Number(raw.price || raw.pricePerPerson) || 0),
    hotelStars: typeof raw.hotelStars === 'number' ? raw.hotelStars : (Number(raw.hotelStars) || 3),
    includesFlight: Boolean(raw.includesFlight),
    status: raw.status || 'available',
    image: raw.image || '',
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    itinerary: raw.itinerary || null,
  };
}

/**
 * Maps raw backend Guide entity/DTO to frontend BrowseGuideCard props.
 * @param {object} raw
 * @returns {object|null}
 */
export function mapBackendGuide(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    userId: raw.userId || raw.id || `guide-${Math.random().toString(36).slice(2, 9)}`,
    fname: raw.fname || 'Local',
    lname: raw.lname || '',
    email: raw.email || '',
    phone: raw.phone || '',
    location: raw.location || 'Region',
    prof_title: raw.prof_title || 'Certified Tour Guide',
    years_exp: typeof raw.years_exp === 'number' ? raw.years_exp : (Number(raw.years_exp) || 1),
    bio: raw.bio || '',
    lang_spoken: Array.isArray(raw.lang_spoken) ? raw.lang_spoken : [],
    certifications: Array.isArray(raw.certifications) ? raw.certifications : [],
  };
}
