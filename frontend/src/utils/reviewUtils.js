/**
 * reviewUtils.js
 * Pure utility functions and validation conforming to backend Reviews contracts:
 * - backend/src/reviews/dto/create-review.dto.ts
 * - backend/src/reviews/reviews.repository.ts
 */

export const REVIEW_TARGET_TYPES = Object.freeze({
  GUIDE: 'guide',
  HOTEL: 'hotel',
  EXPERIENCE: 'experience',
});

export const VALID_TARGET_TYPES = Object.values(REVIEW_TARGET_TYPES);

/**
 * Validates review submission form data strictly matching backend CreateReviewDto:
 * - userId: integer > 0
 * - targetType: 'guide' | 'hotel' | 'experience'
 * - targetId: integer > 0
 * - rating: integer between 1 and 5 inclusive
 * - comment: non-empty string, trimmed length >= 3
 *
 * @param {Object} data
 * @returns {{ isValid: boolean, errors: Record<string, string> }}
 */
export function validateReviewForm(data = {}) {
  const errors = {};

  // userId check
  const userIdStr = data.userId !== null && data.userId !== undefined ? String(data.userId).trim() : '';
  if (!userIdStr) {
    errors.userId = 'Valid traveller/user ID is required';
  }

  // targetType check
  if (!data.targetType || !VALID_TARGET_TYPES.includes(data.targetType)) {
    errors.targetType = `Target type must be one of: ${VALID_TARGET_TYPES.join(', ')}`;
  }

  // targetId check
  const targetIdStr = data.targetId !== null && data.targetId !== undefined ? String(data.targetId).trim() : '';
  if (!targetIdStr) {
    errors.targetId = 'Target ID is required';
  }

  // rating check (backend @Min(1) @Max(5) @IsInt())
  const ratingNum = Number(data.rating);
  if (
    data.rating === undefined ||
    data.rating === null ||
    Number.isNaN(ratingNum) ||
    !Number.isInteger(ratingNum) ||
    ratingNum < 1 ||
    ratingNum > 5
  ) {
    errors.rating = 'Rating must be an integer between 1 and 5';
  }

  // comment check
  const commentStr = typeof data.comment === 'string' ? data.comment.trim() : '';
  if (!commentStr) {
    errors.comment = 'Please provide a comment for your review';
  } else if (commentStr.length < 3) {
    errors.comment = 'Review comment must be at least 3 characters long';
  } else if (commentStr.length > 1000) {
    errors.comment = 'Review comment cannot exceed 1000 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Formats a Date or date string to a clean human-readable date.
 *
 * @param {string | Date} dateVal
 * @returns {string}
 */
export function formatReviewDate(dateVal) {
  if (!dateVal) return 'Recently';
  try {
    const d = new Date(dateVal);
    if (Number.isNaN(d.getTime())) return 'Recently';
    return d.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Recently';
  }
}

/**
 * Returns a display-friendly label and badge class for target types.
 *
 * @param {string} targetType
 * @returns {{ label: string, className: string }}
 */
export function getTargetTypeMeta(targetType) {
  switch (targetType) {
    case REVIEW_TARGET_TYPES.GUIDE:
      return { label: 'Tour Guide', className: 'trav-badge-guide' };
    case REVIEW_TARGET_TYPES.HOTEL:
      return { label: 'Hotel & Stay', className: 'trav-badge-hotel' };
    case REVIEW_TARGET_TYPES.EXPERIENCE:
      return { label: 'Experience', className: 'trav-badge-experience' };
    default:
      return { label: targetType || 'General', className: 'trav-badge-default' };
  }
}

/**
 * Generates an array of 5 boolean or star representations for rating display.
 *
 * @param {number} rating
 * @returns {Array<{ index: number, isFilled: boolean }>}
 */
export function getStarArray(rating = 0) {
  const clamped = Math.max(0, Math.min(5, Math.round(rating)));
  return [1, 2, 3, 4, 5].map((starIndex) => ({
    index: starIndex,
    isFilled: starIndex <= clamped,
  }));
}

/**
 * Normalizes and compares review author identifiers across string and numeric IDs (e.g. 'T001', '20001').
 */
export function matchesReviewAuthor(reviewUserId, currentUserId) {
  if (reviewUserId == null || currentUserId == null) return false;
  const left = String(reviewUserId).trim().toLowerCase();
  const right = String(currentUserId).trim().toLowerCase();
  return Boolean(left && right && left === right);
}

/**
 * Checks whether a review already exists for a given trip, optionally scoped by targetType and userId,
 * matching backend ReviewsService uniqueness per (tripId, targetType, userId).
 */
export function hasReviewedTripTarget(reviews = [], { tripId, targetType = null, userId = null } = {}) {
  if (!tripId) return false;
  const targetNorm = targetType ? String(targetType).trim().toLowerCase() : null;
  const userNorm = userId != null && String(userId).trim() !== '' ? String(userId).trim().toLowerCase() : null;
  return (Array.isArray(reviews) ? reviews : []).some((r) => {
    if (!r || r.tripId !== tripId) return false;
    if (userNorm && !matchesReviewAuthor(r.userId, userNorm)) return false;
    if (targetNorm && r.targetType && String(r.targetType).trim().toLowerCase() !== targetNorm) {
      return false;
    }
    return true;
  });
}

/**
 * Returns completed trips that still have at least one unreviewed target for the active user.
 */
export function getEligibleTripsForReview(trips = [], reviews = [], { targetType = null, userId = null } = {}) {
  const completed = (Array.isArray(trips) ? trips : []).filter(
    (t) => (t?.status || '').toLowerCase() === 'completed' || (t?.trackingStatus || '').toLowerCase() === 'completed',
  );
  if (targetType) {
    return completed.filter((t) => !hasReviewedTripTarget(reviews, { tripId: t.id, targetType, userId }));
  }
  return completed.filter((t) =>
    VALID_TARGET_TYPES.some((type) => !hasReviewedTripTarget(reviews, { tripId: t.id, targetType: type, userId })),
  );
}
