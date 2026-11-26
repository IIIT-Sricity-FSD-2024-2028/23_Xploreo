import { useState, useMemo, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  BROWSE_CATEGORIES,
  SORT_OPTIONS,
  validateSearchInput,
  validateDateInput,
  filterHotels,
  filterExperiences,
  filterPlans,
  DEFAULT_HOTEL_FIXTURES,
  DEFAULT_EXPERIENCE_FIXTURES,
  DEFAULT_PLAN_FIXTURES,
} from '../../utils/browseUtils.js';
import { useNavigate, useInRouterContext, useLocation } from 'react-router-dom';
import Navbar from '../../components/Navbar/navbar.jsx';
import BrowseHotelCard from './BrowseHotelCard.jsx';
import BrowseExperienceCard from './BrowseExperienceCard.jsx';
import BrowsePlanCard from './BrowsePlanCard.jsx';
import { selectAuthUser } from '../../features/authSlice.js';
import {
  fetchBrowseExperiences,
  fetchBrowseHotels,
  fetchBrowsePlans,
  resetBrowseFilters,
  selectBrowseActiveCategory,
  selectBrowseExperiences,
  selectBrowseFilters,
  selectBrowseHotels,
  selectBrowsePlans,
  setBrowseCategory,
  setBrowseFilters,
  setSelectedItemPreview,
  toggleBrowseAmenity,
} from '../../features/browseSlice.js';
import './travellerBrowse.css';

/**
 * TravellerBrowsePage
 * Complete, accessible browse & search hub for travellers.
 * Powered by Redux Toolkit browseSlice (/hotels, /experiences, /plans).
 */
