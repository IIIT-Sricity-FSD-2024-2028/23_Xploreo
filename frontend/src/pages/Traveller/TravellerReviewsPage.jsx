import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useInRouterContext, useLocation } from 'react-router-dom';
import Navbar from '../../components/Navbar/navbar.jsx';
import TravellerReviewsList from './TravellerReviewsList.jsx';
import ReviewSubmissionForm from './ReviewSubmissionForm.jsx';
import { selectAuthUser } from '../../features/authSlice.js';
import {
  addDemoReview,
  clearReviewSubmitState,
  fetchReviews,
  selectReviewsError,
  selectReviewsList,
  selectReviewsLoading,
  selectReviewSubmitError,
  selectReviewSubmitting,
  submitReview,
} from '../../features/reviewsSlice.js';
import { fetchTravellerTrips, selectTripsList } from '../../features/tripsSlice.js';
import './travellerReviews.css';

/**
 * TravellerReviewsPage
 * Top-level container component for Traveller Reviews:
 * - Shared Traveller navbar and consistent application layout
 * - Page Header with "Reviews & Ratings" title and "Write a Review" trigger
 * - Review list with category filtering, ratings filter, and states (loading, empty, error)
 * - Modal dialog for writing reviews with validation and demo transparency
 * - Connects to reviewsSlice (GET/POST /reviews) and tripsSlice in live mode
 * - Restricts review submission exclusively to completed trips
 */
