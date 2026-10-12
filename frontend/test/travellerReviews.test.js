import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  renderReviewsList,
  renderReviewForm,
  renderReviewsPage,
} from './dist-test/checkoutTestBundleEntry.js';

describe('Day 4 Traveller Reviews UI Tests', () => {
  const sampleReviews = [
    {
      id: 1,
      userId: 20001,
      targetType: 'guide',
      targetId: 10001,
      rating: 5,
      comment: 'Friendly guide and a very well planned city walk.',
      createdAt: '2026-10-12T08:00:00.000Z',
    },
    {
      id: 2,
      userId: 20002,
      targetType: 'hotel',
      targetId: 30001,
      rating: 4,
      comment: 'Clean rooms and excellent room service.',
      createdAt: '2026-10-11T12:00:00.000Z',
    },
    {
      id: 3,
      userId: 20001,
      targetType: 'experience',
      targetId: 40001,
      rating: 5,
      comment: 'Breathtaking backwaters kayaking experience.',
      createdAt: '2026-10-10T14:00:00.000Z',
    },
  ];

  describe('Loading State', () => {
    it('renders skeleton cards when isLoading is true', () => {
      const html = renderReviewsList({
        isLoading: true,
        reviews: [],
      });

      assert.ok(html.includes('data-testid="traveller-reviews-loading"'));
      assert.ok(html.includes('trav-review-skeleton-card'));
    });
  });

  describe('Error State & Retry', () => {
    it('renders error alert and retry button when error prop is present', () => {
      const html = renderReviewsList({
        isLoading: false,
        reviews: [],
        error: 'Failed to connect to reviews endpoint',
        onRetry: () => {},
      });

      assert.ok(html.includes('data-testid="traveller-reviews-error"'));
      assert.ok(html.includes('Unable to Load Reviews'));
      assert.ok(html.includes('Failed to connect to reviews endpoint'));
      assert.ok(html.includes('Retry Loading'));
    });
  });

  describe('Empty State', () => {
    it('renders empty feedback message when review list is empty', () => {
      const html = renderReviewsList({
        isLoading: false,
        reviews: [],
        onOpenCreateModal: () => {},
      });

      assert.ok(html.includes('data-testid="traveller-reviews-empty"'));
      assert.ok(html.includes('No Reviews Found'));
      assert.ok(html.includes('Write First Review'));
    });
  });

  describe('Populated State & Categorization', () => {
    it('renders review cards with star ratings and target badges', () => {
      const html = renderReviewsList({
        isLoading: false,
        reviews: sampleReviews,
        currentTravellerId: 20001,
      });

      assert.ok(html.includes('data-testid="traveller-reviews-grid"'));
      assert.ok(html.includes('Friendly guide and a very well planned city walk.'));
      assert.ok(html.includes('Clean rooms and excellent room service.'));
      assert.ok(html.includes('Breathtaking backwaters kayaking experience.'));

      // Category badges
      assert.ok(html.includes('Tour Guide'));
      assert.ok(html.includes('Hotel &amp; Stay'));
      assert.ok(html.includes('Experience'));

      // Ownership badge for current traveller
      assert.ok(html.includes('Your Review'));
    });
  });

  describe('ReviewSubmissionForm Rendering & Accessibility', () => {
    it('renders form with accessible fields, star picker, and submit button', () => {
      const html = renderReviewForm({
        currentUserId: 20001,
        defaultTargetType: 'guide',
        defaultTargetId: 10001,
        isSubmitting: false,
      });

      assert.ok(html.includes('data-testid="review-submission-form"'));
      assert.ok(html.includes('data-testid="star-rating-picker"'));
      assert.ok(html.includes('role="radiogroup"'));
      assert.ok(html.includes('Submit Review'));
      assert.ok(html.includes('Your Review &amp; Feedback'));
    });

    it('renders in disabled/processing state when isSubmitting is true', () => {
      const html = renderReviewForm({
        currentUserId: 20001,
        isSubmitting: true,
      });

      assert.ok(html.includes('disabled=""'));
      assert.ok(html.includes('Submitting Review...'));
    });

    it('displays API error alert when apiError prop is present', () => {
      const html = renderReviewForm({
        currentUserId: 20001,
        apiError: 'Backend error: Target does not exist',
      });

      assert.ok(html.includes('data-testid="review-form-api-error"'));
      assert.ok(html.includes('Backend error: Target does not exist'));
    });
  });

  describe('TravellerReviewsPage Top-Level Component', () => {
    it('renders header, write review action, and review list container', () => {
      const html = renderReviewsPage({
        reviews: sampleReviews,
        currentTravellerId: 20001,
      });

      assert.ok(html.includes('data-testid="traveller-reviews-page"'));
      assert.ok(html.includes('Traveller Reviews &amp; Feedback'));
      assert.ok(html.includes('Write a Review'));
      assert.ok(html.includes('data-testid="traveller-reviews-list"'));
    });
  });
});
