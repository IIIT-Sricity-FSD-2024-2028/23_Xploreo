import { useState, useEffect, useCallback } from 'react';
import TravellerReviewsList from './TravellerReviewsList.jsx';
import ReviewSubmissionForm from './ReviewSubmissionForm.jsx';
import { apiRequest } from '../../services/api.js';
import './travellerReviews.css';

/**
 * TravellerReviewsPage
 * Top-level container component for Traveller Reviews:
 * - Header with "Write a Review" trigger
 * - Review list with filtering and state handling
 * - Modal dialog for writing reviews
 * - Manages submission flow, duplicate prevention, and API error surfacing
 * - Connects to GET /api/reviews and POST /api/reviews in live mode
 * - Preserves preview mode when useFixtures is true or when fixtures are injected
 */
export default function TravellerReviewsPage({
  reviews: initialReviews = [],
  isLoading: initialLoading = false,
  error: initialError = null,
  onRetry,
  onSubmitReview,
  currentTravellerId = null,
  defaultTargetType = 'guide',
  defaultTargetId = '',
  useFixtures = false,
}) {
  const isPreviewMode = useFixtures || (initialReviews && initialReviews.length > 0);
  const isControlled = initialLoading || !!initialError;
  const shouldAutoFetch = !isPreviewMode && !isControlled;

  const [liveReviews, setLiveReviews] = useState([]);
  const [liveLoading, setLiveLoading] = useState(shouldAutoFetch);
  const [liveError, setLiveError] = useState(null);

  const reviews = isPreviewMode || isControlled ? initialReviews : liveReviews;
  const isLoading = isControlled ? initialLoading : (isPreviewMode ? false : liveLoading);
  const error = isControlled ? initialError : (isPreviewMode ? null : liveError);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState(null);

  const fetchLiveReviews = useCallback(async () => {
    setLiveLoading(true);
    setLiveError(null);
    try {
      const data = await apiRequest('/reviews');
      const list = Array.isArray(data) ? data : data?.data || [];
      setLiveReviews(list);
    } catch (err) {
      setLiveError(err?.message || 'Failed to load reviews from server.');
      setLiveReviews([]);
    } finally {
      setLiveLoading(false);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;
    const load = async () => {
      await Promise.resolve();
      if (!isCancelled && shouldAutoFetch) {
        await fetchLiveReviews();
      }
    };
    load();
    return () => {
      isCancelled = true;
    };
  }, [shouldAutoFetch, fetchLiveReviews]);

  const handleOpenModal = () => {
    setSubmitError(null);
    setSubmitSuccessMsg(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (!isSubmitting) {
      setIsModalOpen(false);
      setSubmitError(null);
    }
  };

  const handleFormSubmit = async (formData) => {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      if (onSubmitReview) {
        await onSubmitReview(formData);
      } else if (formData.isDemo || isPreviewMode) {
        // Explicit Demo Mode / Mock Review Submission
        const newDemoReview = {
          id: `demo-rev-${Date.now()}`,
          userId: formData.userId,
          targetType: formData.targetType,
          targetId: formData.targetId,
          rating: formData.rating,
          comment: formData.comment,
          createdAt: new Date().toISOString(),
          isDemo: true,
          source: 'mock',
        };
        setLiveReviews((prev) => [newDemoReview, ...prev]);
        setSubmitSuccessMsg(
          'Review submitted in Demo Mode! (Backend contract blocker: live POST requires integer IDs).'
        );
      } else {
        await apiRequest('/reviews', {
          method: 'POST',
          body: formData,
        });
        await fetchLiveReviews();
        setSubmitSuccessMsg('Thank you! Your review has been submitted successfully.');
      }
      setIsSubmitting(false);
      // Close modal shortly after success message
      setTimeout(() => {
        setIsModalOpen(false);
        setSubmitSuccessMsg(null);
      }, 1500);
    } catch (err) {
      setIsSubmitting(false);
      setSubmitError(
        err?.message || 'Failed to submit your review. Please try again.'
      );
    }
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else if (!isPreviewMode) {
      fetchLiveReviews();
    }
  };

  return (
    <div className="trav-review-page" data-testid="traveller-reviews-page">
      {/* Page Header */}
      <header className="trav-review-header">
        <div>
          <h1 className="trav-review-title">Traveller Reviews & Feedback</h1>
          <p className="trav-review-subtitle">
            Browse verified feedback on guides, hotels, and experiences or share your own journey.
          </p>
        </div>

        <button
          type="button"
          className="trav-review-btn trav-review-btn-primary"
          onClick={handleOpenModal}
          data-testid="write-review-open-button"
        >
          ✏️ Write a Review
        </button>
      </header>

      {/* Main Reviews Content */}
      <TravellerReviewsList
        reviews={reviews}
        isLoading={isLoading}
        error={error}
        onRetry={handleRetry}
        currentTravellerId={currentTravellerId}
        onOpenCreateModal={handleOpenModal}
      />

      {/* Review Submission Modal Dialog */}
      {isModalOpen && (
        <div
          className="trav-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-modal-title"
          data-testid="review-submission-modal"
        >
          <div className="trav-modal-dialog">
            <div className="trav-modal-header">
              <h2 id="review-modal-title" className="trav-modal-title">
                Share Your Experience
              </h2>
              <button
                type="button"
                className="trav-modal-close-btn"
                onClick={handleCloseModal}
                disabled={isSubmitting}
                aria-label="Close review dialog"
              >
                &times;
              </button>
            </div>

            {submitSuccessMsg ? (
              <div
                className="trav-form-alert trav-form-alert-success"
                role="status"
                data-testid="review-success-alert"
              >
                {submitSuccessMsg}
              </div>
            ) : (
              <ReviewSubmissionForm
                onSubmit={handleFormSubmit}
                onCancel={handleCloseModal}
                isSubmitting={isSubmitting}
                apiError={submitError}
                currentUserId={currentTravellerId}
                defaultTargetType={defaultTargetType}
                defaultTargetId={defaultTargetId}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