function TravellerReviewsCore({
  user,
  showNavbar = true,
  reviews: initialReviews = [],
  isLoading: initialLoading = false,
  error: initialError = null,
  onRetry,
  onSubmitReview,
  currentTravellerId = null,
  defaultTargetType = 'guide',
  defaultTargetId = '',
  useFixtures = false,
  location = null,
  inRouter = false,
}) {
  const dispatch = useDispatch();
  const authUser = useSelector(selectAuthUser);
  const liveReviews = useSelector(selectReviewsList);
  const liveLoading = useSelector(selectReviewsLoading);
  const liveError = useSelector(selectReviewsError);
  const reduxSubmitting = useSelector(selectReviewSubmitting);
  const reduxSubmitError = useSelector(selectReviewSubmitError);
  const travellerTrips = useSelector(selectTripsList);

  const activeAuthUser = authUser && authUser.role !== 'default' ? authUser : null;
  const effectiveUser = user || activeAuthUser || {
    name: 'Anjali Sharma',
    username: 'Anjali Sharma',
    role: 'traveller',
    userId: currentTravellerId || 'T001',
  };

  const isPreviewMode = useFixtures || (initialReviews && initialReviews.length > 0);
  const isControlled = initialLoading || !!initialError;
  const shouldAutoFetch = !isPreviewMode && !isControlled;

  const [previewDemoReviews, setPreviewDemoReviews] = useState([]);
  const reviews = useMemo(() => {
    if (isPreviewMode) {
      return [...previewDemoReviews, ...(initialReviews || [])];
    }
    return isControlled ? initialReviews : liveReviews;
  }, [isPreviewMode, isControlled, previewDemoReviews, initialReviews, liveReviews]);

  const isLoading = isControlled ? initialLoading : (isPreviewMode ? false : liveLoading);
  const error = isControlled ? initialError : (isPreviewMode ? null : liveError);

  const locationSearch = location?.search || '';
  const queryTripId = useMemo(() => {
    if (!locationSearch) return null;
    return new URLSearchParams(locationSearch).get('tripId');
  }, [locationSearch]);

  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [dismissedQueryTripId, setDismissedQueryTripId] = useState(null);
  const isModalOpen = manualModalOpen || (Boolean(queryTripId) && dismissedQueryTripId !== queryTripId);

  const [localSubmitting, setLocalSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState(null);

  const isSubmitting = onSubmitReview ? localSubmitting : reduxSubmitting;
  const submitError = localError || (onSubmitReview ? null : reduxSubmitError);

  useEffect(() => {
    return () => {
      dispatch(clearReviewSubmitState());
    };
  }, [dispatch]);

  useEffect(() => {
    if (isPreviewMode) return;
    const tId = effectiveUser?.userId || '20001';
    dispatch(fetchTravellerTrips(tId));
  }, [isPreviewMode, effectiveUser?.userId, dispatch]);

  // Trips whose persisted status is completed
  const completedTrips = useMemo(() => {
    return (travellerTrips || []).filter(
      (t) => (t.status || '').toLowerCase() === 'completed' || (t.trackingStatus || '').toLowerCase() === 'completed'
    );
  }, [travellerTrips]);

  const reviewedTripIds = useMemo(() => {
    return new Set((reviews || []).map((r) => r.tripId).filter(Boolean));
  }, [reviews]);

  const eligibleTrips = useMemo(() => {
    return completedTrips.filter((t) => !reviewedTripIds.has(t.id));
  }, [completedTrips, reviewedTripIds]);

  const fetchLiveReviews = useCallback(() => {
    return dispatch(fetchReviews());
  }, [dispatch]);

  useEffect(() => {
    if (shouldAutoFetch) {
      fetchLiveReviews();
    }
  }, [shouldAutoFetch, fetchLiveReviews]);

  const closeReviewModal = useCallback(() => {
    setManualModalOpen(false);
    if (queryTripId) {
      setDismissedQueryTripId(queryTripId);
    }
  }, [queryTripId]);

  const handleOpenModal = () => {
    setLocalError(null);
    setSubmitSuccessMsg(null);
    dispatch(clearReviewSubmitState());
    setManualModalOpen(true);
  };

  const handleCloseModal = () => {
    if (!isSubmitting) {
      closeReviewModal();
      setLocalError(null);
      dispatch(clearReviewSubmitState());
    }
  };

  const handleFormSubmit = async (formData) => {
    setLocalError(null);
    dispatch(clearReviewSubmitState());

    try {
      const targetTripId = formData.tripId || queryTripId || eligibleTrips[0]?.id;
      if (!targetTripId && !isPreviewMode) {
        throw new Error('Reviews can only be submitted for completed trips. No eligible trip found.');
      }
      if (!isPreviewMode) {
        const isCompleted = completedTrips.some((t) => t.id === targetTripId);
        if (!isCompleted) {
          throw new Error('Selected trip is not completed. Reviews can only be submitted for completed trips.');
        }
        if (reviewedTripIds.has(targetTripId)) {
          throw new Error('A review has already been submitted for this trip.');
        }
      }

      if (onSubmitReview) {
        setLocalSubmitting(true);
        await onSubmitReview({ ...formData, tripId: targetTripId });
        setLocalSubmitting(false);
      } else if (formData.isDemo || isPreviewMode) {
        // Explicit Demo Mode / Mock Review Submission
        const newDemoReview = {
          id: `demo-rev-${Date.now()}`,
          userId: formData.userId,
          targetType: formData.targetType,
          targetId: formData.targetId,
          tripId: targetTripId,
          rating: formData.rating,
          comment: formData.comment,
          createdAt: new Date().toISOString(),
          isDemo: true,
          source: 'mock',
        };
        if (isPreviewMode) {
          setPreviewDemoReviews((prev) => [newDemoReview, ...prev]);
        } else {
          dispatch(addDemoReview(newDemoReview));
        }
        setSubmitSuccessMsg('Review submitted in Demo Mode!');
      } else {
        const activeUserId = String(formData.userId || effectiveUser?.userId || '').trim();

        await dispatch(
          submitReview({
            userId: activeUserId,
            targetType: formData.targetType,
            targetId: String(formData.targetId).trim(),
            tripId: targetTripId,
            rating: Number(formData.rating),
            comment: formData.comment.trim(),
          }),
        ).unwrap();

        await dispatch(fetchReviews());
        setSubmitSuccessMsg('Thank you! Your review has been submitted successfully.');
      }
      // Close modal shortly after success message
      setTimeout(() => {
        closeReviewModal();
        setSubmitSuccessMsg(null);
        dispatch(clearReviewSubmitState());
      }, 1500);
    } catch (err) {
      if (onSubmitReview) {
        setLocalSubmitting(false);
      }
      if (!onSubmitReview && !reduxSubmitError && err?.message) {
        setLocalError(err.message || 'Failed to submit your review. Please try again.');
      } else if (onSubmitReview) {
        setLocalError(err?.message || 'Failed to submit your review. Please try again.');
      }
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
    <div className="trav-reviews-page-wrapper">
      {/* Shared Traveller Navbar */}
      {showNavbar && inRouter && (
        <Navbar user={effectiveUser} />
      )}

      <main className="trav-review-page" data-testid="traveller-reviews-page">
        {/* Page Header */}
        <header className="trav-review-header">
          <div className="trav-review-header-text">
            <span className="trav-review-eyebrow">Traveller Reviews &amp; Feedback</span>
            <h1 className="trav-review-title">Reviews &amp; Ratings</h1>
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
                  completedTrips={eligibleTrips}
                  selectedTripId={queryTripId || eligibleTrips[0]?.id || ''}
                />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function TravellerReviewsWithRouter(props) {
  const location = useLocation();
  return <TravellerReviewsCore {...props} location={location} inRouter />;
}

export default function TravellerReviewsPage(props) {
  const inRouter = useInRouterContext();
  return inRouter ? (
    <TravellerReviewsWithRouter {...props} />
  ) : (
    <TravellerReviewsCore {...props} location={null} inRouter={false} />
  );
}
