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
 * Determines real-time session slot availability for an experience.
 * Filters out sessions whose date and time have passed.
 * Returns true availability, earliest upcoming slot, and spots remaining.
 * @param {object} experience
 * @param {Date|string} [referenceDate=new Date()]
 * @returns {{
 *   hasUpcomingSlots: boolean,
 *   isSoldOut: boolean,
 *   nextSlotText: string,
 *   spotsRemaining: number,
 *   statusText: string,
 *   isPast: boolean
 * }}
 */
export function getExperienceAvailability(experience, referenceDate = new Date()) {
  if (!experience || typeof experience !== 'object') {
    return {
      hasUpcomingSlots: false,
      isSoldOut: true,
      nextSlotText: 'No upcoming sessions',
      spotsRemaining: 0,
      statusText: 'Unavailable',
      isPast: false,
    };
  }

  const ref = typeof referenceDate === 'string' ? new Date(referenceDate) : referenceDate;
  const todayIso = ref.toISOString().slice(0, 10);
  const currentTime = ref.toTimeString().slice(0, 5);

  const slots = Array.isArray(experience.slots) ? experience.slots : [];

  if (slots.length > 0) {
    const isSlotPast = (s) => {
      if (!s || !s.date) return false;
      const sDate = String(s.date).slice(0, 10);
      if (sDate < todayIso) return true;
      if (sDate === todayIso && s.time && String(s.time).slice(0, 5) < currentTime) {
        return true;
      }
      return false;
    };

    const upcomingSlots = slots.filter((s) => !isSlotPast(s));

    if (upcomingSlots.length === 0) {
      return {
        hasUpcomingSlots: false,
        isSoldOut: true,
        nextSlotText: 'No upcoming sessions',
        spotsRemaining: 0,
        statusText: 'Session passed',
        isPast: true,
      };
    }

    // Sort upcoming slots chronologically
    const sortedUpcoming = [...upcomingSlots].sort((a, b) => {
      const dateA = `${String(a.date).slice(0, 10)} ${a.time || '00:00'}`;
      const dateB = `${String(b.date).slice(0, 10)} ${b.time || '00:00'}`;
      return dateA.localeCompare(dateB);
    });

    const availableSlots = sortedUpcoming.filter((s) => {
      const cap = s.capacity ?? experience.capacity ?? 10;
      const bkd = s.booked ?? 0;
      const spotsLeft = cap - bkd;
      return s.available !== false && spotsLeft > 0;
    });

    if (availableSlots.length === 0) {
      const earliest = sortedUpcoming[0];
      return {
        hasUpcomingSlots: true,
        isSoldOut: true,
        nextSlotText: `${earliest.date} ${earliest.time || ''}`.trim(),
        spotsRemaining: 0,
        statusText: 'Fully Booked',
        isPast: false,
      };
    }

    const nextAvailable = availableSlots[0];
    const cap = nextAvailable.capacity ?? experience.capacity ?? 10;
    const bkd = nextAvailable.booked ?? 0;
    const spots = Math.max(0, cap - bkd);
    return {
      hasUpcomingSlots: true,
      isSoldOut: false,
      nextSlotText: `${nextAvailable.date} ${nextAvailable.time || ''}`.trim(),
      spotsRemaining: spots,
      statusText: `${spots} spots left`,
      isPast: false,
    };
  }

  // Fallback when slots array is not present
  if (experience.nextSlot && typeof experience.nextSlot === 'string') {
    const match = /^(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2}))?/.exec(experience.nextSlot.trim());
    if (match) {
      const slotDate = match[1];
      const slotTime = match[2] || '23:59';
      if (slotDate < todayIso || (slotDate === todayIso && slotTime < currentTime)) {
        return {
          hasUpcomingSlots: false,
          isSoldOut: true,
          nextSlotText: 'No upcoming sessions',
          spotsRemaining: 0,
          statusText: 'Session passed',
          isPast: true,
        };
      }
    }
  }

  const expStatus = (experience.availability || experience.status || 'available').toLowerCase();
  if (expStatus === 'unavailable' || expStatus === 'sold_out') {
    return {
      hasUpcomingSlots: false,
      isSoldOut: true,
      nextSlotText: 'Currently unavailable',
      spotsRemaining: 0,
      statusText: 'Unavailable',
      isPast: false,
    };
  }

  const cap = typeof experience.capacity === 'number' ? experience.capacity : 10;
  const bkd = typeof experience.booked === 'number' ? experience.booked : 0;
  const spots = Math.max(0, cap - bkd);
  return {
    hasUpcomingSlots: spots > 0,
    isSoldOut: spots <= 0,
    nextSlotText: experience.nextSlot || 'Available daily',
    spotsRemaining: spots,
    statusText: spots > 0 ? `${spots} spots left` : 'Fully Booked',
    isPast: false,
  };
}