function TravellerBrowseCore({
  user: propUser,
  showNavbar = true,
  initialCategory = BROWSE_CATEGORIES.HOTELS,
  hotels: propHotels,
  experiences: propExperiences,
  plans: propPlans,
  isLoading: propIsLoading,
  error: propError,
  onRetry: propOnRetry,
  onSelectItem,
  useFixtures = false,
  inRouter = false,
  navigate = null,
  location = null,
}) {
  const dispatch = useDispatch();
  const authUser = useSelector(selectAuthUser);
  const reduxCategory = useSelector(selectBrowseActiveCategory);
  const filters = useSelector(selectBrowseFilters);
  const hotelsState = useSelector(selectBrowseHotels);
  const experiencesState = useSelector(selectBrowseExperiences);
  const plansState = useSelector(selectBrowsePlans);

  const resolvedUser = propUser || (authUser && authUser.role !== 'default' ? authUser : null);
  const effectiveUser = resolvedUser || {
    name: 'Anjali Sharma',
    username: 'Anjali Sharma',
    role: 'traveller',
    userId: 'T001',
  };

  const urlCategory = useMemo(() => {
    if (!location?.search) return null;
    const cat = new URLSearchParams(location.search).get('category');
    if (!cat) return null;
    const lower = cat.toLowerCase();
    if (lower === 'packages' || lower === 'plans') return BROWSE_CATEGORIES.PLANS;
    if (lower === 'experiences') return BROWSE_CATEGORIES.EXPERIENCES;
    if (lower === 'hotels') return BROWSE_CATEGORIES.HOTELS;
    return null;
  }, [location]);

  const [localCategory, setLocalCategory] = useState(null);
  const activeCategory = useFixtures ? (localCategory || urlCategory || initialCategory) : reduxCategory;

  const {
    searchQuery,
    locationQuery,
    checkInDate,
    guestCount,
    roomCount,
    minStars,
    expCategory,
    maxPrice,
    selectedAmenities,
    sortBy,
    viewMode,
  } = filters;

  const [searchQueryError, setSearchQueryError] = useState('');
  const [checkInDateError, setCheckInDateError] = useState('');

  // Sync URL query params into Redux browse state when navigated from Dashboard search
  useEffect(() => {
    if (!location?.search) return;
    const params = new URLSearchParams(location.search);
    if (!useFixtures && urlCategory) {
      dispatch(setBrowseCategory(urlCategory));
    }

    const filterPatch = {};
    const search = params.get('search') || params.get('destination');
    if (search != null) {
      filterPatch.searchQuery = search;
      filterPatch.locationQuery = search;
    }
    const loc = params.get('location') || params.get('from');
    if (loc != null) {
      filterPatch.locationQuery = loc;
      if (!search) filterPatch.searchQuery = loc;
    }
    const checkIn = params.get('checkIn') || params.get('departure') || params.get('date');
    if (checkIn != null) {
      const validation = validateDateInput(checkIn);
      filterPatch.checkInDate = validation.sanitized;
    }
    const checkOut = params.get('checkOut');
    if (checkOut != null) {
      filterPatch.checkOutDate = validateDateInput(checkOut).sanitized;
    }
    const guests = params.get('guests');
    if (guests != null) filterPatch.guestCount = guests;
    const rooms = params.get('rooms');
    if (rooms != null) filterPatch.roomCount = rooms;

    if (Object.keys(filterPatch).length > 0) {
      dispatch(setBrowseFilters(filterPatch));
    }
  }, [location, urlCategory, dispatch, useFixtures]);

  const fetchCategory = useCallback((category) => {
    if (category === BROWSE_CATEGORIES.HOTELS) {
      dispatch(fetchBrowseHotels());
    } else if (category === BROWSE_CATEGORIES.EXPERIENCES) {
      dispatch(fetchBrowseExperiences());
    } else if (category === BROWSE_CATEGORIES.PLANS) {
      dispatch(fetchBrowsePlans({ limit: 50 }));
    }
  }, [dispatch]);

  useEffect(() => {
    if (useFixtures) return;

    if (propHotels === undefined && !hotelsState.loaded && !hotelsState.loading) {
      dispatch(fetchBrowseHotels());
    }
    if (propExperiences === undefined && !experiencesState.loaded && !experiencesState.loading) {
      dispatch(fetchBrowseExperiences());
    }
    if (propPlans === undefined && !plansState.loaded && !plansState.loading) {
      dispatch(fetchBrowsePlans({ limit: 50 }));
    }
  }, [
    useFixtures,
    propHotels,
    propExperiences,
    propPlans,
    hotelsState.loaded,
    hotelsState.loading,
    experiencesState.loaded,
    experiencesState.loading,
    plansState.loaded,
    plansState.loading,
    dispatch,
  ]);

  const hotels = useFixtures
    ? (propHotels ?? DEFAULT_HOTEL_FIXTURES)
    : (propHotels ?? hotelsState.items);

  const experiences = useFixtures
    ? (propExperiences ?? DEFAULT_EXPERIENCE_FIXTURES)
    : (propExperiences ?? experiencesState.items);

  const plans = useFixtures
    ? (propPlans ?? DEFAULT_PLAN_FIXTURES)
    : (propPlans ?? plansState.items);

  const activeCategoryState =
    activeCategory === BROWSE_CATEGORIES.HOTELS
      ? hotelsState
      : activeCategory === BROWSE_CATEGORIES.EXPERIENCES
        ? experiencesState
        : plansState;

  const activeLoading = propIsLoading !== undefined
    ? propIsLoading
    : (useFixtures ? false : Boolean(activeCategoryState.loading));

  const activeError = propError !== undefined
    ? propError
    : (useFixtures ? null : activeCategoryState.error);

  const handleCategoryChange = (cat) => {
    if (useFixtures) {
      setLocalCategory(cat);
    } else {
      dispatch(setBrowseCategory(cat));
    }
  };

  const handleRetryActive = () => {
    if (typeof propOnRetry === 'function') {
      propOnRetry(activeCategory);
    } else if (!useFixtures) {
      fetchCategory(activeCategory);
    }
  };

  const handleQueryChange = (e) => {
    const val = e.target.value;
    dispatch(setBrowseFilters({ searchQuery: val }));
    const validation = validateSearchInput(val);
    if (!validation.isValid) {
      setSearchQueryError(validation.error || 'Invalid search query');
    } else {
      setSearchQueryError('');
    }
  };

  const handleDateChange = (e) => {
    const val = e.target.value;
    const validation = validateDateInput(val);
    dispatch(setBrowseFilters({ checkInDate: validation.sanitized }));
    setCheckInDateError(validation.isValid ? '' : validation.error);
  };

  const handleResetFilters = () => {
    dispatch(resetBrowseFilters());
    setSearchQueryError('');
    setCheckInDateError('');
  };

  const handleToggleAmenity = (amenity) => {
    dispatch(toggleBrowseAmenity(amenity));
  };

  const filteredHotels = useMemo(() => {
    let result = filterHotels(hotels, {
      query: searchQuery,
      location: locationQuery,
      minStars: Number(minStars || 0),
      maxPrice: maxPrice ? Number(maxPrice) : Infinity,
      sortBy,
    });

    if (selectedAmenities.length > 0) {
      result = result.filter((h) => {
        const hotelAmenities = Array.isArray(h.amenities)
          ? h.amenities.map((a) => a.toLowerCase())
          : [];
        return selectedAmenities.every((sa) =>
          hotelAmenities.some((ha) => ha.includes(sa.toLowerCase()))
        );
      });
    }

    return result;
  }, [hotels, searchQuery, locationQuery, minStars, maxPrice, selectedAmenities, sortBy]);

  const filteredExperiences = useMemo(() => {
    return filterExperiences(experiences, {
      query: searchQuery,
      destination: locationQuery,
      category: expCategory,
      maxPrice: maxPrice ? Number(maxPrice) : Infinity,
      sortBy,
    });
  }, [experiences, searchQuery, locationQuery, expCategory, maxPrice, sortBy]);

  const filteredPlans = useMemo(() => {
    return filterPlans(plans, {
      query: searchQuery,
      destination: locationQuery,
      maxPrice: maxPrice ? Number(maxPrice) : Infinity,
      sortBy,
    });
  }, [plans, searchQuery, locationQuery, maxPrice, sortBy]);

  const currentCount = useMemo(() => {
    switch (activeCategory) {
      case BROWSE_CATEGORIES.HOTELS:
        return filteredHotels.length;
      case BROWSE_CATEGORIES.EXPERIENCES:
        return filteredExperiences.length;
      case BROWSE_CATEGORIES.PLANS:
        return filteredPlans.length;
      default:
        return 0;
    }
  }, [activeCategory, filteredHotels, filteredExperiences, filteredPlans]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (locationQuery) count++;
    if (minStars > 0) count++;
    if (expCategory !== 'all') count++;
    if (maxPrice) count++;
    if (selectedAmenities.length > 0) count += selectedAmenities.length;
    return count;
  }, [searchQuery, locationQuery, minStars, expCategory, maxPrice, selectedAmenities]);

  const handleCardSelect = (item) => {
    if (onSelectItem) {
      onSelectItem(item, activeCategory);
    }
    const typeKey =
      activeCategory === BROWSE_CATEGORIES.HOTELS
        ? 'hotel'
        : activeCategory === BROWSE_CATEGORIES.EXPERIENCES
          ? 'experience'
          : 'package';

    dispatch(setSelectedItemPreview({ key: `${typeKey}:${item.id}`, item }));

    const searchParams = new URLSearchParams();
    if (checkInDate) searchParams.set('checkIn', checkInDate);
    if (filters.checkOutDate) searchParams.set('checkOut', filters.checkOutDate);
    if (guestCount) searchParams.set('guests', guestCount);
    if (roomCount) searchParams.set('rooms', roomCount);
    const searchStr = searchParams.toString();

    if (navigate) {
      navigate(
        `/Traveller/details/${typeKey}/${item.id}${searchStr ? `?${searchStr}` : ''}`,
        {
          state: {
            item,
            category: activeCategory,
            checkInDate,
            checkOutDate: filters.checkOutDate,
            guestCount,
            roomCount,
          },
        }
      );
    }
  };

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const maxDateStr = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 2);
    return d.toISOString().split('T')[0];
  }, []);

  const displayName = effectiveUser.name || effectiveUser.username || 'Traveller';
  const avatarInitials = (effectiveUser.userId || displayName || 'T').slice(0, 2).toUpperCase();

  return (
    <div className="trav-browse-page-wrapper">
      {showNavbar && inRouter && (
        <Navbar user={effectiveUser} />
      )}
      <div className="trav-browse-page" data-testid="traveller-browse-page">
      {/* ── 1. Page Header Banner ── */}
      <header className="trav-browse-header">
        <div className="trav-browse-title-group">
          <div className="trav-browse-header-icon" aria-hidden="true">
            🧭
          </div>
          <div>
            <h1 className="trav-browse-title">Explore Your Next Adventure</h1>
            <p className="trav-browse-subtitle">
              Discover handpicked luxury stays, authentic local experiences, and curated holiday packages across India.
            </p>
          </div>
        </div>

        <div className="trav-browse-user-chip">
          <div className="trav-browse-user-avatar">{avatarInitials}</div>
          <span>{displayName}</span>
          <span className="trav-browse-user-role-badge">Traveller</span>
        </div>
      </header>

      {/* ── 2. Primary Category Navigation Tabs ── */}
      <nav className="trav-browse-nav" aria-label="Browse Categories">
        <div className="trav-browse-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === BROWSE_CATEGORIES.HOTELS}
            className={`trav-browse-tab ${activeCategory === BROWSE_CATEGORIES.HOTELS ? 'active' : ''}`}
            onClick={() => handleCategoryChange(BROWSE_CATEGORIES.HOTELS)}
          >
            🏨 Hotels ({hotels.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === BROWSE_CATEGORIES.EXPERIENCES}
            className={`trav-browse-tab ${activeCategory === BROWSE_CATEGORIES.EXPERIENCES ? 'active' : ''}`}
            onClick={() => handleCategoryChange(BROWSE_CATEGORIES.EXPERIENCES)}
          >
            🧭 Experiences ({experiences.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === BROWSE_CATEGORIES.PLANS}
            className={`trav-browse-tab ${activeCategory === BROWSE_CATEGORIES.PLANS ? 'active' : ''}`}
            onClick={() => handleCategoryChange(BROWSE_CATEGORIES.PLANS)}
          >
            🗺 Tour Packages ({plans.length})
          </button>
        </div>
      </nav>

      {/* ── 3. Unified 5-Column Search Toolbar ── */}
      <section className="trav-browse-toolbar" aria-label="Search and Filter Controls">
        <div className="trav-browse-search-row">
          {/* Query Field */}
          <div className="trav-browse-field">
            <label htmlFor="browse-search-input" className="trav-browse-field-label">
              SEARCH {activeCategory.toUpperCase()}
            </label>
            <div className="trav-browse-input-wrap">
              <span className="trav-browse-input-icon" aria-hidden="true">🔍</span>
              <input
                id="browse-search-input"
                type="text"
                className={`trav-browse-input ${searchQueryError ? 'input-error' : ''}`}
                placeholder="Search by name, keywords, or features..."
                value={searchQuery}
                onChange={handleQueryChange}
                aria-label="Search items"
              />
            </div>
          </div>

          {/* Location Field */}
          <div className="trav-browse-field">
            <label htmlFor="browse-location-input" className="trav-browse-field-label">
              DESTINATION / REGION
            </label>
            <div className="trav-browse-input-wrap">
              <span className="trav-browse-input-icon" aria-hidden="true">📍</span>
              <input
                id="browse-location-input"
                type="text"
                className="trav-browse-input"
                placeholder="City, region or destination..."
                value={locationQuery}
                onChange={(e) => dispatch(setBrowseFilters({ locationQuery: e.target.value }))}
                aria-label="Filter by location or destination"
              />
            </div>
          </div>

          {/* Date Picker */}
          <div className="trav-browse-field">
            <label htmlFor="browse-date-input" className="trav-browse-field-label">
              {activeCategory === BROWSE_CATEGORIES.HOTELS ? 'CHECK-IN' : 'DATE'}
            </label>
            <div className="trav-browse-input-wrap">
              <span className="trav-browse-input-icon" aria-hidden="true">📅</span>
              <input
                id="browse-date-input"
                type="date"
                className={`trav-browse-input ${checkInDateError ? 'input-error' : ''}`}
                min={todayStr}
                max={maxDateStr}
                value={checkInDate}
                onChange={handleDateChange}
                aria-invalid={Boolean(checkInDateError)}
                aria-describedby={checkInDateError ? 'browse-date-error' : undefined}
              />
            </div>
            {checkInDateError && (
              <p id="browse-date-error" className="trav-browse-field-error" role="alert">
                {checkInDateError}
              </p>
            )}
          </div>

          {/* Guests & Rooms */}
          <div className="trav-browse-field">
            <label htmlFor="browse-guests-select" className="trav-browse-field-label">
              GUESTS & ROOMS
            </label>
            <div className="trav-browse-input-wrap">
              <span className="trav-browse-input-icon" aria-hidden="true">👥</span>
              <select
                id="browse-guests-select"
                className="trav-browse-select"
                value={`${guestCount}-${roomCount}`}
                onChange={(e) => {
                  const [g, r] = e.target.value.split('-');
                  dispatch(setBrowseFilters({ guestCount: g, roomCount: r }));
                }}
              >
                <option value="1-1">1 Guest, 1 Room</option>
                <option value="2-1">2 Guests, 1 Room</option>
                <option value="3-1">3 Guests, 1 Room</option>
                <option value="4-2">4 Guests, 2 Rooms</option>
                <option value="5-2">5+ Guests, 2+ Rooms</option>
              </select>
            </div>
          </div>

          {/* Primary Search CTA Button */}
          <button
            type="button"
            className="trav-browse-search-btn"
            id="browse-search-submit-btn"
          >
            <span aria-hidden="true">🔍</span>
            <span>
              {activeCategory === BROWSE_CATEGORIES.HOTELS
                ? 'Search Stays'
                : activeCategory === BROWSE_CATEGORIES.EXPERIENCES
                  ? 'Search Experiences'
                  : 'Search Packages'}
            </span>
          </button>
        </div>

        {searchQueryError && (
          <div className="trav-browse-query-error" role="alert">
            {searchQueryError}
          </div>
        )}
      </section>

      {/* ── 4. Main 2-Column Desktop Layout ── */}
      <div className="trav-browse-main-layout">
        {/* Left Fixed Filter Sidebar (290px) */}
        <aside className="trav-browse-sidebar" aria-label="Desktop Filters">
          <div className="trav-browse-filter-header">
            <h3 className="trav-browse-filter-title">
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="trav-browse-tab-count" style={{ background: '#0d9488', color: '#ffffff' }}>
                  {activeFiltersCount}
                </span>
              )}
            </h3>
            {activeFiltersCount > 0 && (
              <button
                type="button"
                className="trav-browse-reset-btn"
                onClick={handleResetFilters}
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Budget Range Section */}
          <div className="trav-browse-filter-section">
            <h4 className="trav-browse-filter-heading">
              <span>Budget Range</span>
              <span className="trav-browse-filter-val">
                {maxPrice ? `Up to ₹${Number(maxPrice).toLocaleString()}` : 'Any Price'}
              </span>
            </h4>
            <input
              type="range"
              className="trav-browse-range-slider"
              min="1000"
              max="50000"
              step="1000"
              value={maxPrice || 50000}
              onChange={(e) => dispatch(setBrowseFilters({ maxPrice: e.target.value === '50000' ? '' : e.target.value }))}
              aria-label="Max budget range slider"
            />
            <div className="trav-browse-range-limits">
              <span>₹1,000</span>
              <span>₹50,000+</span>
            </div>
            <div className="trav-browse-input-wrap" style={{ height: '2.5rem', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b', marginRight: '0.4rem' }}>₹</span>
              <input
                id="browse-max-price"
                type="number"
                className="trav-browse-input"
                placeholder="Custom max price"
                value={maxPrice}
                onChange={(e) => dispatch(setBrowseFilters({ maxPrice: e.target.value }))}
                min="0"
                style={{ fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* Category-Specific Filter: Hotels */}
          {activeCategory === BROWSE_CATEGORIES.HOTELS && (
            <>
              <div className="trav-browse-filter-section" aria-label="Hotel star filter">
                <h4 className="trav-browse-filter-heading">Hotel Class</h4>
                <div className="trav-browse-chips-row">
                  {[0, 3, 4, 5].map((stars) => (
                    <button
                      key={stars}
                      type="button"
                      className={`trav-browse-filter-chip ${minStars === stars ? 'active' : ''}`}
                      onClick={() => dispatch(setBrowseFilters({ minStars: stars }))}
                    >
                      {stars === 0 ? 'All Stays' : `${stars}★ & above`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="trav-browse-filter-section">
                <h4 className="trav-browse-filter-heading">Popular Amenities</h4>
                <div className="trav-browse-checkbox-list">
                  {['Swimming Pool', 'Spa & Wellness', 'Private Beach', 'Free Wi-Fi', 'Free Breakfast', 'Fine Dining'].map((amenity) => (
                    <label key={amenity} className="trav-browse-checkbox-label">
                      <input
                        type="checkbox"
                        className="trav-browse-checkbox"
                        checked={selectedAmenities.includes(amenity)}
                        onChange={() => handleToggleAmenity(amenity)}
                      />
                      <span>{amenity}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Category-Specific Filter: Experiences */}
          {activeCategory === BROWSE_CATEGORIES.EXPERIENCES && (
            <div className="trav-browse-filter-section" aria-label="Experience category filter">
              <h4 className="trav-browse-filter-heading">Activity Theme</h4>
              <div className="trav-browse-chips-row">
                {['all', 'adventure', 'culture', 'culinary', 'wellness', 'wildlife'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`trav-browse-filter-chip ${expCategory === cat ? 'active' : ''}`}
                    onClick={() => dispatch(setBrowseFilters({ expCategory: cat }))}
                  >
                    {cat === 'all' ? 'All Activities' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category-Specific Filter: Plans */}
          {activeCategory === BROWSE_CATEGORIES.PLANS && (
            <div className="trav-browse-filter-section">
              <h4 className="trav-browse-filter-heading">Package Features</h4>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                All packages include vetted accommodation, guided transfers, and verified itineraries.
              </p>
            </div>
          )}
        </aside>

        {/* Right Results Area */}
        <main className="trav-browse-results-area">
          {/* Results Top Controls Bar */}
          <div className="trav-browse-results-bar">
            <span className="trav-browse-results-count">
              Showing <strong>{currentCount}</strong> verified {activeCategory}
              {locationQuery ? ` in "${locationQuery}"` : ''}
              {searchQuery ? ` matching "${searchQuery}"` : ''}
            </span>

            <div className="trav-browse-results-actions">
              <div className="trav-browse-sort-wrap">
                <label htmlFor="browse-sort-select" className="trav-browse-sort-label">Sort by:</label>
                <select
                  id="browse-sort-select"
                  className="trav-browse-sort-select"
                  value={sortBy}
                  onChange={(e) => dispatch(setBrowseFilters({ sortBy: e.target.value }))}
                >
                  <option value={SORT_OPTIONS.DEFAULT}>Recommended</option>
                  <option value={SORT_OPTIONS.PRICE_LOW}>Price: Low to High</option>
                  <option value={SORT_OPTIONS.PRICE_HIGH}>Price: High to Low</option>
                  <option value={SORT_OPTIONS.RATING}>Highest Rated</option>
                  <option value={SORT_OPTIONS.NAME}>Alphabetical (A-Z)</option>
                </select>
              </div>

              <div className="trav-browse-view-toggle">
                <button
                  type="button"
                  className={`trav-browse-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => dispatch(setBrowseFilters({ viewMode: 'grid' }))}
                  title="Grid view"
                  aria-label="Grid view"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={`trav-browse-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => dispatch(setBrowseFilters({ viewMode: 'list' }))}
                  title="List view"
                  aria-label="List view"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Active Filter Pills Bar */}
          {activeFiltersCount > 0 && (
            <div className="trav-browse-active-pills">
              {searchQuery && (
                <span className="trav-browse-pill">
                  "{searchQuery}"
                  <button
                    type="button"
                    className="trav-browse-pill-remove"
                    onClick={() => {
                      dispatch(setBrowseFilters({ searchQuery: '' }));
                      setSearchQueryError('');
                    }}
                    aria-label="Remove search filter"
                  >
                    ✕
                  </button>
                </span>
              )}
              {locationQuery && (
                <span className="trav-browse-pill">
                  📍 {locationQuery}
                  <button
                    type="button"
                    className="trav-browse-pill-remove"
                    onClick={() => dispatch(setBrowseFilters({ locationQuery: '' }))}
                    aria-label="Remove location filter"
                  >
                    ✕
                  </button>
                </span>
              )}
              {minStars > 0 && (
                <span className="trav-browse-pill">
                  ★ {minStars}+ Stars
                  <button
                    type="button"
                    className="trav-browse-pill-remove"
                    onClick={() => dispatch(setBrowseFilters({ minStars: 0 }))}
                    aria-label="Remove star filter"
                  >
                    ✕
                  </button>
                </span>
              )}
              {expCategory !== 'all' && (
                <span className="trav-browse-pill">
                  Activity: {expCategory}
                  <button
                    type="button"
                    className="trav-browse-pill-remove"
                    onClick={() => dispatch(setBrowseFilters({ expCategory: 'all' }))}
                    aria-label="Remove activity category filter"
                  >
                    ✕
                  </button>
                </span>
              )}
              {maxPrice && (
                <span className="trav-browse-pill">
                  ≤ ₹{Number(maxPrice).toLocaleString()}
                  <button
                    type="button"
                    className="trav-browse-pill-remove"
                    onClick={() => dispatch(setBrowseFilters({ maxPrice: '' }))}
                    aria-label="Remove price filter"
                  >
                    ✕
                  </button>
                </span>
              )}
              {selectedAmenities.map((amenity) => (
                <span key={amenity} className="trav-browse-pill">
                  {amenity}
                  <button
                    type="button"
                    className="trav-browse-pill-remove"
                    onClick={() => handleToggleAmenity(amenity)}
                    aria-label={`Remove amenity filter ${amenity}`}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* ── Content States ── */}

          {/* 1. Loading Skeleton */}
          {activeLoading && (
            <div className="trav-browse-skeleton-grid" aria-busy="true" aria-label="Loading catalog results">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="trav-browse-skeleton-card">
                  <div className="trav-browse-skeleton-media" />
                  <div className="trav-browse-skeleton-text-lg" />
                  <div className="trav-browse-skeleton-text-sm" />
                  <div className="trav-browse-skeleton-footer" />
                </div>
              ))}
            </div>
          )}

          {/* 2. Error Alert State */}
          {!activeLoading && activeError && (
            <div className="trav-browse-error-state" role="alert">
              <span className="trav-browse-error-icon" aria-hidden="true">⚠️</span>
              <h3>Unable to load {activeCategory}</h3>
              <p>{activeError}</p>
              <button
                type="button"
                className="trav-browse-btn trav-browse-btn-primary"
                onClick={handleRetryActive}
              >
                Try Again
              </button>
            </div>
          )}

          {/* 3. Empty Results State */}
          {!activeLoading && !activeError && currentCount === 0 && (
            <div className="trav-browse-empty-state" data-testid="browse-empty-state">
              <span className="trav-browse-empty-icon" aria-hidden="true">🔍</span>
              <h3>No matching {activeCategory} found</h3>
              <p>
                We couldn't find any results matching your search criteria. Try adjusting your filters, location, or search terms.
              </p>
              <button
                type="button"
                className="trav-browse-btn trav-browse-btn-primary"
                onClick={handleResetFilters}
              >
                Clear All Filters
              </button>
            </div>
          )}

          {/* 4. Populated Results Cards */}
          {!activeLoading && !activeError && currentCount > 0 && (
            <div
              className={viewMode === 'grid' ? 'trav-browse-grid' : 'trav-browse-list'}
              data-testid="browse-grid"
            >
              {activeCategory === BROWSE_CATEGORIES.HOTELS &&
                filteredHotels.map((hotel) => (
                  <BrowseHotelCard
                    key={hotel.id}
                    hotel={hotel}
                    onSelect={handleCardSelect}
                  />
                ))}

              {activeCategory === BROWSE_CATEGORIES.EXPERIENCES &&
                filteredExperiences.map((exp) => (
                  <BrowseExperienceCard
                    key={exp.id}
                    experience={exp}
                    onSelect={handleCardSelect}
                  />
                ))}

              {activeCategory === BROWSE_CATEGORIES.PLANS &&
                filteredPlans.map((plan) => (
                  <BrowsePlanCard
                    key={plan.id}
                    plan={plan}
                    onSelect={handleCardSelect}
                  />
                ))}
            </div>
          )}
        </main>
      </div>
      </div>
    </div>
  );
}

function TravellerBrowseWithRouter(props) {
  const navigate = useNavigate();
  const location = useLocation();
  return <TravellerBrowseCore {...props} inRouter={true} navigate={navigate} location={location} />;
}

export default function TravellerBrowsePage(props) {
  const inRouter = useInRouterContext();
  return inRouter
    ? <TravellerBrowseWithRouter {...props} />
    : <TravellerBrowseCore {...props} inRouter={false} navigate={null} location={null} />;
}
