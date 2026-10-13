import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  renderHotelCard,
  renderExperienceCard,
  renderPlanCard,
  renderGuideCard,
  renderBrowseModal,
  renderBrowsePage,
} from './dist-test/checkoutTestBundleEntry.js';
import {
  DEFAULT_HOTEL_FIXTURES,
  DEFAULT_EXPERIENCE_FIXTURES,
  DEFAULT_PLAN_FIXTURES,
  DEFAULT_GUIDE_FIXTURES,
  BROWSE_CATEGORIES,
} from '../src/utils/browseUtils.js';

describe('Day 5 Traveller Browse & Search UI Tests', () => {
  describe('Loading State', () => {
    it('renders skeleton items with aria-busy when isLoading is true', () => {
      const html = renderBrowsePage({
        isLoading: true,
      });

      assert.ok(html.includes('trav-browse-skeleton-grid'));
      assert.ok(html.includes('aria-busy="true"'));
      assert.ok(html.includes('Loading catalog results'));
    });
  });

  describe('Error State & Retry', () => {
    it('renders error alert and retry button when error prop is present', () => {
      const html = renderBrowsePage({
        isLoading: false,
        error: 'Failed to fetch active catalog from backend.',
        onRetry: () => {},
      });

      assert.ok(html.includes('trav-browse-error-state'));
      assert.ok(html.includes('role="alert"'));
      assert.ok(html.includes('Failed to fetch active catalog from backend.'));
      assert.ok(html.includes('Try Again'));
    });
  });

  describe('Empty State', () => {
    it('renders empty feedback message and reset filters button when count is 0', () => {
      const html = renderBrowsePage({
        isLoading: false,
        hotels: [],
        experiences: [],
        plans: [],
        guides: [],
      });

      assert.ok(html.includes('trav-browse-empty-state'));
      assert.ok(html.includes('No matching'));
      assert.ok(html.includes('Clear All Filters'));
    });
  });

  describe('BrowseHotelCard Component', () => {
    const hotel = DEFAULT_HOTEL_FIXTURES[0];

    it('renders hotel card with star badge, location, amenities, and formatted price', () => {
      const html = renderHotelCard({ hotel, onSelect: () => {}, onBook: () => {} });

      assert.ok(html.includes('Taj Exotica Resort'));
      assert.ok(html.includes('hotel-card-hotel-goa-1'));
      assert.ok(html.includes('trav-browse-star-badge'));
      assert.ok(html.includes('₹16,500'));
      assert.ok(html.includes('View Details'));
      assert.ok(html.includes('Book Now'));
    });
  });

  describe('BrowseExperienceCard Component', () => {
    const exp = DEFAULT_EXPERIENCE_FIXTURES[0];

    it('renders experience card with category badge, duration, and price per person', () => {
      const html = renderExperienceCard({ experience: exp, onSelect: () => {}, onBook: () => {} });

      assert.ok(html.includes(exp.title));
      assert.ok(html.includes('ADVENTURE'));
      assert.ok(html.includes('6h'));
      assert.ok(html.includes('₹1,800'));
      assert.ok(html.includes('Book Slot'));
    });
  });

  describe('BrowsePlanCard Component', () => {
    const plan = DEFAULT_PLAN_FIXTURES[0];

    it('renders package card with nights, destination, tags, and price', () => {
      const html = renderPlanCard({ plan, onSelect: () => {}, onBook: () => {} });

      assert.ok(html.includes('Kerala Backwaters'));
      assert.ok(html.includes('5 Nights / 6 Days'));
      assert.ok(html.includes('₹22,000'));
      assert.ok(html.includes('Select Package'));
      assert.ok(html.includes('View Itinerary'));
    });
  });

  describe('BrowseGuideCard Component', () => {
    const guide = DEFAULT_GUIDE_FIXTURES[0];

    it('renders guide card with name, title, years of experience, and languages', () => {
      const html = renderGuideCard({ guide, onSelect: () => {}, onRequest: () => {} });

      assert.ok(html.includes('Sreekar Sharma'));
      assert.ok(html.includes('Senior Western Ghats Trek Leader'));
      assert.ok(html.includes('7+ Years Exp.'));
      assert.ok(html.includes('English'));
      assert.ok(html.includes('Book Guide'));
    });
  });

  describe('BrowseItemDetailModal Component', () => {
    it('renders accessible modal dialog with details and close button', () => {
      const hotel = DEFAULT_HOTEL_FIXTURES[0];
      const html = renderBrowseModal({
        item: hotel,
        category: 'hotels',
        onClose: () => {},
        onBook: () => {},
      });

      assert.ok(html.includes('role="dialog"'));
      assert.ok(html.includes('aria-modal="true"'));
      assert.ok(html.includes('Taj Exotica Resort'));
      assert.ok(html.includes('Included Amenities'));
      assert.ok(html.includes('Close details'));
      assert.ok(html.includes('Proceed with Selection'));
    });
  });

  describe('TravellerBrowsePage Integrated Hub & Flights Exclusion Compliance', () => {
    it('renders category switcher tabs for hotels, experiences, plans, and guides', () => {
      const html = renderBrowsePage({
        initialCategory: BROWSE_CATEGORIES.HOTELS,
      });

      assert.ok(html.includes('Hotels'));
      assert.ok(html.includes('Experiences'));
      assert.ok(html.includes('Tour Packages'));
      assert.ok(html.includes('Local Guides'));
    });

    it('strictly excludes flights from traveller browse UI per project requirements', () => {
      const html = renderBrowsePage({});

      // Ensure no flight tabs, flight cards, flight options
      assert.strictEqual(html.includes('✈️ Flights'), false);
      assert.strictEqual(html.includes('Flight Search'), false);
      assert.strictEqual(html.includes('Book Flight'), false);
    });

    it('renders search input and sort controls with accessible labels', () => {
      const html = renderBrowsePage({});

      assert.ok(html.includes('id="browse-search-input"'));
      assert.ok(html.includes('id="browse-location-input"'));
      assert.ok(html.includes('id="browse-sort-select"'));
      assert.ok(html.includes('Recommended'));
    });
  });
});
