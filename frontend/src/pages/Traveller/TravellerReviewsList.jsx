import { useState, useMemo } from 'react';
import {
  formatReviewDate,
  getTargetTypeMeta,
  getStarArray,
  REVIEW_TARGET_TYPES,
} from '../../utils/reviewUtils.js';

/**
 * TravellerReviewsList
 * Displays list of reviews with filtering, loading, empty, and error states.
 * - Loading: skeleton cards
 * - Error: alert banner with retry button
 * - Empty: clean icon + title + guidance
 * - Populated: grid of review cards with star visualization, target badges, author indicator
 * - Target filtering (ALL, GUIDE, HOTEL, EXPERIENCE) & Minimum rating filter
 */
export default function TravellerReviewsList({
  reviews = [],
  isLoading = false,
  error = null,
  onRetry,
  currentTravellerId = null,
  onOpenCreateModal = null,
}) {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [minRatingFilter, setMinRatingFilter] = useState(0);

  // Filter reviews by selected category and minimum rating
  const filteredReviews = useMemo(() => {
    if (!reviews || !Array.isArray(reviews)) return [];

    return reviews.filter((rev) => {
      const categoryMatch =
        selectedCategory === 'ALL' ||
        (rev.targetType && rev.targetType.toLowerCase() === selectedCategory.toLowerCase());

      const ratingMatch =
        minRatingFilter === 0 || (Number(rev.rating) >= Number(minRatingFilter));

      return categoryMatch && ratingMatch;
    });
  }, [reviews, selectedCategory, minRatingFilter]);

  // Loading state
  if (isLoading) {
    return (
      <div className="trav-review-loading" data-testid="traveller-reviews-loading">
        {[1, 2, 3].map((n) => (
          <div key={n} className="trav-review-skeleton-card" aria-hidden="true" />
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="trav-review-error" role="alert" data-testid="traveller-reviews-error">
        <div className="trav-review-error-icon">⚠️</div>
        <h3 className="trav-review-error-title">Unable to Load Reviews</h3>
        <p className="trav-review-error-text">
          {typeof error === 'string'
            ? error
            : error.message || 'We could not fetch review records from the server.'}
        </p>
        {onRetry && (
          <button
            type="button"
            className="trav-review-btn trav-review-btn-primary"
            onClick={onRetry}
            data-testid="retry-reviews-button"
          >
            Retry Loading
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="trav-review-container" data-testid="traveller-reviews-list">
      {/* Category Tabs & Rating Filter Bar */}
      <div className="trav-review-controls">
        <div className="trav-review-tabs" role="tablist" aria-label="Review Categories">
          <button
            type="button"
            role="tab"
            aria-selected={selectedCategory === 'ALL'}
            className={`trav-review-tab-btn ${selectedCategory === 'ALL' ? 'is-active' : ''}`}
            onClick={() => setSelectedCategory('ALL')}
            data-testid="filter-tab-all"
          >
            All Reviews
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={selectedCategory === REVIEW_TARGET_TYPES.GUIDE}
            className={`trav-review-tab-btn ${selectedCategory === REVIEW_TARGET_TYPES.GUIDE ? 'is-active' : ''}`}
            onClick={() => setSelectedCategory(REVIEW_TARGET_TYPES.GUIDE)}
            data-testid="filter-tab-guide"
          >
            Tour Guides
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={selectedCategory === REVIEW_TARGET_TYPES.HOTEL}
            className={`trav-review-tab-btn ${selectedCategory === REVIEW_TARGET_TYPES.HOTEL ? 'is-active' : ''}`}
            onClick={() => setSelectedCategory(REVIEW_TARGET_TYPES.HOTEL)}
            data-testid="filter-tab-hotel"
          >
            Hotels
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={selectedCategory === REVIEW_TARGET_TYPES.EXPERIENCE}
            className={`trav-review-tab-btn ${selectedCategory === REVIEW_TARGET_TYPES.EXPERIENCE ? 'is-active' : ''}`}
            onClick={() => setSelectedCategory(REVIEW_TARGET_TYPES.EXPERIENCE)}
            data-testid="filter-tab-experience"
          >
            Experiences
          </button>
        </div>

        <div className="trav-review-rating-filter">
          <label htmlFor="rating-filter-select">Rating:</label>
          <select
            id="rating-filter-select"
            className="trav-review-rating-select"
            value={minRatingFilter}
            onChange={(e) => setMinRatingFilter(Number(e.target.value))}
            data-testid="rating-filter-select"
          >
            <option value={0}>All Ratings</option>
            <option value={5}>5 Stars only</option>
            <option value={4}>4+ Stars</option>
            <option value={3}>3+ Stars</option>
          </select>
        </div>
      </div>

      {/* Empty State */}
      {filteredReviews.length === 0 ? (
        <div className="trav-review-empty" data-testid="traveller-reviews-empty">
          <div className="trav-review-empty-icon">💬</div>
          <h3 className="trav-review-empty-title">No Reviews Found</h3>
          <p className="trav-review-empty-text">
            {selectedCategory === 'ALL' && minRatingFilter === 0
              ? 'There are currently no reviews recorded in the system. Be the first to share your feedback!'
              : 'No reviews match your selected category or rating filter.'}
          </p>
          {onOpenCreateModal && (
            <button
              type="button"
              className="trav-review-btn trav-review-btn-primary"
              onClick={onOpenCreateModal}
            >
              Write First Review
            </button>
          )}
        </div>
      ) : (
        /* Populated Review Cards Grid */
        <div className="trav-review-grid" data-testid="traveller-reviews-grid">
          {filteredReviews.map((review) => {
            const targetMeta = getTargetTypeMeta(review.targetType);
            const stars = getStarArray(review.rating);
            const isOwnReview =
              currentTravellerId &&
              Number(review.userId) === Number(currentTravellerId);

            return (
              <article
                key={review.id}
                className="trav-review-card"
                data-testid={`review-card-${review.id}`}
              >
                <div className="trav-review-card-top">
                  <div>
                    <span className={`trav-badge ${targetMeta.className}`}>
                      {targetMeta.label}
                    </span>
                    {isOwnReview && (
                      <span className="trav-badge trav-badge-owner">
                        Your Review
                      </span>
                    )}
                  </div>
                  <div
                    className="trav-review-stars"
                    aria-label={`Rating: ${review.rating} out of 5 stars`}
                  >
                    {stars.map((s) => (
                      <span
                        key={s.index}
                        className={`trav-star-icon ${
                          s.isFilled ? 'trav-star-filled' : 'trav-star-empty'
                        }`}
                        aria-hidden="true"
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>

                <p className="trav-review-comment">{review.comment}</p>

                <div className="trav-review-meta">
                  <span>Target #{review.targetId}</span>
                  <span>{formatReviewDate(review.createdAt)}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
