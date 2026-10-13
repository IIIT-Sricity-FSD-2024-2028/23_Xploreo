import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  BROWSE_CATEGORIES,
  SORT_OPTIONS,
  validateSearchInput,
  filterHotels,
  filterExperiences,
  filterPlans,
  filterGuides,
  DEFAULT_HOTEL_FIXTURES,
  DEFAULT_EXPERIENCE_FIXTURES,
  DEFAULT_PLAN_FIXTURES,
  DEFAULT_GUIDE_FIXTURES,
  mapBackendHotel,
  mapBackendExperience,
  mapBackendPlan,
  mapBackendGuide,
} from '../../utils/browseUtils.js';
import { apiRequest } from '../../services/api.js';
import BrowseHotelCard from './BrowseHotelCard.jsx';
import BrowseExperienceCard from './BrowseExperienceCard.jsx';
import BrowsePlanCard from './BrowsePlanCard.jsx';
import BrowseGuideCard from './BrowseGuideCard.jsx';
import BrowseItemDetailModal from './BrowseItemDetailModal.jsx';
import './travellerBrowse.css';

/**
 * TravellerBrowsePage
 * Complete, accessible browse & search hub for travellers.
 * Supports Hotels, Experiences, Tour Packages (Plans), and Local Guides.
 * Flights are explicitly excluded per project requirements.
 */
