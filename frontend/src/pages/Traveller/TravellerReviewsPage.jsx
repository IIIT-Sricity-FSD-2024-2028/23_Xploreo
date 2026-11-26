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
 * - Overall Rating Summary and Rating Distribution (5★ to 1★)
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

  // Overall rating summary calculations
  const totalCount = reviews.length;
  const avgRating = totalCount > 0
    ? (reviews.reduce((acc, r) => acc + Number(r.rating || 0), 0) / totalCount).toFixed(1)
    : '0.0';

  const ratingCounts = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    if (Array.isArray(reviews)) {
      reviews.forEach((r) => {
        const star = Math.round(Number(r.rating || 0));
        if (counts[star] !== undefined) {
          counts[star]++;
        }
      });
    }
    return counts;
  }, [reviews]);

  const recommendedPct = totalCount > 0
    ? Math.round(((ratingCounts[5] + ratingCounts[4]) / totalCount) * 100)
    : 100;

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

        {/* Overall Rating Summary & Rating Distribution */}
        {!isLoading && !error && totalCount > 0 && (
          <section className="trav-review-summary-card" aria-label="Rating Overview">
            {/* Col 1: Average Score & Overall Stars */}
            <div className="trav-summary-score-col">
              <span className="trav-summary-score-label">Overall Rating</span>
              <div className="trav-summary-score-row">
                <span className="trav-summary-score-num">{avgRating}</span>
                <span className="trav-summary-score-max">/ 5.0</span>
              </div>
              <div
                className="trav-summary-stars-row"
                aria-label={`Average rating ${avgRating} out of 5 stars`}
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`trav-star-icon ${
                      star <= Math.round(Number(avgRating)) ? 'trav-star-filled' : 'trav-star-empty'
                    }`}
                    aria-hidden="true"
                  >
                    ★
                  </span>
                ))}
              </div>
              <p className="trav-summary-review-count">
                Based on <strong>{totalCount}</strong> verified {totalCount === 1 ? 'review' : 'reviews'}
              </p>
              <div className="trav-summary-rec-badge">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>{recommendedPct}% Positive Feedback</span>
              </div>
            </div>

            {/* Col 2: Rating Distribution Bars (5★ to 1★) */}
            <div className="trav-summary-bars-col">
              <h3 className="trav-summary-bars-title">Rating Distribution</h3>
              <div className="trav-dist-list">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = ratingCounts[stars] || 0;
                  const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
                  return (
                    <div key={stars} className="trav-dist-row">
                      <span className="trav-dist-label">{stars}★</span>
                      <div className="trav-dist-bar-track">
                        <div
                          className="trav-dist-bar-fill"
                          style={{ width: `${pct}%` }}
                          aria-valuenow={pct}
                          aria-valuemin="0"
                          aria-valuemax="100"
                        />
                      </div>
                      <span className="trav-dist-count">{count} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Col 3: Community Reassurance & Action */}
            <div className="trav-summary-cta-col">
              <div className="trav-cta-badge">Verified Community</div>
              <h3 className="trav-cta-title">Share Your Journey</h3>
              <p className="trav-cta-desc">
                Your feedback helps fellow travellers discover verified local guides, boutique stays, and authentic experiences.
              </p>
              <button
                type="button"
                className="trav-review-btn trav-review-btn-primary"
                onClick={handleOpenModal}
              >
                ✏️ Write a Review
              </button>
            </div>
          </section>
        )}

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
