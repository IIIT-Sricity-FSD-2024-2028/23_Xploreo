import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateReviewForm,
  formatReviewDate,
  getTargetTypeMeta,
  getStarArray,
  REVIEW_TARGET_TYPES,
} from '../src/utils/reviewUtils.js';

describe('reviewUtils unit tests', () => {
  describe('validateReviewForm', () => {
    const validPayload = {
      userId: 20001,
      targetType: 'guide',
      targetId: 10001,
      rating: 5,
      comment: 'Excellent trip with very knowledgeable guide.',
    };

    it('passes for a valid complete review payload', () => {
      const res = validateReviewForm(validPayload);
      assert.strictEqual(res.isValid, true);
      assert.deepStrictEqual(res.errors, {});
    });

    it('accepts string numbers that can be cleanly parsed as integers', () => {
      const res = validateReviewForm({
        ...validPayload,
        userId: '20001',
        targetId: '10001',
        rating: '4',
      });
      assert.strictEqual(res.isValid, true);
    });

    it('rejects invalid or missing userId', () => {
      const res = validateReviewForm({ ...validPayload, userId: null });
      assert.strictEqual(res.isValid, false);
      assert.ok(res.errors.userId);

      const res2 = validateReviewForm({ ...validPayload, userId: -5 });
      assert.strictEqual(res2.isValid, false);
      assert.ok(res2.errors.userId);
    });

    it('rejects invalid targetType not in enum', () => {
      const res = validateReviewForm({ ...validPayload, targetType: 'flight' });
      assert.strictEqual(res.isValid, false);
      assert.ok(res.errors.targetType);
    });

    it('rejects invalid or missing targetId', () => {
      const res = validateReviewForm({ ...validPayload, targetId: 0 });
      assert.strictEqual(res.isValid, false);
      assert.ok(res.errors.targetId);
    });

    it('rejects rating outside 1-5 range', () => {
      const resUnder = validateReviewForm({ ...validPayload, rating: 0 });
      assert.strictEqual(resUnder.isValid, false);
      assert.ok(resUnder.errors.rating);

      const resOver = validateReviewForm({ ...validPayload, rating: 6 });
      assert.strictEqual(resOver.isValid, false);
      assert.ok(resOver.errors.rating);

      const resDec = validateReviewForm({ ...validPayload, rating: 4.5 });
      assert.strictEqual(resDec.isValid, false);
      assert.ok(resDec.errors.rating);
    });

    it('rejects comment shorter than 3 characters or missing', () => {
      const resShort = validateReviewForm({ ...validPayload, comment: 'ok' });
      assert.strictEqual(resShort.isValid, false);
      assert.ok(resShort.errors.comment);

      const resEmpty = validateReviewForm({ ...validPayload, comment: '   ' });
      assert.strictEqual(resEmpty.isValid, false);
      assert.ok(resEmpty.errors.comment);
    });
  });

  describe('formatReviewDate', () => {
    it('formats a date string accurately', () => {
      const formatted = formatReviewDate('2026-10-12T10:00:00.000Z');
      assert.ok(formatted.includes('2026'));
      assert.ok(formatted.includes('Oct'));
    });

    it('returns fallback for null or missing dates', () => {
      assert.strictEqual(formatReviewDate(null), 'Recently');
      assert.strictEqual(formatReviewDate('invalid-date'), 'Recently');
    });
  });

  describe('getTargetTypeMeta', () => {
    it('returns proper labels and CSS classes', () => {
      const guideMeta = getTargetTypeMeta(REVIEW_TARGET_TYPES.GUIDE);
      assert.strictEqual(guideMeta.label, 'Tour Guide');
      assert.strictEqual(guideMeta.className, 'trav-badge-guide');

      const hotelMeta = getTargetTypeMeta(REVIEW_TARGET_TYPES.HOTEL);
      assert.strictEqual(hotelMeta.label, 'Hotel & Stay');
      assert.strictEqual(hotelMeta.className, 'trav-badge-hotel');

      const expMeta = getTargetTypeMeta(REVIEW_TARGET_TYPES.EXPERIENCE);
      assert.strictEqual(expMeta.label, 'Experience');
      assert.strictEqual(expMeta.className, 'trav-badge-experience');
    });
  });

  describe('getStarArray', () => {
    it('produces 5 star elements with correct filled states', () => {
      const stars = getStarArray(4);
      assert.strictEqual(stars.length, 5);
      assert.strictEqual(stars.filter((s) => s.isFilled).length, 4);
    });
  });
});
