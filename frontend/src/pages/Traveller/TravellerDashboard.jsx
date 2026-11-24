import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useInRouterContext } from 'react-router-dom';
import Navbar from '../../components/Navbar/navbar.jsx';
import { apiRequest, getSavedUser } from '../../services/api.js';
import { formatCurrency } from '../../utils/checkoutUtils.js';

// Day 2 — Traveller Bookings
import TravellerBookingsList from './TravellerBookingsList.jsx';
// Day 3 — Traveller Trips
import TravellerTripsList from './TravellerTripsList.jsx';
// Day 4 — Traveller Reviews
import TravellerReviewsPage from './TravellerReviewsPage.jsx';
// Day 5 — Traveller Browse
import TravellerBrowsePage from './TravellerBrowsePage.jsx';
// Checkout & Payment Demo
import TravellerCheckoutPage from './TravellerCheckoutPage.jsx';
// Support Tickets
import TravellerSupportTicketsPage from './TravellerSupportTicketsPage.jsx';

import './travellerDashboard.css';

/**
 * TravellerDashboard
 *
 * Visual restoration of the Xploreo Traveller Dashboard matching the project brief:
 * - Slim white top bar Navbar
 * - Hero scenic background with centered "Discover Your Next Adventure"
 * - Floating search panel with Hotels, Holiday Packages, and Experiences tabs
 * - Hotel search with Destination, check-in, check-out, rooms, guests, and prominent Search Hotels button
 * - Destinations image cards for Mumbai, Delhi, Goa, Jaipur, and Kerala
 * - How It Works 3-step section: Search, Book, and Travel with teal icons
 * - Preserving M5 authentication, navigation, and section state
 */
const SECTION = {
  HOME: 'home',
  BROWSE: 'browse',
  BOOKINGS: 'bookings',
  TRIPS: 'trips',
  REVIEWS: 'reviews',
  CHECKOUT: 'checkout',
  TICKETS: 'tickets',
};

const DESTINATIONS = [
  {
    id: 'mumbai',
    name: 'Mumbai',
    description: 'The City of Dreams, iconic coastline & heritage',
    image: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&q=80&w=800',
  },
  {
    id: 'delhi',
    name: 'Delhi',
    description: 'Heart of heritage, monuments & vibrant bazaars',
    image: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&q=80&w=800',
  },
  {
    id: 'goa',
    name: 'Goa',
    description: 'Sun-drenched beaches, coastal serenity & nightlife',
    image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&q=80&w=800',
  },
  {
    id: 'jaipur',
    name: 'Jaipur',
    description: 'The Pink City of royal palaces & majestic forts',
    image: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&q=80&w=800',
  },
  {
    id: 'kerala',
    name: 'Kerala',
    description: "God's Own Country, serene backwaters & tea hills",
    image: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&q=80&w=800',
  },
];

export const DESTINATION_OPTIONS = ['Mumbai', 'Delhi', 'Goa', 'Jaipur', 'Kerala'];

const HOW_IT_WORKS_STEPS = [
  {
    number: '01',
    title: 'Search',
    description: 'Explore verified hotels, curated holiday packages, and local experiences across top destinations.',
    iconName: 'search',
  },
  {
    number: '02',
    title: 'Book',
    description: 'Reserve effortlessly with transparent pricing, instant confirmation, and flexible scheduling.',
    iconName: 'book',
  },
  {
    number: '03',
    title: 'Travel',
    description: 'Enjoy live journey updates, personalized itineraries, and 24/7 dedicated support on every trip.',
    iconName: 'travel',
  },
];

function calculateBookingStats(list = []) {
  const safeList = Array.isArray(list) ? list : [];
  const total = safeList.length;
  const confirmed = safeList.filter((b) => (b.status || '').toUpperCase() === 'CONFIRMED').length;
  const cancelled = safeList.filter((b) => (b.status || '').toUpperCase() === 'CANCELLED').length;
  const confirmedSpend = safeList.reduce((sum, b) => {
    if ((b.status || '').toUpperCase() === 'CONFIRMED') {
      return sum + (Number(b.totalAmount) || 0);
    }
    return sum;
  }, 0);

  return { total, count: total, confirmed, cancelled, confirmedSpend };
}

