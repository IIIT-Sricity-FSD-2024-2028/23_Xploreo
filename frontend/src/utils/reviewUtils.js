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
  const userIdNum = Number(data.userId);
  if (!data.userId || Number.isNaN(userIdNum) || !Number.isInteger(userIdNum) || userIdNum <= 0) {
    errors.userId = 'Valid traveller/user ID is required';
  }

  // targetType check
  if (!data.targetType || !VALID_TARGET_TYPES.includes(data.targetType)) {
    errors.targetType = `Target type must be one of: ${VALID_TARGET_TYPES.join(', ')}`;
  }

  // targetId check
  const targetIdNum = Number(data.targetId);
  if (!data.targetId || Number.isNaN(targetIdNum) || !Number.isInteger(targetIdNum) || targetIdNum <= 0) {
    errors.targetId = 'Target ID must be a valid positive integer';
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
