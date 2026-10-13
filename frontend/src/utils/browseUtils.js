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

/**
 * Standard M2/M3 conforming sample fixtures used when backend returns empty sets.
 */
export const DEFAULT_HOTEL_FIXTURES = [
  {
    id: 'hotel-goa-1',
    name: 'Taj Exotica Resort & Spa',
    city: 'Goa',
    location: 'Benaulim, South Goa',
    description: 'Mediterranean-style luxury resort spread across 56 acres of lush gardens along the Arabian Sea.',
    stars: 5,
    rating: 4.8,
    reviewCount: 342,
    pricePerNight: 16500,
    taxesAndFees: 1980,
    image: '',
    amenities: ['Private Beach', 'Swimming Pool', 'Spa & Wellness', 'Fine Dining', 'Free Wi-Fi'],
    status: 'active',
  },
  {
    id: 'hotel-kerala-2',
    name: 'Kumarakom Lake Resort',
    city: 'Kumarakom',
    location: 'Kottayam, Kerala',
    description: 'Heritage villas with private plunge pools, tranquil backwaters, and Ayurvedic wellness treatments.',
    stars: 5,
    rating: 4.9,
    reviewCount: 418,
    pricePerNight: 18500,
    taxesAndFees: 2220,
    image: '',
    amenities: ['Backwater View', 'Ayurvedic Spa', 'Infinity Pool', 'Houseboat Dining'],
    status: 'active',
  },
  {
    id: 'hotel-jaipur-3',
    name: 'Heritage Haveli Jaipur',
    city: 'Jaipur',
    location: 'Old City, Jaipur',
    description: 'Centuries-old royal residence converted into a refined boutique hotel near Hawa Mahal.',
    stars: 4,
    rating: 4.6,
    reviewCount: 215,
    pricePerNight: 8200,
    taxesAndFees: 984,
    image: '',
    amenities: ['Rooftop Restaurant', 'Cultural Shows', 'Air Conditioning', 'Airport Transfer'],
    status: 'active',
  },
  {
    id: 'hotel-mumbai-4',
    name: 'Marine Plaza Waterfront',
    city: 'Mumbai',
    location: 'Marine Drive, Mumbai',
    description: 'Prime seafront hotel overlooking the famous Queen’s Necklace with rooftop glass-bottom pool.',
    stars: 4,
    rating: 4.5,
    reviewCount: 290,
    pricePerNight: 11000,
    taxesAndFees: 1320,
    image: '',
    amenities: ['Sea View Rooms', 'Rooftop Pool', 'Fitness Center', 'Cocktail Bar'],
    status: 'active',
  },
];

export const DEFAULT_EXPERIENCE_FIXTURES = [
  {
    id: 'exp-1',
    partnerId: 'exp-partner-coorg',
    title: 'Western Ghats Guided Rainforest Trek',
    description: 'A guided trek through lush Western Ghats forest trails with stream crossings and bird watching.',
    destination: 'Coorg',
    category: 'adventure',
    availability: 'available',
    price: 1800,
    durationHours: 6,
    capacity: 15,
    booked: 4,
    image: '',
    nextSlot: 'Tomorrow 07:00 AM',
    slots: [
      { id: 'slot-1', date: '2026-10-14', time: '07:00 AM', booked: 4, capacity: 15, available: true },
      { id: 'slot-2', date: '2026-10-15', time: '07:00 AM', booked: 2, capacity: 15, available: true },
    ],
  },
  {
    id: 'exp-2',
    partnerId: 'exp-partner-alleppey',
    title: 'Alleppey Sunrise Kayaking & Canal Walk',
    description: 'Paddle through serene narrow backwater canals before the heat of the day, guided by local boatmen.',
    destination: 'Alleppey',
    category: 'adventure',
    availability: 'available',
    price: 1450,
    durationHours: 3,
    capacity: 10,
    booked: 6,
    image: '',
    nextSlot: 'Tomorrow 06:00 AM',
    slots: [
      { id: 'slot-3', date: '2026-10-14', time: '06:00 AM', booked: 6, capacity: 10, available: true },
    ],
  },
  {
    id: 'exp-3',
    partnerId: 'exp-partner-jaipur',
    title: 'Amber Fort Twilight Heritage Walk & Bazaar Food Trail',
    description: 'Experience Amber Fort under evening illumination followed by authentic Rajasthani street delicacies.',
    destination: 'Jaipur',
    category: 'culture',
    availability: 'available',
    price: 2200,
    durationHours: 4,
    capacity: 12,
    booked: 8,
    image: '',
    nextSlot: 'Tomorrow 04:30 PM',
    slots: [
      { id: 'slot-4', date: '2026-10-14', time: '04:30 PM', booked: 8, capacity: 12, available: true },
    ],
  },
];

export const DEFAULT_PLAN_FIXTURES = [
  {
    id: 'plan-1',
    title: 'Kerala Backwaters & Hill Station Escape',
    description: 'Relax in serene Alleppey backwaters with houseboat stays and tea garden excursions in Munnar.',
    originCity: 'Bangalore',
    destination: 'Alleppey & Munnar',
    status: 'available',
    durationNights: 5,
    pricePerPerson: 22000,
    hotelStars: 4,
    includesFlight: false,
    image: '',
    tags: ['Backwaters', 'Houseboat', 'Tea Gardens', 'South India'],
  },
  {
    id: 'plan-2',
    title: 'Rajasthan Royal Heritage Trail',
    description: 'Explore majestic forts, royal palaces, desert culture, and bustling bazaars in Jaipur & Udaipur.',
    originCity: 'Delhi',
    destination: 'Jaipur & Udaipur',
    status: 'available',
    durationNights: 7,
    pricePerPerson: 35000,
    hotelStars: 5,
    includesFlight: false,
    image: '',
    tags: ['Heritage', 'Forts', 'Palaces', 'Culture'],
  },
];

export const DEFAULT_GUIDE_FIXTURES = [
  {
    userId: 'G001',
    fname: 'Sreekar',
    lname: 'Sharma',
    email: 'sreekar@example.com',
    location: 'Mumbai',
    prof_title: 'Senior Western Ghats Trek Leader',
    years_exp: 7,
    bio: 'Certified wilderness first responder with 7+ years guiding high-altitude treks and cultural heritage tours.',
    lang_spoken: ['English', 'Hindi', 'Marathi'],
    certifications: ['First Aid Certified', 'Mountain Rescue', 'Govt Tourism License'],
  },
  {
    userId: 'G002',
    fname: 'Arjun',
    lname: 'Nair',
    email: 'arjun.nair@example.com',
    location: 'Kochi',
    prof_title: 'Kerala Backwaters & Wildlife Naturalist',
    years_exp: 9,
    bio: 'Lifelong resident naturalist specializing in avian biodiversity, mangrove ecology, and local spice culture.',
    lang_spoken: ['English', 'Malayalam', 'Hindi', 'Tamil'],
    certifications: ['Naturalist Guide Level 2', 'CPR Certified'],
  },
  {
    userId: 'G003',
    fname: 'Priya',
    lname: 'Rathore',
    email: 'priya.rathore@example.com',
    location: 'Jaipur',
    prof_title: 'Architectural Historian & City Storyteller',
    years_exp: 5,
    bio: 'Passionate about Rajput architecture, royal cuisine histories, and hidden gem alleyways in the Pink City.',
    lang_spoken: ['English', 'Hindi', 'Rajasthani'],
    certifications: ['Archaeological Heritage Expert', 'Official City Tour Guide'],
  },
];

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