export default function TravellerBrowsePage({
  initialCategory = BROWSE_CATEGORIES.HOTELS,
  hotels: propHotels,
  experiences: propExperiences,
  plans: propPlans,
  guides: propGuides,
  isLoading: propIsLoading,
  error: propError,
  onRetry: propOnRetry,
  onSelectItem,
  onBookItem,
  useFixtures = false,
}) {
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchQueryError, setSearchQueryError] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [minStars, setMinStars] = useState(0);
  const [expCategory, setExpCategory] = useState('all');
  const [guideLanguage, setGuideLanguage] = useState('all');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState(SORT_OPTIONS.DEFAULT);
  const [selectedDetailItem, setSelectedDetailItem] = useState(null);

  // Live state per resource category
  const [resourceData, setResourceData] = useState({
    [BROWSE_CATEGORIES.HOTELS]: propHotels ?? [],
    [BROWSE_CATEGORIES.EXPERIENCES]: propExperiences ?? [],
    [BROWSE_CATEGORIES.PLANS]: propPlans ?? [],
    [BROWSE_CATEGORIES.GUIDES]: propGuides ?? [],
  });
  const [resourceLoading, setResourceLoading] = useState({
    [BROWSE_CATEGORIES.HOTELS]: false,
    [BROWSE_CATEGORIES.EXPERIENCES]: false,
    [BROWSE_CATEGORIES.PLANS]: false,
    [BROWSE_CATEGORIES.GUIDES]: false,
  });
  const [resourceErrors, setResourceErrors] = useState({
    [BROWSE_CATEGORIES.HOTELS]: null,
    [BROWSE_CATEGORIES.EXPERIENCES]: null,
    [BROWSE_CATEGORIES.PLANS]: null,
    [BROWSE_CATEGORIES.GUIDES]: null,
  });

  const fetchCategory = useCallback(async (category) => {
    setResourceLoading((prev) => ({ ...prev, [category]: true }));
    setResourceErrors((prev) => ({ ...prev, [category]: null }));

    try {
      let mapped = [];
      if (category === BROWSE_CATEGORIES.HOTELS) {
        const raw = await apiRequest('/hotels');
        mapped = Array.isArray(raw) ? raw.map(mapBackendHotel).filter(Boolean) : [];
      } else if (category === BROWSE_CATEGORIES.EXPERIENCES) {
        const raw = await apiRequest('/experiences');
        mapped = Array.isArray(raw) ? raw.map(mapBackendExperience).filter(Boolean) : [];
      } else if (category === BROWSE_CATEGORIES.PLANS) {
        const res = await apiRequest('/plans');
        const items = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
        mapped = items.map(mapBackendPlan).filter(Boolean);
      } else if (category === BROWSE_CATEGORIES.GUIDES) {
        // Backend guide controller is mapped at singular /guide
        const raw = await apiRequest('/guide');
        mapped = Array.isArray(raw) ? raw.map(mapBackendGuide).filter(Boolean) : [];
      }

      setResourceData((prev) => ({ ...prev, [category]: mapped }));
      setResourceErrors((prev) => ({ ...prev, [category]: null }));
    } catch (err) {
      setResourceErrors((prev) => ({
        ...prev,
        [category]: err.message || `Failed to load ${category}. Please try again.`,
      }));
      // Strict requirement: Never silently present fixture data after an API failure
      setResourceData((prev) => ({ ...prev, [category]: [] }));
    } finally {
      setResourceLoading((prev) => ({ ...prev, [category]: false }));
    }
  }, []);

  useEffect(() => {
    if (useFixtures) return;

    if (propHotels === undefined) fetchCategory(BROWSE_CATEGORIES.HOTELS);
    if (propExperiences === undefined) fetchCategory(BROWSE_CATEGORIES.EXPERIENCES);
    if (propPlans === undefined) fetchCategory(BROWSE_CATEGORIES.PLANS);
    if (propGuides === undefined) fetchCategory(BROWSE_CATEGORIES.GUIDES);
  }, [useFixtures, propHotels, propExperiences, propPlans, propGuides, fetchCategory]);

  const hotels = useFixtures
    ? (propHotels ?? DEFAULT_HOTEL_FIXTURES)
    : (propHotels ?? resourceData[BROWSE_CATEGORIES.HOTELS]);

  const experiences = useFixtures
    ? (propExperiences ?? DEFAULT_EXPERIENCE_FIXTURES)
    : (propExperiences ?? resourceData[BROWSE_CATEGORIES.EXPERIENCES]);

  const plans = useFixtures
    ? (propPlans ?? DEFAULT_PLAN_FIXTURES)
    : (propPlans ?? resourceData[BROWSE_CATEGORIES.PLANS]);

  const guides = useFixtures
    ? (propGuides ?? DEFAULT_GUIDE_FIXTURES)
    : (propGuides ?? resourceData[BROWSE_CATEGORIES.GUIDES]);

  const activeLoading = propIsLoading !== undefined
    ? propIsLoading
    : (useFixtures ? false : Boolean(resourceLoading[activeCategory]));

  const activeError = propError !== undefined
    ? propError
    : (useFixtures ? null : resourceErrors[activeCategory]);

  const handleRetryActive = () => {
    if (typeof propOnRetry === 'function') {
      propOnRetry(activeCategory);
    } else if (!useFixtures) {
      fetchCategory(activeCategory);
    }
  };

  // Validate search input query on change
  const handleQueryChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    const validation = validateSearchInput(val);
    if (!validation.isValid) {
      setSearchQueryError(validation.error || 'Invalid search query');
    } else {
      setSearchQueryError('');
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSearchQueryError('');
    setLocationQuery('');
    setMinStars(0);
    setExpCategory('all');
    setGuideLanguage('all');
    setMaxPrice('');
    setSortBy(SORT_OPTIONS.DEFAULT);
  };

  // Filter and sort items based on active category
  const filteredHotels = useMemo(() => {
    return filterHotels(hotels, {
      query: searchQuery,
      location: locationQuery,
      minStars: Number(minStars || 0),
      maxPrice: maxPrice ? Number(maxPrice) : Infinity,
      sortBy,
    });
  }, [hotels, searchQuery, locationQuery, minStars, maxPrice, sortBy]);

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

  const filteredGuides = useMemo(() => {
    return filterGuides(guides, {
      query: searchQuery,
      location: locationQuery,
      language: guideLanguage,
      sortBy,
    });
  }, [guides, searchQuery, locationQuery, guideLanguage, sortBy]);

  const currentCount = useMemo(() => {
    switch (activeCategory) {
      case BROWSE_CATEGORIES.HOTELS:
        return filteredHotels.length;
      case BROWSE_CATEGORIES.EXPERIENCES:
        return filteredExperiences.length;
      case BROWSE_CATEGORIES.PLANS:
        return filteredPlans.length;
      case BROWSE_CATEGORIES.GUIDES:
        return filteredGuides.length;
      default:
        return 0;
    }
  }, [activeCategory, filteredHotels, filteredExperiences, filteredPlans, filteredGuides]);

  const handleCardSelect = (item) => {
    setSelectedDetailItem(item);
    if (onSelectItem) {
      onSelectItem(item, activeCategory);
    }
  };

  const handleCardBook = (item) => {
    if (onBookItem) {
      onBookItem(item, activeCategory);
    }
  };

  return (
    <div className="trav-browse-page" data-testid="traveller-browse-page">
      {/* Header Banner */}
      <header className="trav-browse-header">
        <div className="trav-browse-title-group">
          <h1 className="trav-browse-title">Discover Stays & Adventures</h1>
          <p className="trav-browse-subtitle">
            Explore verified hotels, immersive experiences, curated packages, and certified local guides.
          </p>
        </div>
      </header>

      {/* Primary Category Navigation Tabs */}
      <nav className="trav-browse-nav" aria-label="Browse Categories">
        <div className="trav-browse-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === BROWSE_CATEGORIES.HOTELS}
            className={`trav-browse-tab ${activeCategory === BROWSE_CATEGORIES.HOTELS ? 'active' : ''}`}
            onClick={() => setActiveCategory(BROWSE_CATEGORIES.HOTELS)}
          >
            🏨 Hotels ({hotels.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === BROWSE_CATEGORIES.EXPERIENCES}
            className={`trav-browse-tab ${activeCategory === BROWSE_CATEGORIES.EXPERIENCES ? 'active' : ''}`}
            onClick={() => setActiveCategory(BROWSE_CATEGORIES.EXPERIENCES)}
          >
            🧭 Experiences ({experiences.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === BROWSE_CATEGORIES.PLANS}
            className={`trav-browse-tab ${activeCategory === BROWSE_CATEGORIES.PLANS ? 'active' : ''}`}
            onClick={() => setActiveCategory(BROWSE_CATEGORIES.PLANS)}
          >
            🗺 Tour Packages ({plans.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === BROWSE_CATEGORIES.GUIDES}
            className={`trav-browse-tab ${activeCategory === BROWSE_CATEGORIES.GUIDES ? 'active' : ''}`}
            onClick={() => setActiveCategory(BROWSE_CATEGORIES.GUIDES)}
          >
            🧑‍🌾 Local Guides ({guides.length})
          </button>
        </div>
      </nav>

      {/* Unified Search & Filter Toolbar */}
      <section className="trav-browse-toolbar" aria-label="Search and Filter Controls">
        <div className="trav-browse-search-row">
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

          <div className="trav-browse-input-wrap">
            <span className="trav-browse-input-icon" aria-hidden="true">📍</span>
            <input
              id="browse-location-input"
              type="text"
              className="trav-browse-input"
              placeholder="City, region or destination..."
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              aria-label="Filter by location or destination"
            />
          </div>

          <div className="trav-browse-sort-wrap">
            <label htmlFor="browse-sort-select" className="trav-browse-sort-label">Sort:</label>
            <select
              id="browse-sort-select"
              className="trav-browse-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value={SORT_OPTIONS.DEFAULT}>Recommended</option>
              <option value={SORT_OPTIONS.PRICE_LOW}>Price: Low to High</option>
              <option value={SORT_OPTIONS.PRICE_HIGH}>Price: High to Low</option>
              <option value={SORT_OPTIONS.RATING}>Highest Rated</option>
              <option value={SORT_OPTIONS.NAME}>Alphabetical (A-Z)</option>
            </select>
          </div>
        </div>

        {searchQueryError && (
          <div className="trav-browse-query-error" role="alert">
            {searchQueryError}
          </div>
        )}

        {/* Dynamic Category Specific Filters */}
        <div className="trav-browse-filter-bar">
          {activeCategory === BROWSE_CATEGORIES.HOTELS && (
            <div className="trav-browse-filter-group" aria-label="Hotel star filter">
              <span className="trav-browse-filter-label">Hotel Class:</span>
              {[0, 3, 4, 5].map((stars) => (
                <button
                  key={stars}
                  type="button"
                  className={`trav-browse-filter-chip ${minStars === stars ? 'active' : ''}`}
                  onClick={() => setMinStars(stars)}
                >
                  {stars === 0 ? 'All Stays' : `${stars}★ & above`}
                </button>
              ))}
            </div>
          )}

          {activeCategory === BROWSE_CATEGORIES.EXPERIENCES && (
            <div className="trav-browse-filter-group" aria-label="Experience category filter">
              <span className="trav-browse-filter-label">Activity:</span>
              {['all', 'adventure', 'culture', 'culinary', 'wellness', 'wildlife'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`trav-browse-filter-chip ${expCategory === cat ? 'active' : ''}`}
                  onClick={() => setExpCategory(cat)}
                >
                  {cat === 'all' ? 'All Activities' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          )}

          {activeCategory === BROWSE_CATEGORIES.GUIDES && (
            <div className="trav-browse-filter-group" aria-label="Guide language filter">
              <span className="trav-browse-filter-label">Language:</span>
              {['all', 'english', 'hindi', 'marathi', 'malayalam'].map((lang) => (
                <button
                  key={lang}
                  type="button"
                  className={`trav-browse-filter-chip ${guideLanguage === lang ? 'active' : ''}`}
                  onClick={() => setGuideLanguage(lang)}
                >
                  {lang === 'all' ? 'All Languages' : lang.charAt(0).toUpperCase() + lang.slice(1)}
                </button>
              ))}
            </div>
          )}

          <div className="trav-browse-price-filter-wrap">
            <label htmlFor="browse-max-price" className="trav-browse-filter-label">Max Price (₹):</label>
            <input
              id="browse-max-price"
              type="number"
              className="trav-browse-price-input"
              placeholder="e.g. 15000"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              min="0"
            />
          </div>

          {(searchQuery || locationQuery || minStars > 0 || expCategory !== 'all' || guideLanguage !== 'all' || maxPrice) && (
            <button
              type="button"
              className="trav-browse-reset-btn"
              onClick={handleResetFilters}
            >
              Reset Filters
            </button>
          )}
        </div>
      </section>

      {/* Results Header Count */}
      <div className="trav-browse-results-bar">
        <span className="trav-browse-results-count">
          Showing <strong>{currentCount}</strong> {activeCategory}
          {locationQuery ? ` in "${locationQuery}"` : ''}
          {searchQuery ? ` matching "${searchQuery}"` : ''}
        </span>
      </div>

      {/* Main Content States */}
      <main className="trav-browse-main-content">
        {/* Loading State */}
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

        {/* Error State */}
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

        {/* Empty State */}
        {!activeLoading && !activeError && currentCount === 0 && (
          <div className="trav-browse-empty-state" data-testid="browse-empty-state">
            <span className="trav-browse-empty-icon" aria-hidden="true">🔍</span>
            <h3>No matching {activeCategory} found</h3>
            <p>
              We couldn't find any results matching your search criteria. Try adjusting your filters, location, or search terms.
            </p>
            <button
              type="button"
              className="trav-browse-btn trav-browse-btn-outline"
              onClick={handleResetFilters}
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* Populated Grid */}
        {!activeLoading && !activeError && currentCount > 0 && (
          <div className="trav-browse-grid" data-testid="browse-grid">
            {activeCategory === BROWSE_CATEGORIES.HOTELS &&
              filteredHotels.map((hotel) => (
                <BrowseHotelCard
                  key={hotel.id}
                  hotel={hotel}
                  onSelect={handleCardSelect}
                  onBook={handleCardBook}
                />
              ))}

            {activeCategory === BROWSE_CATEGORIES.EXPERIENCES &&
              filteredExperiences.map((exp) => (
                <BrowseExperienceCard
                  key={exp.id}
                  experience={exp}
                  onSelect={handleCardSelect}
                  onBook={handleCardBook}
                />
              ))}

            {activeCategory === BROWSE_CATEGORIES.PLANS &&
              filteredPlans.map((plan) => (
                <BrowsePlanCard
                  key={plan.id}
                  plan={plan}
                  onSelect={handleCardSelect}
                  onBook={handleCardBook}
                />
              ))}

            {activeCategory === BROWSE_CATEGORIES.GUIDES &&
              filteredGuides.map((guide) => (
                <BrowseGuideCard
                  key={guide.userId}
                  guide={guide}
                  onSelect={handleCardSelect}
                  onRequest={handleCardBook}
                />
              ))}
          </div>
        )}
      </main>

      {/* Detail Drill-down Modal */}
      {selectedDetailItem && (
        <BrowseItemDetailModal
          item={selectedDetailItem}
          category={activeCategory}
          onClose={() => setSelectedDetailItem(null)}
          onBook={handleCardBook}
        />
      )}
    </div>
  );
}
