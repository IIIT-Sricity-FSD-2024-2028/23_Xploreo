import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
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
} from '../src/utils/browseUtils.js';

describe('browseUtils unit tests', () => {
  describe('BROWSE_CATEGORIES and SORT_OPTIONS constants', () => {
    it('defines supported categories and excludes flights', () => {
      assert.strictEqual(BROWSE_CATEGORIES.HOTELS, 'hotels');
      assert.strictEqual(BROWSE_CATEGORIES.EXPERIENCES, 'experiences');
      assert.strictEqual(BROWSE_CATEGORIES.PLANS, 'plans');
      assert.strictEqual(BROWSE_CATEGORIES.GUIDES, 'guides');
      assert.strictEqual('FLIGHTS' in BROWSE_CATEGORIES, false);
      assert.strictEqual('flights' in Object.values(BROWSE_CATEGORIES), false);
    });
  });

  describe('validateSearchInput', () => {
    it('passes for standard search input and trims whitespace', () => {
      const res = validateSearchInput('  Goa Luxury Resort  ');
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.sanitized, 'Goa Luxury Resort');
      assert.strictEqual(res.error, undefined);
    });

    it('handles non-string types safely', () => {
      const res = validateSearchInput(null);
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.sanitized, '');
    });

    it('rejects queries exceeding 80 characters', () => {
      const longQuery = 'A'.repeat(85);
      const res = validateSearchInput(longQuery);
      assert.strictEqual(res.isValid, false);
      assert.strictEqual(res.sanitized.length, 80);
      assert.ok(res.error.includes('80 characters'));
    });
  });

  describe('filterHotels', () => {
    it('returns empty array when input is not an array', () => {
      assert.deepStrictEqual(filterHotels(null), []);
    });

    it('filters hotels by name/query match case-insensitively', () => {
      const filtered = filterHotels(DEFAULT_HOTEL_FIXTURES, { query: 'exotica' });
      assert.strictEqual(filtered.length, 1);
      assert.strictEqual(filtered[0].id, 'hotel-goa-1');
    });

    it('filters hotels by location / city', () => {
      const filtered = filterHotels(DEFAULT_HOTEL_FIXTURES, { location: 'Kerala' });
      assert.strictEqual(filtered.length, 1);
      assert.strictEqual(filtered[0].id, 'hotel-kerala-2');
    });

    it('filters hotels by minimum stars', () => {
      const fiveStar = filterHotels(DEFAULT_HOTEL_FIXTURES, { minStars: 5 });
      assert.strictEqual(fiveStar.length, 2);
      assert.ok(fiveStar.every((h) => h.stars >= 5));
    });

    it('filters hotels by maximum price per night', () => {
      const budgetHotels = filterHotels(DEFAULT_HOTEL_FIXTURES, { maxPrice: 10000 });
      assert.strictEqual(budgetHotels.length, 1);
      assert.strictEqual(budgetHotels[0].id, 'hotel-jaipur-3');
    });

    it('sorts hotels by price low to high', () => {
      const sorted = filterHotels(DEFAULT_HOTEL_FIXTURES, { sortBy: SORT_OPTIONS.PRICE_LOW });
      assert.strictEqual(sorted[0].id, 'hotel-jaipur-3'); // 8200
      assert.strictEqual(sorted[sorted.length - 1].id, 'hotel-kerala-2'); // 18500
    });

    it('sorts hotels by price high to low', () => {
      const sorted = filterHotels(DEFAULT_HOTEL_FIXTURES, { sortBy: SORT_OPTIONS.PRICE_HIGH });
      assert.strictEqual(sorted[0].id, 'hotel-kerala-2'); // 18500
      assert.strictEqual(sorted[sorted.length - 1].id, 'hotel-jaipur-3'); // 8200
    });

    it('sorts hotels by rating descending', () => {
      const sorted = filterHotels(DEFAULT_HOTEL_FIXTURES, { sortBy: SORT_OPTIONS.RATING });
      assert.strictEqual(sorted[0].id, 'hotel-kerala-2'); // 4.9
    });

    it('sorts hotels alphabetically by name', () => {
      const sorted = filterHotels(DEFAULT_HOTEL_FIXTURES, { sortBy: SORT_OPTIONS.NAME });
      assert.strictEqual(sorted[0].name, 'Heritage Haveli Jaipur');
    });
  });

  describe('filterExperiences', () => {
    it('filters experiences by title and description', () => {
      const filtered = filterExperiences(DEFAULT_EXPERIENCE_FIXTURES, { query: 'kayaking' });
      assert.strictEqual(filtered.length, 1);
      assert.strictEqual(filtered[0].id, 'exp-2');
    });

    it('filters experiences by destination', () => {
      const filtered = filterExperiences(DEFAULT_EXPERIENCE_FIXTURES, { destination: 'Coorg' });
      assert.strictEqual(filtered.length, 1);
      assert.strictEqual(filtered[0].id, 'exp-1');
    });

    it('filters experiences by category', () => {
      const cultureExps = filterExperiences(DEFAULT_EXPERIENCE_FIXTURES, { category: 'culture' });
      assert.strictEqual(cultureExps.length, 1);
      assert.strictEqual(cultureExps[0].id, 'exp-3');
    });

    it('sorts experiences by price low to high', () => {
      const sorted = filterExperiences(DEFAULT_EXPERIENCE_FIXTURES, { sortBy: SORT_OPTIONS.PRICE_LOW });
      assert.strictEqual(sorted[0].id, 'exp-2'); // 1450
      assert.strictEqual(sorted[sorted.length - 1].id, 'exp-3'); // 2200
    });
  });

  describe('filterPlans', () => {
    it('filters plans by destination', () => {
      const filtered = filterPlans(DEFAULT_PLAN_FIXTURES, { destination: 'Jaipur' });
      assert.strictEqual(filtered.length, 1);
      assert.strictEqual(filtered[0].id, 'plan-2');
    });

    it('filters plans by maxPrice', () => {
      const filtered = filterPlans(DEFAULT_PLAN_FIXTURES, { maxPrice: 25000 });
      assert.strictEqual(filtered.length, 1);
      assert.strictEqual(filtered[0].id, 'plan-1'); // 22000
    });

    it('sorts plans alphabetically', () => {
      const sorted = filterPlans(DEFAULT_PLAN_FIXTURES, { sortBy: SORT_OPTIONS.NAME });
      assert.strictEqual(sorted[0].id, 'plan-1'); // "Kerala..."
    });
  });

  describe('filterGuides', () => {
    it('filters guides by name query', () => {
      const filtered = filterGuides(DEFAULT_GUIDE_FIXTURES, { query: 'priya' });
      assert.strictEqual(filtered.length, 1);
      assert.strictEqual(filtered[0].userId, 'G003');
    });

    it('filters guides by location', () => {
      const filtered = filterGuides(DEFAULT_GUIDE_FIXTURES, { location: 'Mumbai' });
      assert.strictEqual(filtered.length, 1);
      assert.strictEqual(filtered[0].userId, 'G001');
    });

    it('filters guides by language spoken', () => {
      const filtered = filterGuides(DEFAULT_GUIDE_FIXTURES, { language: 'malayalam' });
      assert.strictEqual(filtered.length, 1);
      assert.strictEqual(filtered[0].userId, 'G002');
    });

    it('sorts guides by experience descending', () => {
      const sorted = filterGuides(DEFAULT_GUIDE_FIXTURES, { sortBy: SORT_OPTIONS.RATING });
      assert.strictEqual(sorted[0].userId, 'G002'); // 9 years
      assert.strictEqual(sorted[sorted.length - 1].userId, 'G003'); // 5 years
    });
  });

  describe('Default Fixtures Conformance', () => {
    it('provides valid hotel fixtures conforming to backend Hotel entity', () => {
      assert.ok(DEFAULT_HOTEL_FIXTURES.length > 0);
      DEFAULT_HOTEL_FIXTURES.forEach((h) => {
        assert.ok(h.id);
        assert.ok(h.name);
        assert.ok(h.city);
        assert.ok(typeof h.stars === 'number');
        assert.ok(typeof h.pricePerNight === 'number');
      });
    });

    it('provides valid experience fixtures conforming to backend Experience entity', () => {
      assert.ok(DEFAULT_EXPERIENCE_FIXTURES.length > 0);
      DEFAULT_EXPERIENCE_FIXTURES.forEach((e) => {
        assert.ok(e.id);
        assert.ok(e.title);
        assert.ok(e.destination);
        assert.ok(typeof e.price === 'number');
        assert.ok(Array.isArray(e.slots));
      });
    });

    it('provides valid plan fixtures conforming to backend Plan entity', () => {
      assert.ok(DEFAULT_PLAN_FIXTURES.length > 0);
      DEFAULT_PLAN_FIXTURES.forEach((p) => {
        assert.ok(p.id);
        assert.ok(p.title);
        assert.ok(p.destination);
        assert.ok(typeof p.pricePerPerson === 'number');
      });
    });

    it('provides valid guide fixtures conforming to backend Guide entity', () => {
      assert.ok(DEFAULT_GUIDE_FIXTURES.length > 0);
      DEFAULT_GUIDE_FIXTURES.forEach((g) => {
        assert.ok(g.userId);
        assert.ok(g.fname);
        assert.ok(g.location);
        assert.ok(Array.isArray(g.lang_spoken));
      });
    });
  });
});
