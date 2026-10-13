import { useState } from 'react';
import {
  validateReviewForm,
  REVIEW_TARGET_TYPES,
  VALID_TARGET_TYPES,
} from '../../utils/reviewUtils.js';

/**
 * ReviewSubmissionForm
 * Submits review conforming strictly to backend CreateReviewDto:
 * - userId: number
 * - targetType: 'guide' | 'hotel' | 'experience'
 * - targetId: number
 * - rating: number (1-5)
 * - comment: string
 * 
 * Features:
 * - Interactive accessible star rating picker
 * - Form validation with per-field errors
 * - Disables submission while pending (prevents duplicates)
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
  initialMode = 'live',
}) {
  const isAlphanumericUser = Boolean(currentUserId && isNaN(Number(currentUserId)));

  const [submissionMode, setSubmissionMode] = useState(
    initialMode === 'demo' || isAlphanumericUser ? 'demo' : 'live'
  );

  const [formData, setFormData] = useState({
    userId: currentUserId || '',
    targetType: defaultTargetType,
    targetId: defaultTargetId || '',
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
      if (submissionMode === 'demo') {
        const errors = {};
        if (!updated.userId || String(updated.userId).trim() === '') {
          errors.userId = 'Valid traveller/user ID is required';
        }
        if (!updated.targetId || String(updated.targetId).trim() === '') {
          errors.targetId = 'Target ID is required';
        }
        if (!updated.comment || updated.comment.trim().length < 3) {
          errors.comment = 'Comment must be at least 3 characters long';
        }
        setFieldErrors(errors);
      } else {
        const validation = validateReviewForm(updated);
        setFieldErrors(validation.errors);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);

    if (submissionMode === 'demo') {
      const errors = {};
      if (!formData.userId || String(formData.userId).trim() === '') {
        errors.userId = 'Valid traveller/user ID is required';
      }
      if (!formData.targetId || String(formData.targetId).trim() === '') {
        errors.targetId = 'Target ID is required';
      }
      if (!formData.rating || formData.rating < 1 || formData.rating > 5) {
        errors.rating = 'Rating must be between 1 and 5';
      }
      if (!formData.comment || formData.comment.trim().length < 3) {
        errors.comment = 'Comment must be at least 3 characters long';
      }

      setFieldErrors(errors);
      if (Object.keys(errors).length > 0) return;

      if (onSubmit && !isSubmitting) {
        await onSubmit({
          userId: String(formData.userId),
          targetType: formData.targetType,
          targetId: String(formData.targetId),
          rating: Number(formData.rating),
          comment: formData.comment.trim(),
          isDemo: true,
        });
      }
      return;
    }

    // Live mode validation
    const validation = validateReviewForm(formData);
    setFieldErrors(validation.errors);

    if (!validation.isValid) {
      return;
    }

    if (onSubmit && !isSubmitting) {
      await onSubmit({
        userId: Number(formData.userId),
        targetType: formData.targetType,
        targetId: Number(formData.targetId),
        rating: Number(formData.rating),
        comment: formData.comment.trim(),
        isDemo: false,
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
      {/* Mode Selector & Blocker Documentation */}
      <div
        className="trav-review-mode-strip"
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '0.75rem',
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.88rem',
        }}
      >
        <span>
          <strong>Submission Mode:</strong>{' '}
          {submissionMode === 'demo' ? (
            <span style={{ color: '#d97706', fontWeight: 600 }}>Demo / Preview Mode</span>
          ) : (
            <span style={{ color: '#16a34a', fontWeight: 600 }}>Live Backend Mode</span>
          )}
        </span>
        <button
          type="button"
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            padding: '0.3rem 0.6rem',
            fontSize: '0.8rem',
            cursor: 'pointer',
            fontWeight: 500,
          }}
          onClick={() => {
            setSubmissionMode(submissionMode === 'demo' ? 'live' : 'demo');
            setFieldErrors({});
          }}
        >
          Switch to {submissionMode === 'demo' ? 'Live Mode' : 'Demo Mode'}
        </button>
      </div>

      {submissionMode === 'demo' ? (
        <div
          className="trav-form-alert"
          style={{
            background: 'rgba(217, 119, 6, 0.1)',
            border: '1px solid rgba(217, 119, 6, 0.3)',
            borderRadius: '8px',
            padding: '0.65rem 0.9rem',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            color: '#92400e',
          }}
          data-testid="review-demo-notice"
        >
          <strong>ℹ️ Demo Review Notice:</strong> Backend <code>CreateReviewDto</code> strictly requires integer IDs (<code>@IsInt()</code>). In Demo Mode, string IDs (e.g. <code>T001</code>) are accepted without silent coercion and simulated locally.
        </div>
      ) : isAlphanumericUser ? (
        <div
          className="trav-form-alert"
          style={{
            background: 'rgba(220, 38, 38, 0.1)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            borderRadius: '8px',
            padding: '0.65rem 0.9rem',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            color: '#b91c1c',
          }}
          data-testid="review-contract-blocker-notice"
        >
          <strong>⚠️ Backend Contract Blocker:</strong> Live backend requires positive integer IDs, but active user ID is &quot;{currentUserId}&quot;. Switch to Demo Mode above to submit without violating backend contracts.
        </div>
      ) : null}

      {apiError && (
        <div
          className="trav-form-alert trav-form-alert-error"
          role="alert"
          data-testid="review-form-api-error"
        >
          {apiError}
        </div>
      )}

      {/* Traveller / User ID (if not injected via auth prop) */}
      {!currentUserId && (
        <div className="trav-form-group">
          <label htmlFor="review-user-id" className="trav-form-label">
            Traveller ID <span aria-hidden="true">*</span>
          </label>
          <input
            id="review-user-id"
            type={submissionMode === 'demo' ? 'text' : 'number'}
            className={`trav-form-input ${fieldErrors.userId ? 'has-error' : ''}`}
            placeholder={submissionMode === 'demo' ? 'e.g. T001 or 20001' : 'e.g. 20001'}
            value={formData.userId}
            onChange={(e) => handleFieldChange('userId', e.target.value)}
            disabled={isSubmitting}
            required
            aria-describedby={fieldErrors.userId ? 'err-user-id' : undefined}
          />
          {fieldErrors.userId && (
            <p id="err-user-id" className="trav-form-error-msg" role="alert">
              {fieldErrors.userId}
            </p>
          )}
        </div>
      )}

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
          type={submissionMode === 'demo' ? 'text' : 'number'}
          className={`trav-form-input ${fieldErrors.targetId ? 'has-error' : ''}`}
          placeholder={submissionMode === 'demo' ? 'e.g. exp-1, hotel-1, or 10001' : 'e.g. 10001'}
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
          disabled={isSubmitting}
          data-testid="submit-review-button"
        >
          {isSubmitting ? 'Submitting Review...' : 'Submit Review'}
        </button>
      </div>
    </form>
  );
}
