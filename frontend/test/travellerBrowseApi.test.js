import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  mapBackendHotel,
  mapBackendExperience,
  mapBackendPlan,
  mapBackendGuide,
  filterHotels,
  filterExperiences,
  filterPlans,
  filterGuides,
  SORT_OPTIONS,
  DEFAULT_HOTEL_FIXTURES,
} from '../src/utils/browseUtils.js';
import {
  renderBrowsePage,
  renderHotelCard,
  renderExperienceCard,
  renderPlanCard,
  renderGuideCard,
} from './dist-test/checkoutTestBundleEntry.js';
import { apiRequest } from '../src/services/api.js';

describe('Stage 3A: Live Browse/Search API Integration Tests', () => {
  let originalLocalStorage;
  let originalFetch;
  let capturedRequests = [];

  beforeEach(() => {
    capturedRequests = [];
    originalLocalStorage = globalThis.localStorage;
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.localStorage = originalLocalStorage;
    globalThis.fetch = originalFetch;
  });

  describe('1. Backend DTO & Entity Mapping (Field Mapping Fidelity)', () => {
    it('maps raw backend Hotel entity to card props correctly with defaults', () => {
      const rawBackendHotel = {
        id: 'hotel-live-101',
        name: 'The Leela Palace Bengaluru',
        city: 'Bengaluru',
        location: 'Old Airport Road',
        description: 'Art Deco palace nestled in seven acres of tranquil gardens.',
        stars: 5,
        rating: 4.9,
        reviewCount: 520,
        pricePerNight: 24000,
        taxesAndFees: 4320,
        image: 'https://images.example.com/leela.jpg',
        amenities: ['Spa', 'Pool', 'Fine Dining', 'WiFi'],
        status: 'active',
      };

      const mapped = mapBackendHotel(rawBackendHotel);
      assert.strictEqual(mapped.id, 'hotel-live-101');
      assert.strictEqual(mapped.name, 'The Leela Palace Bengaluru');
      assert.strictEqual(mapped.city, 'Bengaluru');
      assert.strictEqual(mapped.location, 'Old Airport Road');
      assert.strictEqual(mapped.stars, 5);
      assert.strictEqual(mapped.rating, 4.9);
      assert.strictEqual(mapped.reviewCount, 520);
      assert.strictEqual(mapped.pricePerNight, 24000);
      assert.strictEqual(mapped.taxesAndFees, 4320);
      assert.deepStrictEqual(mapped.amenities, ['Spa', 'Pool', 'Fine Dining', 'WiFi']);
      assert.strictEqual(mapped.status, 'active');

      // Test rendering in card
      const html = renderHotelCard({ hotel: mapped });
      assert.ok(html.includes('The Leela Palace Bengaluru'));
      assert.ok(html.includes('Old Airport Road, Bengaluru'));
      assert.ok(html.includes('₹24,000'));
      assert.ok(html.includes('₹4,320'));
      assert.ok(html.includes('520 verified reviews'));
    });

    it('handles sparse or missing hotel fields with safe fallbacks without failing', () => {
      const sparseHotel = {
        name: 'Hilltop Resort',
      };

      const mapped = mapBackendHotel(sparseHotel);
      assert.ok(mapped.id.startsWith('hotel-'));
      assert.strictEqual(mapped.name, 'Hilltop Resort');
      assert.strictEqual(mapped.stars, 3);
      assert.strictEqual(mapped.pricePerNight, 0);
      assert.deepStrictEqual(mapped.amenities, []);
      assert.strictEqual(mapped.status, 'active');
      assert.strictEqual(mapBackendHotel(null), null);
    });

    it('maps raw backend Experience entity to card props correctly', () => {
      const rawBackendExp = {
        id: 'exp-live-202',
        partnerId: 'partner-goa',
        title: 'Mandovi River Sunset Cruise & Dolphin Sighting',
        description: 'Cruising through the backwaters of Mandovi river at sunset.',
        destination: 'Goa',
        category: 'ADVENTURE',
        availability: 'available',
        price: 2500,
        durationHours: 3,
        capacity: 20,
        booked: 5,
        image: 'https://images.example.com/cruise.jpg',
        slots: [
          { id: 's1', date: '2026-11-10', time: '04:30 PM', booked: 5, capacity: 20, available: true },
        ],
      };

      const mapped = mapBackendExperience(rawBackendExp);
      assert.strictEqual(mapped.id, 'exp-live-202');
      assert.strictEqual(mapped.title, 'Mandovi River Sunset Cruise & Dolphin Sighting');
      assert.strictEqual(mapped.destination, 'Goa');
      assert.strictEqual(mapped.category, 'adventure');
      assert.strictEqual(mapped.price, 2500);
      assert.strictEqual(mapped.durationHours, 3);
      assert.strictEqual(mapped.capacity, 20);
      assert.strictEqual(mapped.booked, 5);
      assert.strictEqual(mapped.nextSlot, '2026-11-10 04:30 PM');

      const html = renderExperienceCard({ experience: mapped });
      assert.ok(html.includes('Mandovi River Sunset Cruise'));
      assert.ok(html.includes('ADVENTURE'));
      assert.ok(html.includes('3h'));
      assert.ok(html.includes('₹2,500'));
      assert.ok(html.includes('15 spots left'));
      assert.strictEqual(mapBackendExperience(null), null);
    });

    it('maps raw backend Plan entity to card props correctly without exposing flight UI', () => {
      const rawBackendPlan = {
        id: 'plan-live-303',
        title: 'Kashmir Valley Paradise Tour',
        description: 'Houseboat in Dal Lake and snow valleys of Gulmarg.',
        from: 'Delhi',
        destination: 'Srinagar & Gulmarg',
        durationNights: 6,
        pricePerPerson: 42000,
        hotelStars: 5,
        includesFlight: true,
        tags: ['Snow', 'Mountains', 'Dal Lake'],
      };

      const mapped = mapBackendPlan(rawBackendPlan);
      assert.strictEqual(mapped.id, 'plan-live-303');
      assert.strictEqual(mapped.title, 'Kashmir Valley Paradise Tour');
      assert.strictEqual(mapped.originCity, 'Delhi');
      assert.strictEqual(mapped.destination, 'Srinagar & Gulmarg');
      assert.strictEqual(mapped.durationNights, 6);
      assert.strictEqual(mapped.pricePerPerson, 42000);
      assert.strictEqual(mapped.hotelStars, 5);
      assert.deepStrictEqual(mapped.tags, ['Snow', 'Mountains', 'Dal Lake']);

      const html = renderPlanCard({ plan: mapped });
      assert.ok(html.includes('Kashmir Valley Paradise Tour'));
      assert.ok(html.includes('Delhi → Srinagar'));
      assert.ok(html.includes('6 Nights / 7 Days'));
      assert.ok(html.includes('5★ Stays'));
      assert.ok(html.includes('₹42,000'));
      // Flights must NOT appear in card UI
      assert.strictEqual(html.includes('Flight'), false);
      assert.strictEqual(mapBackendPlan(null), null);
    });

    it('maps raw backend Guide entity to card props correctly', () => {
      const rawBackendGuide = {
        userId: 'G900',
        fname: 'Vikas',
        lname: 'Mishra',
        email: 'vikas@varanasi.tours',
        phone: 9876543210,
        location: 'Varanasi',
        prof_title: 'Ancient Ghats & Vedic Culture Historian',
        years_exp: 12,
        bio: 'Scholar of Varanasi archaeology with 12+ years conducting sunrise boat tours and temple walks.',
        lang_spoken: ['English', 'Hindi', 'Sanskrit'],
        certifications: ['Govt Licensed Heritage Guide', 'First Aid Certified'],
      };

      const mapped = mapBackendGuide(rawBackendGuide);
      assert.strictEqual(mapped.userId, 'G900');
      assert.strictEqual(mapped.fname, 'Vikas');
      assert.strictEqual(mapped.lname, 'Mishra');
      assert.strictEqual(mapped.location, 'Varanasi');
      assert.strictEqual(mapped.prof_title, 'Ancient Ghats & Vedic Culture Historian');
      assert.strictEqual(mapped.years_exp, 12);
      assert.deepStrictEqual(mapped.lang_spoken, ['English', 'Hindi', 'Sanskrit']);

      const html = renderGuideCard({ guide: mapped });
      assert.ok(html.includes('Vikas Mishra'));
      assert.ok(html.includes('Ancient Ghats'));
      assert.ok(html.includes('Vedic Culture Historian'));
      assert.ok(html.includes('12+ Years Exp.'));
      assert.ok(html.includes('Varanasi'));
      assert.ok(html.includes('Sanskrit'));
      assert.strictEqual(mapBackendGuide(null), null);
    });
  });

  describe('2. Endpoint Paths & Authentication Guard Compliance', () => {
    it('calls the exact backend paths with auth headers for all four resources', async () => {
      const mockStorage = {
        xploreoUser: JSON.stringify({ userId: 'trav-88', role: 'traveller' }),
      };
      globalThis.localStorage = {
        getItem: (key) => mockStorage[key] || null,
        setItem: () => {},
        removeItem: () => {},
      };

      globalThis.fetch = async (url, options) => {
        capturedRequests.push({ url, options });
        return {
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ success: true, data: [] }),
        };
      };

      // Call each of the 4 browse endpoints
      await apiRequest('/hotels');
      await apiRequest('/experiences');
      await apiRequest('/plans');
      await apiRequest('/guide'); // Singular /guide controller

      assert.strictEqual(capturedRequests.length, 4);

      // Verify endpoint paths
      assert.ok(capturedRequests[0].url.endsWith('/api/hotels'));
      assert.ok(capturedRequests[1].url.endsWith('/api/experiences'));
      assert.ok(capturedRequests[2].url.endsWith('/api/plans'));
      assert.ok(capturedRequests[3].url.endsWith('/api/guide'));
      // Note singular guide path
      assert.strictEqual(capturedRequests[3].url.includes('/api/guides'), false);

      // Verify auth headers on all endpoints
      for (const req of capturedRequests) {
        assert.strictEqual(req.options.headers['x-user-id'], 'trav-88');
        assert.strictEqual(req.options.headers['x-user-role'], 'traveller');
      }
    });

    it('rejects unauthenticated requests before calling network when session is absent', async () => {
      globalThis.localStorage = {
        getItem: () => null,
      };

      let fetchInvoked = false;
      globalThis.fetch = async () => {
        fetchInvoked = true;
        return { ok: true };
      };

      await assert.rejects(
        () => apiRequest('/hotels'),
        /Authentication required\. Missing or invalid saved session\./
      );

      await assert.rejects(
        () => apiRequest('/experiences'),
        /Authentication required\. Missing or invalid saved session\./
      );

      await assert.rejects(
        () => apiRequest('/plans'),
        /Authentication required\. Missing or invalid saved session\./
      );

      await assert.rejects(
        () => apiRequest('/guide'),
        /Authentication required\. Missing or invalid saved session\./
      );

      assert.strictEqual(fetchInvoked, false);
    });
  });

  describe('3. Loading, Empty, and Error States', () => {
    it('renders skeleton grid with accessible aria attributes during loading', () => {
      const html = renderBrowsePage({
        isLoading: true,
      });

      assert.ok(html.includes('trav-browse-skeleton-grid'));
      assert.ok(html.includes('aria-busy="true"'));
      assert.ok(html.includes('Loading catalog results'));
      assert.strictEqual(html.includes('hotel-card-'), false);
    });

    it('renders empty feedback message when active catalog returns no results', () => {
      const html = renderBrowsePage({
        isLoading: false,
        hotels: [],
        experiences: [],
        plans: [],
        guides: [],
      });

      assert.ok(html.includes('trav-browse-empty-state'));
      assert.ok(html.includes('data-testid="browse-empty-state"'));
      assert.ok(html.includes('No matching hotels found'));
      assert.ok(html.includes('Clear All Filters'));
      assert.strictEqual(html.includes('Taj Exotica'), false);
    });

    it('surfaces authentication failure clearly without disguising as empty results or mock data', () => {
      const html = renderBrowsePage({
        isLoading: false,
        error: 'Authentication required. Missing or invalid saved session.',
        hotels: [],
      });

      assert.ok(html.includes('trav-browse-error-state'));
      assert.ok(html.includes('role="alert"'));
      assert.ok(html.includes('Authentication required. Missing or invalid saved session.'));
      assert.ok(html.includes('Try Again'));
      // Must NOT show empty state
      assert.strictEqual(html.includes('data-testid="browse-empty-state"'), false);
      // Must NOT show mock fixtures
      assert.strictEqual(html.includes('Taj Exotica'), false);
    });

    it('surfaces backend 403 or 500 error and provides retry action', () => {
      const html = renderBrowsePage({
        isLoading: false,
        error: 'Forbidden: x-user-role header is required',
        onRetry: () => {},
        hotels: [],
      });

      assert.ok(html.includes('trav-browse-error-state'));
      assert.ok(html.includes('Forbidden: x-user-role header is required'));
      assert.ok(html.includes('Try Again'));
      assert.strictEqual(html.includes('DEFAULT_HOTEL_FIXTURES'), false);
    });
  });

  describe('4. No Accidental Fixture Fallback on Failure', () => {
    it('strictly does not present fixture data when live request fails', () => {
      // Simulate live failure state
      const html = renderBrowsePage({
        useFixtures: false,
        hotels: [],
        error: 'Connection refused: Backend service unavailable on port 3000',
      });

      // Confirm error is displayed
      assert.ok(html.includes('Connection refused'));
      assert.ok(html.includes('Unable to load hotels'));

      // Confirm default fixtures are NOT rendered
      for (const fixture of DEFAULT_HOTEL_FIXTURES) {
        assert.strictEqual(html.includes(fixture.name), false);
      }
    });
  });

  describe('5. Filtering and Sorting with Real-Shaped Backend Data', () => {
    const liveHotels = [
      mapBackendHotel({
        id: 'h-1',
        name: 'The Grand Hyatt',
        city: 'Goa',
        location: 'Bambolim Bay',
        stars: 5,
        rating: 4.8,
        pricePerNight: 22000,
        status: 'active',
      }),
      mapBackendHotel({
        id: 'h-2',
        name: 'Boutique Heritage Villa',
        city: 'Jaipur',
        location: 'Civil Lines',
        stars: 4,
        rating: 4.5,
        pricePerNight: 7500,
        status: 'active',
      }),
      mapBackendHotel({
        id: 'h-3',
        name: 'Coorg Coffee Estate Bungalow',
        city: 'Madikeri',
        location: 'Coorg Hills',
        stars: 3,
        rating: 4.2,
        pricePerNight: 4500,
        status: 'active',
      }),
    ];

    it('filters live-mapped hotels by location and star rating', () => {
      const goaOnly = filterHotels(liveHotels, { location: 'Goa' });
      assert.strictEqual(goaOnly.length, 1);
      assert.strictEqual(goaOnly[0].name, 'The Grand Hyatt');

      const fiveStarsOnly = filterHotels(liveHotels, { minStars: 5 });
      assert.strictEqual(fiveStarsOnly.length, 1);
      assert.strictEqual(fiveStarsOnly[0].name, 'The Grand Hyatt');

      const fourStarsAndAbove = filterHotels(liveHotels, { minStars: 4 });
      assert.strictEqual(fourStarsAndAbove.length, 2);
    });

    it('sorts live-mapped hotels by price low-to-high, high-to-low, and rating', () => {
      const priceLow = filterHotels(liveHotels, { sortBy: SORT_OPTIONS.PRICE_LOW });
      assert.strictEqual(priceLow[0].pricePerNight, 4500);
      assert.strictEqual(priceLow[2].pricePerNight, 22000);

      const priceHigh = filterHotels(liveHotels, { sortBy: SORT_OPTIONS.PRICE_HIGH });
      assert.strictEqual(priceHigh[0].pricePerNight, 22000);
      assert.strictEqual(priceHigh[2].pricePerNight, 4500);

      const byRating = filterHotels(liveHotels, { sortBy: SORT_OPTIONS.RATING });
      assert.strictEqual(byRating[0].rating, 4.8);
    });

    it('filters live-mapped experiences by activity category and max price', () => {
      const liveExperiences = [
        mapBackendExperience({
          id: 'e-1',
          title: 'River Rafting in Dandeli',
          destination: 'Dandeli',
          category: 'ADVENTURE',
          price: 1800,
        }),
        mapBackendExperience({
          id: 'e-2',
          title: 'Kathakali Dance & Dinner',
          destination: 'Kochi',
          category: 'CULTURE',
          price: 2400,
        }),
      ];

      const adventureOnly = filterExperiences(liveExperiences, { category: 'adventure' });
      assert.strictEqual(adventureOnly.length, 1);
      assert.strictEqual(adventureOnly[0].title, 'River Rafting in Dandeli');

      const under2000 = filterExperiences(liveExperiences, { maxPrice: 2000 });
      assert.strictEqual(under2000.length, 1);
      assert.strictEqual(under2000[0].title, 'River Rafting in Dandeli');
    });

    it('filters live-mapped plans by destination', () => {
      const livePlans = [
        mapBackendPlan({
          id: 'p-1',
          title: 'Andaman Beach Explorer',
          from: 'Chennai',
          destination: 'Havelock Island',
          pricePerPerson: 28000,
        }),
        mapBackendPlan({
          id: 'p-2',
          title: 'Ladakh High Passes Tour',
          from: 'Delhi',
          destination: 'Leh Ladakh',
          pricePerPerson: 36000,
        }),
      ];

      const andamanOnly = filterPlans(livePlans, { destination: 'Havelock' });
      assert.strictEqual(andamanOnly.length, 1);
      assert.strictEqual(andamanOnly[0].title, 'Andaman Beach Explorer');
    });

    it('filters live-mapped guides by spoken language', () => {
      const liveGuides = [
        mapBackendGuide({
          userId: 'g-1',
          fname: 'Amit',
          lname: 'Patil',
          location: 'Pune',
          lang_spoken: ['English', 'Marathi'],
        }),
        mapBackendGuide({
          userId: 'g-2',
          fname: 'Gopal',
          lname: 'Menon',
          location: 'Kochi',
          lang_spoken: ['English', 'Malayalam'],
        }),
      ];

      const marathiGuides = filterGuides(liveGuides, { language: 'marathi' });
      assert.strictEqual(marathiGuides.length, 1);
      assert.strictEqual(marathiGuides[0].fname, 'Amit');
    });
  });

  describe('6. Isolated Preview Mode Integrity', () => {
    it('retains default fixtures when useFixtures={true} is explicitly provided', () => {
      const html = renderBrowsePage({
        useFixtures: true,
      });

      // Verify default preview fixtures appear
      assert.ok(html.includes('Taj Exotica Resort'));
      assert.ok(html.includes('Kumarakom Lake Resort'));
      assert.ok(html.includes('Hotels (4)'));
    });
  });
});