export default function TravellerDashboard({
  user,
  bookings = [],
  trips = [],
  reviews = [],
  currentTravellerId = 'T001',
  onSubmitReview,
  onSubmitTicket,
  onRetry,
  onPollRefresh,
  onSelectItem,
  onBookItem,
  logAction,
  useFixtures = false,
  showNavbar = true,
}) {
  const [activeSection, setActiveSection] = useState(SECTION.HOME);
  const [searchTab, setSearchTab] = useState('hotels');

  // Live statistics state for authenticated traveller
  const [bookingStats, setBookingStats] = useState(() => {
    if (bookings && bookings.length > 0) {
      const stats = calculateBookingStats(bookings);
      return {
        loading: false,
        error: false,
        ...stats,
      };
    }
    return {
      loading: !useFixtures,
      error: false,
      total: 0,
      count: 0,
      confirmed: 0,
      cancelled: 0,
      confirmedSpend: 0,
    };
  });
  const [tripStats, setTripStats] = useState({
    loading: !useFixtures && trips.length === 0,
    error: false,
    count: trips.length > 0 ? trips.length : 0,
  });
  const [reviewStats, setReviewStats] = useState({
    loading: !useFixtures && reviews.length === 0,
    error: false,
    count: reviews.length > 0 ? reviews.length : 0,
  });

  // Resolve all valid identifier aliases for the authenticated traveller
  const userIdentifiers = useMemo(() => {
    const ids = new Set();
    if (user?.userId) ids.add(String(user.userId).trim().toLowerCase());
    if (user?.id) ids.add(String(user.id).trim().toLowerCase());
    if (user?.username) ids.add(String(user.username).trim().toLowerCase());
    if (currentTravellerId) ids.add(String(currentTravellerId).trim().toLowerCase());

    const saved = typeof getSavedUser === 'function' ? getSavedUser() : null;
    if (saved?.userId) ids.add(String(saved.userId).trim().toLowerCase());
    if (saved?.id) ids.add(String(saved.id).trim().toLowerCase());

    const userEmail = (user?.email || saved?.email || '').toLowerCase();
    const userName = (user?.name || saved?.name || '').toLowerCase();
    if (
      userEmail === 'anjali@xploreo.com' ||
      userName.includes('anjali') ||
      ids.has('t001') ||
      ids.has('trav-usr-20001') ||
      ids.has('20001')
    ) {
      ids.add('20001');
      ids.add('t001');
      ids.add('trav-usr-20001');
    }

    return ids;
  }, [user, currentTravellerId]);

  const isUserMatch = useCallback(
    (targetId) => {
      if (targetId == null) return false;
      const str = String(targetId).trim().toLowerCase();
      if (userIdentifiers.has(str)) return true;
      const numeric = str.replace(/\D/g, '');
      if (numeric && userIdentifiers.has(numeric)) return true;
      return false;
    },
    [userIdentifiers]
  );

  useEffect(() => {
    if (useFixtures) return;

    let isCancelled = false;

    async function loadStats() {
      // 1. Bookings: count the traveller's actual bookings (experiences + hotel adapter fallback)
      if (bookings && bookings.length > 0) {
        const stats = calculateBookingStats(bookings);
        if (!isCancelled) {
          setBookingStats({
            loading: false,
            error: false,
            ...stats,
          });
        }
      } else {
        try {
          setBookingStats((prev) => ({ ...prev, loading: true, error: false }));

          // 1. Fetch live experience bookings
          let expList = [];
          let expError = null;
          try {
            const expData = await apiRequest('/experience-bookings');
            expList = Array.isArray(expData) ? expData : expData?.data || [];
          } catch (expErr) {
            expError = expErr;
          }

          // 2. Fetch live hotel bookings from the backend API
          let hotelList = [];
          let hotelError = null;
          try {
            const hotelData = await apiRequest('/bookings');
            hotelList = (Array.isArray(hotelData) ? hotelData : hotelData?.data || []).map((b) => ({
              ...b,
              bookingType: 'hotel',
            }));
          } catch (hErr) {
            hotelError = hErr;
            hotelList = [];
          }

          if (expError && hotelError && expList.length === 0 && hotelList.length === 0) {
            throw new Error('Failed to load bookings from all sources');
          }

          const combinedBookings = [...expList, ...hotelList];
          const userBookings = combinedBookings.filter((b) => {
            if (!b.travellerId) return true;
            if (isUserMatch(b.travellerId)) return true;
            if (b.travellerId === currentTravellerId) return true;
            return false;
          });

          const stats = calculateBookingStats(userBookings);

          if (!isCancelled) {
            setBookingStats({
              loading: false,
              error: false,
              ...stats,
            });
          }
        } catch (err) {
          if (!isCancelled) {
            setBookingStats({
              loading: false,
              error: true,
              total: null,
              count: null,
              confirmed: null,
              cancelled: null,
              confirmedSpend: null,
            });
          }
        }
      }

      // 2. Trips: count the traveller's actual trips, including active and completed trips
      try {
        setTripStats((prev) => ({ ...prev, loading: true, error: false }));
        const candidateTripIds = [
          user?.userId,
          currentTravellerId,
          ...Array.from(userIdentifiers),
        ].filter(Boolean);

        const uniqueCandidateTripIds = [...new Set(candidateTripIds)];

        let tripsList = [];
        let fetchedSuccessfully = false;

        for (const candId of uniqueCandidateTripIds) {
          try {
            const rawData = await apiRequest(`/trips/traveller/${encodeURIComponent(candId)}`);
            const mapped = Array.isArray(rawData) ? rawData : rawData?.data || [];
            fetchedSuccessfully = true;
            if (mapped.length > 0) {
              tripsList = mapped;
              break;
            }
          } catch {
            // Continue trying remaining candidate identifiers
          }
        }

        if (!isCancelled) {
          if (fetchedSuccessfully) {
            setTripStats({ loading: false, error: false, count: tripsList.length });
          } else {
            setTripStats({ loading: false, error: true, count: null });
          }
        }
      } catch (err) {
        if (!isCancelled) {
          setTripStats({ loading: false, error: true, count: null });
        }
      }

      // 3. Reviews: count reviews submitted by the traveller
      try {
        setReviewStats((prev) => ({ ...prev, loading: true, error: false }));
        const revData = await apiRequest('/reviews');
        const revList = Array.isArray(revData) ? revData : revData?.data || [];
        const userReviews = revList.filter((r) => isUserMatch(r.userId) || isUserMatch(r.travellerId));
        if (!isCancelled) {
          setReviewStats({ loading: false, error: false, count: userReviews.length });
        }
      } catch (err) {
        if (!isCancelled) {
          setReviewStats({ loading: false, error: true, count: null });
        }
      }
    }

    loadStats();

    return () => {
      isCancelled = true;
    };
  }, [useFixtures, userIdentifiers, isUserMatch, user?.userId, currentTravellerId]);

  // Hotel search form state
  const [hotelDestination, setHotelDestination] = useState('');
  const [hotelCheckIn, setHotelCheckIn] = useState('');
  const [hotelCheckOut, setHotelCheckOut] = useState('');
  const [hotelRooms, setHotelRooms] = useState('1');
  const [hotelGuests, setHotelGuests] = useState('2');

  // Package search form state
  const [packageDestination, setPackageDestination] = useState('');
  const [packageDeparture, setPackageDeparture] = useState('');
  const [packageRooms, setPackageRooms] = useState('1');
  const [packageGuests, setPackageGuests] = useState('2');

  // Experience search form state
  const [experienceDestination, setExperienceDestination] = useState('');
  const [experienceDate, setExperienceDate] = useState('');

  // Independent search validation error states
  const [hotelErrors, setHotelErrors] = useState({});
  const [packageErrors, setPackageErrors] = useState({});
  const [experienceErrors, setExperienceErrors] = useState({});

  const validateHotelSearch = () => {
    const errors = {};
    if (!hotelDestination || !hotelDestination.trim()) {
      errors.destination = 'Please select a destination';
    }
    if (!hotelCheckIn) {
      errors.checkIn = 'Please select a check-in date';
    }
    if (!hotelCheckOut) {
      errors.checkOut = 'Please select a check-out date';
    } else if (hotelCheckIn && hotelCheckOut < hotelCheckIn) {
      errors.checkOut = 'Check-out date must be after check-in date';
    }
    return errors;
  };

  const validatePackageSearch = () => {
    const errors = {};
    if (!packageDestination || !packageDestination.trim()) {
      errors.destination = 'Please select a destination';
    }
    if (!packageDeparture) {
      errors.departure = 'Please select a departure date';
    }
    return errors;
  };

  const validateExperienceSearch = () => {
    const errors = {};
    if (!experienceDestination || !experienceDestination.trim()) {
      errors.destination = 'Please select a destination';
    }
    if (!experienceDate) {
      errors.date = 'Please select an activity date';
    }
    return errors;
  };

  const inRouter = useInRouterContext();
  const navigate = inRouter ? useNavigate() : null;

  const isPreviewContext = useFixtures || bookings.length > 0 || trips.length > 0 || reviews.length > 0;

  const log = (action, payload) => {
    if (typeof logAction === 'function') logAction(action, payload);
  };

  const handleEnterSection = (sectionId) => {
    log(`Dashboard: navigated to section`, sectionId);
    setActiveSection(sectionId);
  };

  const handleNavigate = (path, sectionId) => {
    if (navigate && path) {
      navigate(path);
    } else if (sectionId) {
      handleEnterSection(sectionId);
    }
  };

  const handleBack = () => {
    log('Dashboard: returned to hub');
    setActiveSection(SECTION.HOME);
  };

  const handleHotelSearch = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const errors = validateHotelSearch();
    if (Object.keys(errors).length > 0) {
      setHotelErrors(errors);
      return;
    }
    setHotelErrors({});
    log('Dashboard: search hotels', {
      destination: hotelDestination.trim(),
      checkIn: hotelCheckIn,
      checkOut: hotelCheckOut,
      rooms: hotelRooms,
      guests: hotelGuests,
    });
    const params = new URLSearchParams();
    params.set('category', 'hotels');
    params.set('search', hotelDestination.trim());
    params.set('checkIn', hotelCheckIn);
    params.set('checkOut', hotelCheckOut);
    params.set('rooms', hotelRooms);
    params.set('guests', hotelGuests);
    handleNavigate(`/Traveller/browse?${params.toString()}`, SECTION.BROWSE);
  };

  const handlePackageSearch = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const errors = validatePackageSearch();
    if (Object.keys(errors).length > 0) {
      setPackageErrors(errors);
      return;
    }
    setPackageErrors({});
    log('Dashboard: search packages', {
      destination: packageDestination.trim(),
      departureDate: packageDeparture,
      rooms: packageRooms,
      guests: packageGuests,
    });
    const params = new URLSearchParams();
    params.set('category', 'packages');
    params.set('search', packageDestination.trim());
    params.set('checkIn', packageDeparture);
    params.set('rooms', packageRooms);
    params.set('guests', packageGuests);
    handleNavigate(`/Traveller/browse?${params.toString()}`, SECTION.BROWSE);
  };

  const handleExperienceSearch = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const errors = validateExperienceSearch();
    if (Object.keys(errors).length > 0) {
      setExperienceErrors(errors);
      return;
    }
    setExperienceErrors({});
    log('Dashboard: search experiences', {
      destination: experienceDestination.trim(),
      activityDate: experienceDate,
    });
    const params = new URLSearchParams();
    params.set('category', 'experiences');
    params.set('search', experienceDestination.trim());
    params.set('checkIn', experienceDate);
    handleNavigate(`/Traveller/browse?${params.toString()}`, SECTION.BROWSE);
  };

  const handleSelectDestination = (destName) => {
    log('Dashboard: destination selected', destName);
    const params = new URLSearchParams();
    params.set('search', destName);
    handleNavigate(`/Traveller/browse?${params.toString()}`, SECTION.BROWSE);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const avatarInitials = currentTravellerId.slice(0, 2).toUpperCase();

  // ── Section: Home Hub ──────────────────────────────────────────────────────
  if (activeSection === SECTION.HOME) {
    return (
      <div className="trav-dash-wrapper">
        {showNavbar && inRouter && (
          <Navbar user={user || { username: 'Traveller', role: 'traveller', userId: currentTravellerId }} />
        )}

        <div className="trav-dash-root" data-testid="traveller-dashboard">
          {/* Header & Greeting Bar */}
          <header className="trav-dash-header">
            <div className="trav-dash-header-inner">
              <div className="trav-dash-avatar" aria-hidden="true">
                {avatarInitials}
              </div>
              <div>
                <h1 className="trav-dash-greeting">Welcome back, Traveller</h1>
                <p className="trav-dash-meta">
                  ID&nbsp;<code className="trav-dash-id">{currentTravellerId}</code>
                  &nbsp;·&nbsp;
                  <span className="trav-dash-badge">Traveller</span>
                </p>
              </div>
            </div>

            <div className="trav-dash-stats-row" aria-label="Dashboard statistics">
              <div className="trav-dash-stat" data-testid="stat-total-bookings">
                <span className="trav-dash-stat-value">
                  {bookingStats.loading ? '...' : (bookingStats.error ? '—' : (bookingStats.total ?? 0))}
                </span>
                <span className="trav-dash-stat-label">Total Bookings</span>
              </div>
              <div className="trav-dash-stat" data-testid="stat-confirmed-bookings">
                <span className="trav-dash-stat-value">
                  {bookingStats.loading ? '...' : (bookingStats.error ? '—' : (bookingStats.confirmed ?? 0))}
                </span>
                <span className="trav-dash-stat-label">Confirmed</span>
              </div>
              <div className="trav-dash-stat" data-testid="stat-cancelled-bookings">
                <span className="trav-dash-stat-value">
                  {bookingStats.loading ? '...' : (bookingStats.error ? '—' : (bookingStats.cancelled ?? 0))}
                </span>
                <span className="trav-dash-stat-label">Cancelled</span>
              </div>
              <div className="trav-dash-stat" data-testid="stat-confirmed-spend">
                <span className="trav-dash-stat-value">
                  {bookingStats.loading ? '...' : (bookingStats.error ? '—' : formatCurrency(bookingStats.confirmedSpend ?? 0))}
                </span>
                <span className="trav-dash-stat-label">Total Confirmed Spend</span>
              </div>
              <div className="trav-dash-stat" data-testid="stat-trips">
                <span className="trav-dash-stat-value">
                  {tripStats.loading ? '...' : (tripStats.error ? '—' : (tripStats.count ?? 0))}
                </span>
                <span className="trav-dash-stat-label">Trips</span>
              </div>
              <div className="trav-dash-stat" data-testid="stat-reviews">
                <span className="trav-dash-stat-value">
                  {reviewStats.loading ? '...' : (reviewStats.error ? '—' : (reviewStats.count ?? 0))}
                </span>
                <span className="trav-dash-stat-label">Reviews</span>
              </div>
            </div>
          </header>

          {/* Hero Section */}
          <section className="trav-dash-hero" aria-label="Hero banner">
            <div className="trav-dash-hero-overlay" />
            <div className="trav-dash-hero-content">
              <h1 className="trav-dash-hero-title">Discover Your Next Adventure</h1>
              <p className="trav-dash-hero-subtitle">
                Explore handcrafted itineraries, premium stays, and verified local guides across India.
              </p>
            </div>
          </section>

          {/* Floating Search Panel */}
          <section className="trav-dash-search-container" aria-label="Search travel options">
            <div className="trav-dash-search-widget">
              {/* Search Tabs */}
              <div className="trav-dash-search-tabs" role="tablist" aria-label="Travel search tabs">
                <button
                  type="button"
                  role="tab"
                  id="tab-hotels"
                  aria-selected={searchTab === 'hotels'}
                  aria-controls="panel-hotels"
                  className={`trav-dash-tab-btn ${searchTab === 'hotels' ? 'active' : ''}`}
                  onClick={() => setSearchTab('hotels')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 22v-6.57" />
                    <path d="M14 22v-6.57" />
                    <path d="M22 22H2" />
                    <path d="M22 15a2 2 0 0 0-2-2h-3" />
                    <path d="M2 15a2 2 0 0 1 2-2h3" />
                    <path d="M7 2v10" />
                    <path d="M17 2v10" />
                    <path d="M7 12V6a5 5 0 0 1 10 0v6" />
                  </svg>
                  <span>Hotels</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  id="tab-packages"
                  aria-selected={searchTab === 'packages'}
                  aria-controls="panel-packages"
                  className={`trav-dash-tab-btn ${searchTab === 'packages' ? 'active' : ''}`}
                  onClick={() => setSearchTab('packages')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                  <span>Holiday Packages</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  id="tab-experiences"
                  aria-selected={searchTab === 'experiences'}
                  aria-controls="panel-experiences"
                  className={`trav-dash-tab-btn ${searchTab === 'experiences' ? 'active' : ''}`}
                  onClick={() => setSearchTab('experiences')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                  </svg>
                  <span>Experiences</span>
                </button>
              </div>

              {/* Panel 1: Hotels Search */}
              {searchTab === 'hotels' && (
                <form id="panel-hotels" role="tabpanel" aria-labelledby="tab-hotels" className="trav-dash-panel" onSubmit={handleHotelSearch} noValidate>
                  <div className="trav-dash-form-row">
                    <div className="trav-dash-field trav-dash-field-grow">
                      <label htmlFor="hotel-destination">DESTINATION</label>
                      <div className={`trav-dash-input-wrap ${hotelErrors.destination ? 'has-error' : ''}`}>
                        <svg className="trav-dash-field-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <select
                          id="hotel-destination"
                          className={`trav-dash-destination-select trav-dash-select-with-icon ${!hotelDestination ? 'is-placeholder' : ''}`}
                          value={hotelDestination}
                          aria-invalid={Boolean(hotelErrors.destination)}
                          aria-describedby={hotelErrors.destination ? 'hotel-destination-error' : undefined}
                          onChange={(e) => {
                            setHotelDestination(e.target.value);
                            if (hotelErrors.destination) setHotelErrors((prev) => ({ ...prev, destination: null }));
                          }}
                        >
                          <option value="">Select destination</option>
                          {DESTINATION_OPTIONS.map((dest) => (
                            <option key={dest} value={dest}>
                              {dest}
                            </option>
                          ))}
                        </select>
                      </div>
                      {hotelErrors.destination && (
                        <span id="hotel-destination-error" className="trav-dash-field-error" role="alert">
                          {hotelErrors.destination}
                        </span>
                      )}
                    </div>

                    <div className="trav-dash-field">
                      <label htmlFor="hotel-checkin">CHECK-IN DATE</label>
                      <div className={`trav-dash-input-wrap ${hotelErrors.checkIn ? 'has-error' : ''}`}>
                        <svg className="trav-dash-field-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <input
                          id="hotel-checkin"
                          type="date"
                          min={todayStr}
                          value={hotelCheckIn}
                          aria-invalid={Boolean(hotelErrors.checkIn)}
                          aria-describedby={hotelErrors.checkIn ? 'hotel-checkin-error' : undefined}
                          onChange={(e) => {
                            setHotelCheckIn(e.target.value);
                            if (hotelErrors.checkIn) setHotelErrors((prev) => ({ ...prev, checkIn: null }));
                          }}
                        />
                      </div>
                      {hotelErrors.checkIn && (
                        <span id="hotel-checkin-error" className="trav-dash-field-error" role="alert">
                          {hotelErrors.checkIn}
                        </span>
                      )}
                    </div>

                    <div className="trav-dash-field">
                      <label htmlFor="hotel-checkout">CHECK-OUT DATE</label>
                      <div className={`trav-dash-input-wrap ${hotelErrors.checkOut ? 'has-error' : ''}`}>
                        <svg className="trav-dash-field-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <input
                          id="hotel-checkout"
                          type="date"
                          min={hotelCheckIn || todayStr}
                          value={hotelCheckOut}
                          aria-invalid={Boolean(hotelErrors.checkOut)}
                          aria-describedby={hotelErrors.checkOut ? 'hotel-checkout-error' : undefined}
                          onChange={(e) => {
                            setHotelCheckOut(e.target.value);
                            if (hotelErrors.checkOut) setHotelErrors((prev) => ({ ...prev, checkOut: null }));
                          }}
                        />
                      </div>
                      {hotelErrors.checkOut && (
                        <span id="hotel-checkout-error" className="trav-dash-field-error" role="alert">
                          {hotelErrors.checkOut}
                        </span>
                      )}
                    </div>

                    <div className="trav-dash-field trav-dash-field-sm">
                      <label htmlFor="hotel-rooms">ROOMS</label>
                      <div className="trav-dash-input-wrap">
                        <select
                          id="hotel-rooms"
                          value={hotelRooms}
                          onChange={(e) => setHotelRooms(e.target.value)}
                        >
                          <option value="1">1 Room</option>
                          <option value="2">2 Rooms</option>
                          <option value="3">3 Rooms</option>
                          <option value="4+">4+ Rooms</option>
                        </select>
                      </div>
                    </div>

                    <div className="trav-dash-field trav-dash-field-sm">
                      <label htmlFor="hotel-guests">GUESTS</label>
                      <div className="trav-dash-input-wrap">
                        <select
                          id="hotel-guests"
                          value={hotelGuests}
                          onChange={(e) => setHotelGuests(e.target.value)}
                        >
                          <option value="1">1 Guest</option>
                          <option value="2">2 Guests</option>
                          <option value="3">3 Guests</option>
                          <option value="4">4 Guests</option>
                          <option value="5+">5+ Guests</option>
                        </select>
                      </div>
                    </div>

                    <div className="trav-dash-btn-wrap">
                      <button
                        type="submit"
                        className="trav-dash-search-action-btn"
                        id="btn-search-hotels"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <span>Search Hotels</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Panel 2: Holiday Packages Search */}
              {searchTab === 'packages' && (
                <form id="panel-packages" role="tabpanel" aria-labelledby="tab-packages" className="trav-dash-panel" onSubmit={handlePackageSearch} noValidate>
                  <div className="trav-dash-form-row">
                    <div className="trav-dash-field trav-dash-field-grow">
                      <label htmlFor="package-destination">DESTINATION</label>
                      <div className={`trav-dash-input-wrap ${packageErrors.destination ? 'has-error' : ''}`}>
                        <svg className="trav-dash-field-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <select
                          id="package-destination"
                          className={`trav-dash-destination-select trav-dash-select-with-icon ${!packageDestination ? 'is-placeholder' : ''}`}
                          value={packageDestination}
                          aria-invalid={Boolean(packageErrors.destination)}
                          aria-describedby={packageErrors.destination ? 'package-destination-error' : undefined}
                          onChange={(e) => {
                            setPackageDestination(e.target.value);
                            if (packageErrors.destination) setPackageErrors((prev) => ({ ...prev, destination: null }));
                          }}
                        >
                          <option value="">Select destination</option>
                          {DESTINATION_OPTIONS.map((dest) => (
                            <option key={dest} value={dest}>
                              {dest}
                            </option>
                          ))}
                        </select>
                      </div>
                      {packageErrors.destination && (
                        <span id="package-destination-error" className="trav-dash-field-error" role="alert">
                          {packageErrors.destination}
                        </span>
                      )}
                    </div>

                    <div className="trav-dash-field">
                      <label htmlFor="package-departure">DEPARTURE DATE</label>
                      <div className={`trav-dash-input-wrap ${packageErrors.departure ? 'has-error' : ''}`}>
                        <svg className="trav-dash-field-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <input
                          id="package-departure"
                          type="date"
                          min={todayStr}
                          value={packageDeparture}
                          aria-invalid={Boolean(packageErrors.departure)}
                          aria-describedby={packageErrors.departure ? 'package-departure-error' : undefined}
                          onChange={(e) => {
                            setPackageDeparture(e.target.value);
                            if (packageErrors.departure) setPackageErrors((prev) => ({ ...prev, departure: null }));
                          }}
                        />
                      </div>
                      {packageErrors.departure && (
                        <span id="package-departure-error" className="trav-dash-field-error" role="alert">
                          {packageErrors.departure}
                        </span>
                      )}
                    </div>

                    <div className="trav-dash-field trav-dash-field-sm">
                      <label htmlFor="package-rooms">ROOMS</label>
                      <div className="trav-dash-input-wrap">
                        <select
                          id="package-rooms"
                          value={packageRooms}
                          onChange={(e) => setPackageRooms(e.target.value)}
                        >
                          <option value="1">1 Room</option>
                          <option value="2">2 Rooms</option>
                          <option value="3+">3+ Rooms</option>
                        </select>
                      </div>
                    </div>

                    <div className="trav-dash-field trav-dash-field-sm">
                      <label htmlFor="package-guests">GUESTS</label>
                      <div className="trav-dash-input-wrap">
                        <select
                          id="package-guests"
                          value={packageGuests}
                          onChange={(e) => setPackageGuests(e.target.value)}
                        >
                          <option value="1">1 Guest</option>
                          <option value="2">2 Guests</option>
                          <option value="3">3 Guests</option>
                          <option value="4+">4+ Guests</option>
                        </select>
                      </div>
                    </div>

                    <div className="trav-dash-btn-wrap">
                      <button
                        type="submit"
                        className="trav-dash-search-action-btn"
                        id="btn-search-packages"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <span>Search Packages</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Panel 3: Experiences Search */}
              {searchTab === 'experiences' && (
                <form id="panel-experiences" role="tabpanel" aria-labelledby="tab-experiences" className="trav-dash-panel" onSubmit={handleExperienceSearch} noValidate>
                  <div className="trav-dash-form-row">
                    <div className="trav-dash-field trav-dash-field-grow">
                      <label htmlFor="experience-destination">DESTINATION</label>
                      <div className={`trav-dash-input-wrap ${experienceErrors.destination ? 'has-error' : ''}`}>
                        <svg className="trav-dash-field-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <select
                          id="experience-destination"
                          className={`trav-dash-destination-select trav-dash-select-with-icon ${!experienceDestination ? 'is-placeholder' : ''}`}
                          value={experienceDestination}
                          aria-invalid={Boolean(experienceErrors.destination)}
                          aria-describedby={experienceErrors.destination ? 'experience-destination-error' : undefined}
                          onChange={(e) => {
                            setExperienceDestination(e.target.value);
                            if (experienceErrors.destination) setExperienceErrors((prev) => ({ ...prev, destination: null }));
                          }}
                        >
                          <option value="">Select destination</option>
                          {DESTINATION_OPTIONS.map((dest) => (
                            <option key={dest} value={dest}>
                              {dest}
                            </option>
                          ))}
                        </select>
                      </div>
                      {experienceErrors.destination && (
                        <span id="experience-destination-error" className="trav-dash-field-error" role="alert">
                          {experienceErrors.destination}
                        </span>
                      )}
                    </div>

                    <div className="trav-dash-field trav-dash-field-grow">
                      <label htmlFor="experience-date">ACTIVITY DATE</label>
                      <div className={`trav-dash-input-wrap ${experienceErrors.date ? 'has-error' : ''}`}>
                        <svg className="trav-dash-field-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <input
                          id="experience-date"
                          type="date"
                          min={todayStr}
                          value={experienceDate}
                          aria-invalid={Boolean(experienceErrors.date)}
                          aria-describedby={experienceErrors.date ? 'experience-date-error' : undefined}
                          onChange={(e) => {
                            setExperienceDate(e.target.value);
                            if (experienceErrors.date) setExperienceErrors((prev) => ({ ...prev, date: null }));
                          }}
                        />
                      </div>
                      {experienceErrors.date && (
                        <span id="experience-date-error" className="trav-dash-field-error" role="alert">
                          {experienceErrors.date}
                        </span>
                      )}
                    </div>

                    <div className="trav-dash-btn-wrap">
                      <button
                        type="submit"
                        className="trav-dash-search-action-btn"
                        id="btn-search-experiences"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <span>Search Experiences</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </section>

          {/* Destinations Section */}
          <section className="trav-dash-destinations-section" aria-labelledby="heading-destinations">
            <div className="trav-dash-section-header">
              <div>
                <h2 id="heading-destinations" className="trav-dash-section-title">Destinations</h2>
                <p className="trav-dash-section-subtitle">
                  Popular places worth exploring right now across India
                </p>
              </div>
              <button
                type="button"
                className="trav-dash-link-btn"
                onClick={() => handleNavigate('/Traveller/browse', SECTION.BROWSE)}
              >
                Explore All Destinations →
              </button>
            </div>

            <div className="trav-dash-dest-grid" role="region" aria-label="Featured destinations">
              {DESTINATIONS.map((dest) => (
                <div
                  key={dest.id}
                  className="trav-dash-dest-card"
                  tabIndex={0}
                  role="button"
                  aria-label={`Explore ${dest.name}`}
                  onClick={() => handleSelectDestination(dest.name)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectDestination(dest.name);
                    }
                  }}
                >
                  <img
                    src={dest.image}
                    alt={dest.name}
                    className="trav-dash-dest-img"
                    loading="lazy"
                  />
                  <div className="trav-dash-dest-overlay">
                    <h3 className="trav-dash-dest-name">{dest.name}</h3>
                    <p className="trav-dash-dest-desc">{dest.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* How It Works Section */}
          <section className="trav-dash-hiw-section" aria-labelledby="heading-hiw">
            <div className="trav-dash-hiw-header">
              <h2 id="heading-hiw" className="trav-dash-hiw-title">How It Works</h2>
              <p className="trav-dash-hiw-subtitle">Start your journey in three simple steps</p>
            </div>

            <div className="trav-dash-hiw-grid">
              {HOW_IT_WORKS_STEPS.map((step) => (
                <div
                  key={step.number}
                  className="trav-dash-hiw-card"
                  tabIndex={0}
                  role="button"
                  aria-label={`${step.title}: ${step.description}`}
                  onClick={() => {
                    if (step.number === '01') handleNavigate('/Traveller/browse', SECTION.BROWSE);
                    else if (step.number === '02') handleNavigate('/Traveller/checkout', SECTION.CHECKOUT);
                    else if (step.number === '03') handleNavigate('/Traveller/trips', SECTION.TRIPS);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (step.number === '01') handleNavigate('/Traveller/browse', SECTION.BROWSE);
                      else if (step.number === '02') handleNavigate('/Traveller/checkout', SECTION.CHECKOUT);
                      else if (step.number === '03') handleNavigate('/Traveller/trips', SECTION.TRIPS);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="trav-dash-hiw-icon-wrap" aria-hidden="true">
                    {step.iconName === 'search' && (
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    )}
                    {step.iconName === 'book' && (
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    )}
                    {step.iconName === 'travel' && (
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                      </svg>
                    )}
                  </div>
                  <span className="trav-dash-hiw-step-tag">Step {step.number}</span>
                  <h3 className="trav-dash-hiw-step-title">{step.title}</h3>
                  <p className="trav-dash-hiw-step-desc">{step.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Informational Footer Strip */}
          <div className="trav-dash-info-strip">
            <span aria-hidden="true">🔒</span>
            <span>
              {isPreviewContext
                ? 'This dashboard shell uses fixture data in preview mode. Live API integration is active in production.'
                : 'This dashboard shell uses fixture data when previewing. Live backend integration is active.'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ── Section: Browse ────────────────────────────────────────────────────────
  if (activeSection === SECTION.BROWSE) {
    return (
      <div className="trav-dash-section-wrapper" data-testid="section-browse">
        <button
          type="button"
          className="trav-dash-back-btn"
          onClick={handleBack}
          aria-label="Back to Traveller Dashboard"
        >
          ← Dashboard
        </button>
        <TravellerBrowsePage
          showNavbar={false}
          useFixtures={useFixtures}
          onSelectItem={(item, category) => {
            log('Browse: item selected', { category, name: item?.name || item?.title });
            if (typeof onSelectItem === 'function') onSelectItem(item, category);
          }}
          onBookItem={(item, category) => {
            log('Browse: book action', { category, name: item?.name || item?.title });
            if (typeof onBookItem === 'function') {
              onBookItem(item, category);
            } else if (navigate) {
              navigate('/Traveller/checkout', { state: { item } });
            } else {
              handleEnterSection(SECTION.CHECKOUT);
            }
          }}
        />
      </div>
    );
  }

  // ── Section: Bookings ──────────────────────────────────────────────────────
  if (activeSection === SECTION.BOOKINGS) {
    return (
      <div className="trav-dash-section-wrapper" data-testid="section-bookings">
        <button
          type="button"
          className="trav-dash-back-btn"
          onClick={handleBack}
          aria-label="Back to Traveller Dashboard"
        >
          ← Dashboard
        </button>
        <TravellerBookingsList
          bookings={bookings}
          currentTravellerId={currentTravellerId}
          onRetry={() => {
            log('Bookings: retry clicked');
            if (typeof onRetry === 'function') onRetry();
          }}
          useFixtures={useFixtures}
        />
      </div>
    );
  }

  // ── Section: Trips ─────────────────────────────────────────────────────────
  if (activeSection === SECTION.TRIPS) {
    return (
      <div className="trav-dash-section-wrapper" data-testid="section-trips">
        <button
          type="button"
          className="trav-dash-back-btn"
          onClick={handleBack}
          aria-label="Back to Traveller Dashboard"
        >
          ← Dashboard
        </button>
        <TravellerTripsList
          showNavbar={false}
          trips={trips}
          currentTravellerId={currentTravellerId}
          onPollRefresh={async () => {
            log('Trips: poll refresh triggered');
            if (typeof onPollRefresh === 'function') await onPollRefresh();
          }}
          onRetry={() => {
            log('Trips: retry clicked');
            if (typeof onRetry === 'function') onRetry();
          }}
          useFixtures={useFixtures}
        />
      </div>
    );
  }

  // ── Section: Reviews ───────────────────────────────────────────────────────
  if (activeSection === SECTION.REVIEWS) {
    return (
      <div className="trav-dash-section-wrapper" data-testid="section-reviews">
        <button
          type="button"
          className="trav-dash-back-btn"
          onClick={handleBack}
          aria-label="Back to Traveller Dashboard"
        >
          ← Dashboard
        </button>
        <TravellerReviewsPage
          showNavbar={false}
          reviews={reviews}
          currentTravellerId={currentTravellerId}
          onRetry={() => {
            log('Reviews: retry clicked');
            if (typeof onRetry === 'function') onRetry();
          }}
          onSubmitReview={onSubmitReview}
          useFixtures={useFixtures}
        />
      </div>
    );
  }

  // ── Section: Checkout & Payment Demo ──────────────────────────────────────
  if (activeSection === SECTION.CHECKOUT) {
    return (
      <div className="trav-dash-section-wrapper" data-testid="section-checkout">
        <button
          type="button"
          className="trav-dash-back-btn"
          onClick={handleBack}
          aria-label="Back to Traveller Dashboard"
        >
          ← Dashboard
        </button>
        <TravellerCheckoutPage
          user={{ name: 'Traveller One', userId: currentTravellerId }}
          onComplete={() => log('Checkout: payment completed')}
        />
      </div>
    );
  }

  // ── Section: Support Tickets ───────────────────────────────────────────────
  if (activeSection === SECTION.TICKETS) {
    return (
      <div className="trav-dash-section-wrapper" data-testid="section-tickets">
        <button
          type="button"
          className="trav-dash-back-btn"
          onClick={handleBack}
          aria-label="Back to Traveller Dashboard"
        >
          ← Dashboard
        </button>
        <TravellerSupportTicketsPage
          showNavbar={false}
          user={user}
          currentTravellerId={currentTravellerId}
          onSubmitTicket={onSubmitTicket}
          useFixtures={useFixtures}
        />
      </div>
    );
  }

  // ── Fallback (should never reach) ─────────────────────────────────────────
  return (
    <div className="trav-dash-root">
      <p>Unknown section. <button type="button" onClick={handleBack}>Return to Dashboard</button></p>
    </div>
  );
}
