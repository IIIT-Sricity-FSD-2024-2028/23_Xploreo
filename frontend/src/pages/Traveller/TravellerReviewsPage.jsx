import { useState } from 'react';
import TravellerReviewsList from './TravellerReviewsList.jsx';
import ReviewSubmissionForm from './ReviewSubmissionForm.jsx';
import './travellerReviews.css';

/**
 * TravellerReviewsPage
 * Top-level container component for Traveller Reviews:
 * - Header with "Write a Review" trigger
 * - Review list with filtering and state handling
 * - Modal dialog for writing reviews
 * - Manages submission flow, duplicate prevention, and API error surfacing
 * - Fully decoupled: takes reviews, onFetchReviews, onSubmitReview via props
 */
export default function TravellerReviewsPage({
  reviews = [],
  isLoading = false,
  error = null,
  onRetry,
  onSubmitReview,
  currentTravellerId = null,
  defaultTargetType = 'guide',
  defaultTargetId = '',
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState(null);

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
      }
      setSubmitSuccessMsg('Thank you! Your review has been submitted successfully.');
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
        onRetry={onRetry}
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
