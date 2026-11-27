import { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  validateReviewForm,
  REVIEW_TARGET_TYPES,
  VALID_TARGET_TYPES,
} from '../../utils/reviewUtils.js';
import { selectAuthUser } from '../../features/authSlice.js';

/**
 * ReviewSubmissionForm
 * Submits review conforming strictly to backend CreateReviewDto:
 * - userId: string (strictly derived from authenticated session)
 * - targetType: 'guide' | 'hotel' | 'experience'
 * - targetId: string
 * - rating: number (1-5)
 * - comment: string
 * - tripId: string (required completed trip)
 *
 * Features:
 * - Interactive accessible star rating picker
 * - Form validation with per-field errors
 * - Disables submission while pending (prevents duplicates)
 * - Derives submitting user from authenticated session (prevents impersonation)
 * - Displays clear validation error if user ID cannot be resolved from session
 * - Preserves user input if submission fails
 * - Accessible ARIA attributes
 */
export default function ReviewSubmissionForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
  apiError = null,
  currentUserId = null,
  defaultTargetType = REVIEW_TARGET_TYPES.GUIDE,
  defaultTargetId = '',
  completedTrips = [],
  selectedTripId = '',
}) {
  const authUser = useSelector(selectAuthUser);
  const rawUserId = currentUserId ?? (authUser && authUser.role !== 'default' ? (authUser.userId ?? authUser.id) : null);
  const authenticatedUserId = rawUserId !== null && rawUserId !== undefined ? String(rawUserId).trim() : '';
  const hasValidUserId = authenticatedUserId.length > 0;

  const userIdError = !hasValidUserId
    ? 'Authenticated traveller session required. Please log in to submit a review.'
    : null;

  const initialTrip = completedTrips.find((t) => t.id === selectedTripId) || completedTrips[0];
  const initialTripId = initialTrip?.id || selectedTripId || '';

  const [formData, setFormData] = useState({
    tripId: initialTripId,
    targetType: defaultTargetType,
    targetId: defaultTargetId || (initialTrip?.guideId ? String(initialTrip.guideId) : ''),
    rating: 5,
    comment: '',
  });

  const [hoverRating, setHoverRating] = useState(0);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const handleFieldChange = (field, value) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);

    if (submitAttempted) {
      const validation = validateReviewForm({
        ...updated,
        userId: hasValidUserId ? authenticatedUserId : undefined,
        targetId: updated.targetId,
      });
      const errors = { ...validation.errors };
      if (!hasValidUserId) {
        errors.userId = userIdError;
      }
      setFieldErrors(errors);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);

    if (!hasValidUserId) {
      setFieldErrors((prev) => ({
        ...prev,
        userId: userIdError,
      }));
      return;
    }

    if (completedTrips.length === 0) {
      setFieldErrors((prev) => ({
        ...prev,
        tripId: 'Reviews can only be submitted for completed trips.',
      }));
      return;
    }

    if (!formData.tripId) {
      setFieldErrors((prev) => ({
        ...prev,
        tripId: 'Please select an eligible completed trip',
      }));
      return;
    }

    const validation = validateReviewForm({
      ...formData,
      userId: authenticatedUserId,
      targetId: formData.targetId,
    });

    const combinedErrors = { ...validation.errors };
    if (!hasValidUserId) {
      combinedErrors.userId = userIdError;
    }
    setFieldErrors(combinedErrors);

    if (!validation.isValid || !hasValidUserId) {
      return;
    }

    if (onSubmit && !isSubmitting) {
      await onSubmit({
        userId: authenticatedUserId,
        targetType: formData.targetType,
        targetId: String(formData.targetId).trim(),
        tripId: formData.tripId,
        rating: Number(formData.rating),
        comment: formData.comment.trim(),
      });
    }
  };

  const activeRating = hoverRating || formData.rating;

  return (
    <form
      className="trav-review-form"
      onSubmit={handleSubmit}
      noValidate
      data-testid="review-submission-form"
    >
      {apiError && (
        <div
          className="trav-form-alert trav-form-alert-error"
          role="alert"
          data-testid="review-form-api-error"
        >
          {apiError}
        </div>
      )}

      {/* Authenticated Identity Attribution (prevents user impersonation) */}
      <div className="trav-form-group">
        <label className="trav-form-label">
          Submitting as Traveller
        </label>
        <div
          className="trav-authenticated-identity"
          style={{
            fontSize: '0.88rem',
            color: hasValidUserId ? '#334155' : '#b91c1c',
            padding: '0.55rem 0.75rem',
            background: hasValidUserId ? '#f8fafc' : '#fef2f2',
            border: `1px solid ${hasValidUserId ? '#e2e8f0' : '#fecaca'}`,
            borderRadius: '6px',
            fontWeight: 500,
          }}
          data-testid="authenticated-traveller-display"
        >
          {hasValidUserId ? (
            <span>
              Traveller: <strong>{authUser?.name || authUser?.username || authenticatedUserId}</strong> ({authenticatedUserId})
            </span>
          ) : (
            <span>
              ⚠️ Not authenticated as a traveller
            </span>
          )}
        </div>
        {(!hasValidUserId || fieldErrors.userId) && (
          <p className="trav-form-error-msg" role="alert" data-testid="err-user-id">
            {fieldErrors.userId || userIdError}
          </p>
        )}
      </div>

      {/* Completed Journey Selector */}
      <div className="trav-form-group">
        <label htmlFor="review-trip-id" className="trav-form-label">
          Completed Journey <span aria-hidden="true">*</span>
        </label>
        {completedTrips.length > 0 ? (
          <select
            id="review-trip-id"
            className={`trav-form-select ${fieldErrors.tripId ? 'has-error' : ''}`}
            value={formData.tripId}
            onChange={(e) => {
              const tid = e.target.value;
              const matched = completedTrips.find((t) => t.id === tid);
              handleFieldChange('tripId', tid);
              if (matched?.guideId) {
                handleFieldChange('targetId', String(matched.guideId));
              }
            }}
            disabled={isSubmitting}
            required
            aria-describedby={fieldErrors.tripId ? 'err-trip-id' : undefined}
          >
            {completedTrips.map((t) => {
              const label = t.title || t.itinerary?.day1?.hotel?.name || `Trip #${t.id}`;
              const dest = t.currentLocation ? ` · ${t.currentLocation}` : '';
              return (
                <option key={t.id} value={t.id}>
                  {label}{dest} ({t.status || 'completed'})
                </option>
              );
            })}
          </select>
        ) : (
          <div
            className="trav-form-alert"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '0.65rem 0.9rem',
              fontSize: '0.85rem',
              color: '#b91c1c',
            }}
            data-testid="no-completed-trips-alert"
          >
            Reviews can only be submitted for completed trips. You have no eligible completed trips at this time.
          </div>
        )}
        {fieldErrors.tripId && (
          <p id="err-trip-id" className="trav-form-error-msg" role="alert">
            {fieldErrors.tripId}
          </p>
        )}
      </div>

      {/* Target Type & Target ID */}
      <div className="trav-form-group">
        <label htmlFor="review-target-type" className="trav-form-label">
          Review Category <span aria-hidden="true">*</span>
        </label>
        <select
          id="review-target-type"
          className={`trav-form-select ${fieldErrors.targetType ? 'has-error' : ''}`}
          value={formData.targetType}
          onChange={(e) => handleFieldChange('targetType', e.target.value)}
          disabled={isSubmitting}
        >
          {VALID_TARGET_TYPES.map((type) => (
            <option key={type} value={type}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </option>
          ))}
        </select>
        {fieldErrors.targetType && (
          <p className="trav-form-error-msg" role="alert">
            {fieldErrors.targetType}
          </p>
        )}
      </div>

      <div className="trav-form-group">
        <label htmlFor="review-target-id" className="trav-form-label">
          Target ID <span aria-hidden="true">*</span>
        </label>
        <input
          id="review-target-id"
          type="text"
          className={`trav-form-input ${fieldErrors.targetId ? 'has-error' : ''}`}
          placeholder="e.g. 10001 or hotel-goa-001"
          value={formData.targetId}
          onChange={(e) => handleFieldChange('targetId', e.target.value)}
          disabled={isSubmitting}
          required
          aria-describedby={fieldErrors.targetId ? 'err-target-id' : undefined}
        />
        {fieldErrors.targetId && (
          <p id="err-target-id" className="trav-form-error-msg" role="alert">
            {fieldErrors.targetId}
          </p>
        )}
      </div>

      {/* Rating Star Picker */}
      <div className="trav-form-group">
        <label className="trav-form-label" id="rating-label">
          Rating (1 to 5 Stars) <span aria-hidden="true">*</span>
        </label>
        <div
          className="trav-star-picker"
          role="radiogroup"
          aria-labelledby="rating-label"
          data-testid="star-rating-picker"
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={formData.rating === star}
              aria-label={`${star} Star${star > 1 ? 's' : ''}`}
              className={`trav-star-picker-btn ${star <= activeRating ? 'is-active' : ''}`}
              onClick={() => handleFieldChange('rating', star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              disabled={isSubmitting}
              data-testid={`star-rate-${star}`}
            >
              ★
            </button>
          ))}
          <span className="trav-review-rating-text" style={{ fontSize: '0.875rem', color: '#64748b', marginLeft: '0.5rem' }}>
            {formData.rating} / 5 Stars
          </span>
        </div>
        {fieldErrors.rating && (
          <p className="trav-form-error-msg" role="alert">
            {fieldErrors.rating}
          </p>
        )}
      </div>

      {/* Review Comment */}
      <div className="trav-form-group">
        <label htmlFor="review-comment" className="trav-form-label">
          Your Review & Feedback <span aria-hidden="true">*</span>
        </label>
        <textarea
          id="review-comment"
          rows={4}
          className={`trav-form-textarea ${fieldErrors.comment ? 'has-error' : ''}`}
          placeholder="Share your experience (guide attentiveness, accommodation quality, punctuality)..."
          value={formData.comment}
          onChange={(e) => handleFieldChange('comment', e.target.value)}
          disabled={isSubmitting}
          required
          aria-describedby={fieldErrors.comment ? 'err-comment' : undefined}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
          <span>Minimum 3 characters</span>
          <span>{formData.comment.length} / 1000</span>
        </div>
        {fieldErrors.comment && (
          <p id="err-comment" className="trav-form-error-msg" role="alert">
            {fieldErrors.comment}
          </p>
        )}
      </div>

      {/* Form Action Buttons */}
      <div className="trav-form-actions">
        {onCancel && (
          <button
            type="button"
            className="trav-review-btn trav-review-btn-secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="trav-review-btn trav-review-btn-primary"
          disabled={isSubmitting || completedTrips.length === 0 || !hasValidUserId}
          data-testid="submit-review-button"
        >
          {!hasValidUserId
            ? 'Authenticated Session Required'
            : completedTrips.length === 0
            ? 'Completed Trip Required'
            : isSubmitting
            ? 'Submitting Review...'
            : 'Submit Review'}
        </button>
      </div>
    </form>
  );
}