/**
 * Determines room availability for a hotel.
 * @param {object} hotel
 * @returns {{ isSoldOut: boolean, roomsLeft: number, statusText: string }}
 */
export function getHotelAvailability(hotel) {
  if (!hotel || typeof hotel !== 'object') {
    return { isSoldOut: true, roomsLeft: 0, statusText: 'Unavailable' };
  }
  const status = (hotel.status || 'active').toLowerCase();
  if (status === 'unavailable' || status === 'sold_out' || status === 'archived') {
    return { isSoldOut: true, roomsLeft: 0, statusText: 'Sold Out' };
  }

  const availableRooms = hotel.availableRooms !== undefined
    ? Number(hotel.availableRooms)
    : (Array.isArray(hotel.rooms) && hotel.rooms.length > 0
        ? hotel.rooms.reduce((acc, r) => acc + (r.availableRooms ?? r.totalRooms ?? 0), 0)
        : undefined);

  if (availableRooms !== undefined && availableRooms <= 0) {
    return { isSoldOut: true, roomsLeft: 0, statusText: 'Sold Out' };
  }

  const roomsLeft = availableRooms !== undefined ? availableRooms : 5;
  return {
    isSoldOut: false,
    roomsLeft,
    statusText: roomsLeft <= 3 ? `Only ${roomsLeft} rooms left!` : `${roomsLeft} rooms available`,
  };
}

/**
 * Determines booking availability for a tour package / plan.
 * @param {object} plan
 * @param {Date|string} [referenceDate=new Date()]
 * @returns {{ isSoldOut: boolean, statusText: string }}
 */
export function getPlanAvailability(plan, referenceDate = new Date()) {
  if (!plan || typeof plan !== 'object') {
    return { isSoldOut: true, statusText: 'Unavailable' };
  }
  const status = (plan.status || 'available').toLowerCase();
  if (status === 'sold_out' || status === 'unavailable' || status === 'archived') {
    return { isSoldOut: true, statusText: 'Sold Out' };
  }
  if (plan.availableSeats !== undefined && Number(plan.availableSeats) <= 0) {
    return { isSoldOut: true, statusText: 'Sold Out' };
  }
  if (plan.capacity !== undefined && plan.booked !== undefined && (Number(plan.capacity) - Number(plan.booked)) <= 0) {
    return { isSoldOut: true, statusText: 'Sold Out' };
  }

  // Check if departure date in itinerary has passed
  const ref = typeof referenceDate === 'string' ? new Date(referenceDate) : referenceDate;
  const todayIso = ref.toISOString().slice(0, 10);
  const startDate = plan.startDate || plan.itinerary?.day1?.hotel?.checkInDate || plan.itinerary?.day1?.transport?.pickupAt;
  if (startDate) {
    const sDate = String(startDate).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(sDate) && sDate < todayIso && !plan.isFlexible) {
      return { isSoldOut: true, statusText: 'Departed' };
    }
  }

  return { isSoldOut: false, statusText: 'Available' };
}

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
    totalRooms: typeof raw.totalRooms === 'number' ? raw.totalRooms : (raw.totalRooms !== undefined ? Number(raw.totalRooms) : 10),
    availableRooms: typeof raw.availableRooms === 'number' ? raw.availableRooms : (raw.availableRooms !== undefined ? Number(raw.availableRooms) : 5),
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
