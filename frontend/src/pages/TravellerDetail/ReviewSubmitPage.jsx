import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { selectAuthUser } from '@/features/authSlice.js';
import { getEligibleTripsForReview, hasReviewedTripTarget } from '@/utils/reviewUtils.js';
import {
  clearReviewSubmitState,
  fetchBrowseItemDetail,
  fetchReviews,
  fetchTravellerTrips,
  selectBrowseDetail,
  selectLastSubmittedReview,
  selectReviewsList,
  selectReviewsLoading,
  selectReviewSubmitError,
  selectReviewSubmitting,
  selectTripsList,
  selectTripsLoading,
  submitReview,
} from '@/store/traveller/index.js';
import TravellerHeader from './TravellerHeader.jsx';
import './travellerDetail.css';

const RATING_LABELS = {
  1: 'Poor · 1.0',
  2: 'Fair · 2.0',
  3: 'Good · 3.0',
  4: 'Very Good · 4.0',
  5: 'Exceptional · 5.0',
};

export default function ReviewSubmitPage() {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const authUser = useSelector(selectAuthUser);
  const browseDetail = useSelector(selectBrowseDetail);
  const rawTrips = useSelector(selectTripsList);
  const tripsLoading = useSelector(selectTripsLoading);
  const rawReviews = useSelector(selectReviewsList);
  const reviewsLoading = useSelector(selectReviewsLoading);
  const submitting = useSelector(selectReviewSubmitting);
  const reduxSubmitError = useSelector(selectReviewSubmitError);
  const submittedReview = useSelector(selectLastSubmittedReview);

  const targetTypeParam = searchParams.get('targetType') || (searchParams.get('hotelId') ? 'hotel' : searchParams.get('experienceId') ? 'experience' : 'hotel');
  const targetIdParam = searchParams.get('targetId') || searchParams.get('hotelId') || searchParams.get('experienceId') || '';
  const targetNameParam = searchParams.get('targetName') || '';
  const paramTripId = searchParams.get('tripId') || '';

  const [targetType, setTargetType] = useState(targetTypeParam);
  const [targetId, setTargetId] = useState(targetIdParam);

  // Form fields
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [tripType, setTripType] = useState('Couple');

  // Temporary UI form validation & selection state
  const [fieldErrors, setFieldErrors] = useState({});
  const [validationError, setValidationError] = useState(null);
  const [manualSelectedTripId, setManualSelectedTripId] = useState(paramTripId);

  useEffect(() => {
    dispatch(clearReviewSubmitState());
    return () => {
      dispatch(clearReviewSubmitState());
    };
  }, [dispatch]);

  const expectedDetailKey = targetId && (targetType === 'hotel' || targetType === 'experience')
    ? `${targetType}:${targetId}`
    : null;
  const hasMatchingDetail = Boolean(expectedDetailKey && browseDetail.key === expectedDetailKey);
  const loadingTarget = Boolean(expectedDetailKey && (!hasMatchingDetail || browseDetail.loading));
  const targetEntity = hasMatchingDetail ? browseDetail.item : null;
  const targetNotFound = Boolean(
    expectedDetailKey &&
    hasMatchingDetail &&
    !browseDetail.loading &&
    (browseDetail.error || !browseDetail.item)
  );

  // Fetch target preview via browseSlice if targetId is given
  useEffect(() => {
    if (!targetId || (targetType !== 'hotel' && targetType !== 'experience')) return;
    dispatch(fetchBrowseItemDetail({ type: targetType, id: targetId }));
  }, [dispatch, targetId, targetType]);

  // Load traveller's completed trips and reviews via Redux to validate eligibility
  useEffect(() => {
    const activeAuthUser = authUser && authUser.role !== 'default' ? authUser : null;
    const saved = activeAuthUser || {};
    const userId = saved?.userId || saved?.id || saved?.username;
    if (userId) {
      dispatch(fetchTravellerTrips(userId));
    }
    dispatch(fetchReviews());
  }, [dispatch, authUser]);

  const activeUserId = authUser && authUser.role !== 'default'
    ? (authUser.userId || authUser.id || authUser.username || null)
    : null;

  const { eligibleTrips, eligibilityError } = useMemo(() => {
    const completed = (rawTrips || []).filter(
      (t) => (t.status || '').toLowerCase() === 'completed' || (t.trackingStatus || '').toLowerCase() === 'completed'
    );
    const available = getEligibleTripsForReview(rawTrips, rawReviews, {
      targetType,
      userId: activeUserId,
    });

    let nextError = null;
    if (paramTripId && !tripsLoading && !reviewsLoading) {
      const match = completed.find((t) => t.id === paramTripId);
      if (!match) {
        nextError = `Trip #${paramTripId} is not a completed trip. Reviews can only be submitted for completed trips.`;
      } else if (hasReviewedTripTarget(rawReviews, { tripId: paramTripId, targetType, userId: activeUserId })) {
        nextError = `A ${targetType} review has already been submitted for Trip #${paramTripId}. Duplicate reviews are not allowed.`;
      }
    }

    return { eligibleTrips: available, eligibilityError: nextError };
  }, [rawTrips, rawReviews, paramTripId, targetType, activeUserId, tripsLoading, reviewsLoading]);

  const loadingTrips = tripsLoading || reviewsLoading;
  const selectedTripId = manualSelectedTripId || eligibleTrips[0]?.id || '';
  const submitError = validationError || reduxSubmitError || eligibilityError;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError(null);
    dispatch(clearReviewSubmitState());

    // 400 Validation rules
    const errors = {};
    if (!selectedTripId) {
      errors.tripId = 'An eligible completed trip is required to submit a verified review.';
    }
    if (!targetId || targetId.trim() === '') {
      errors.targetId = 'Please specify a target hotel or experience ID to review.';
    }
    if (!rating || rating < 1 || rating > 5) {
      errors.rating = 'Rating must be between 1 and 5 stars.';
    }
    if (!comment || comment.trim().length < 10) {
      errors.comment = 'Review comment must be at least 10 characters long.';
    }
    if (comment && comment.length > 1000) {
      errors.comment = 'Review comment cannot exceed 1000 characters.';
    }
    if (!authorName || authorName.trim().length < 2) {
      errors.authorName = 'Please enter your name (minimum 2 characters).';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setValidationError('Please address the form validation errors below.');
      return;
    }

    setFieldErrors({});

    try {
      const activeUserId = authUser && authUser.role !== 'default'
        ? (authUser.userId || authUser.id || authUser.username)
        : undefined;
      // Conforms strictly to CreateReviewDto: { userId?, rating, comment, authorName, targetType, targetId, tripId }
      const payload = {
        ...(activeUserId ? { userId: String(activeUserId) } : {}),
        rating: Number(rating),
        comment: comment.trim(),
        authorName: authorName.trim() || undefined,
        targetType,
        targetId: targetId.trim(),
        tripId: selectedTripId,
      };

      await dispatch(submitReview(payload)).unwrap();
    } catch (err) {
      if (err?.errors && typeof err.errors === 'object') {
        setFieldErrors(err.errors);
      }
    }
  };

  // 1. Loading State (Target pre-fetch)
  if (loadingTarget) {
    return (
      <div className="trav-page-container">
        <TravellerHeader title="Write Review" />
        <main className="trav-main">
          <div className="trav-loading-card">
            <div className="trav-spinner" />
            <h2 className="trav-loading-title">Loading Booking & Property Details...</h2>
            <p className="trav-loading-subtitle">Preparing your verified review submission form.</p>
          </div>
        </main>
      </div>
    );
  }

  // 2. Empty State (Property or Experience not found)
  if (targetIdParam && targetNotFound) {
    return (
      <div className="trav-page-container">
        <TravellerHeader title="Target Not Found" />
        <main className="trav-main">
          <div className="trav-empty-state">
            <span className="trav-empty-icon">🔍</span>
            <h2 className="trav-empty-title">Property or Experience Not Found</h2>
            <p className="trav-empty-desc">
              We could not find the {targetType === 'hotel' ? 'hotel' : 'experience'} matching ID "{targetIdParam}".
            </p>
            <Link to="/hotels" className="trav-btn trav-btn-primary">
              Browse Available Hotels
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // 3. General Error State
  if (submitError && (submitError.includes('Network') || submitError.includes('500'))) {
    return (
      <div className="trav-page-container">
        <TravellerHeader title="Submission Error" />
        <main className="trav-main">
          <div className="trav-error-state">
            <span className="trav-error-icon">⚠️</span>
            <h2 className="trav-error-title">Unable to Save Review</h2>
            <p className="trav-error-desc">{submitError}</p>
            <button
              type="button"
              onClick={() => {
                setValidationError(null);
                dispatch(clearReviewSubmitState());
              }}
              className="trav-btn trav-btn-primary"
            >
              Try Again
            </button>
          </div>
        </main>
      </div>
    );
  }

  // 5. 403 Forbidden State
  if (submitError && (submitError.includes('Forbidden') || submitError.includes('403'))) {
    return (
      <div className="trav-page-container">
        <TravellerHeader title="Review Submission Denied" />
        <main className="trav-main">
          <div className="trav-forbidden-card">
            <div className="trav-forbidden-code">403</div>
            <h2 className="trav-forbidden-title">Submission Not Authorized</h2>
            <p className="trav-forbidden-desc">
              Only verified guests who completed their stay or experience can submit a review for this property.
            </p>
            <Link to="/hotels" className="trav-btn trav-btn-primary">
              Return to Browse
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Success State after submitting
  if (submittedReview) {
    return (
      <div className="trav-page-container">
        <TravellerHeader title="Review Submitted" />
        <main className="trav-main">
          <div className="trav-receipt-container">
            <div className="trav-receipt-hero">
              <div className="trav-receipt-check">✓</div>
              <h1 style={{ margin: '0 0 8px', fontSize: '1.85rem', fontWeight: 800 }}>
                Thank You for Your Feedback!
              </h1>
              <p style={{ margin: 0, opacity: 0.9 }}>
                Your review has been verified and published to help fellow travellers.
              </p>
            </div>

            <div className="trav-receipt-body">
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div className="trav-rating-stars" style={{ fontSize: '1.8rem', justifyContent: 'center' }}>
                  {'★'.repeat(Number(submittedReview.rating || rating))}
                </div>
                <h3 style={{ margin: '10px 0 6px', fontSize: '1.25rem', fontWeight: 700 }}>
                  {submittedReview.title || title || 'Verified Guest Review'}
                </h3>
                <p style={{ margin: 0, color: 'var(--trav-text-muted)', fontStyle: 'italic', lineHeight: 1.6 }}>
                  "{submittedReview.comment || comment}"
                </p>
                <div style={{ marginTop: '10px', fontSize: '0.88rem', color: 'var(--trav-text-light)' }}>
                  By {submittedReview.authorName || authorName} • {new Date().toLocaleDateString()}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {targetId && targetType === 'hotel' ? (
                  <Link to={`/hotels/${targetId}`} className="trav-btn trav-btn-primary">
                    View Hotel Page →
                  </Link>
                ) : targetId && targetType === 'experience' ? (
                  <Link to={`/experiences/${targetId}`} className="trav-btn trav-btn-primary">
                    View Experience Page →
                  </Link>
                ) : (
                  <Link to="/hotels" className="trav-btn trav-btn-primary">
                    Browse More Hotels
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setComment('');
                    setTitle('');
                    setValidationError(null);
                    dispatch(clearReviewSubmitState());
                  }}
                  className="trav-btn trav-btn-secondary"
                >
                  Write Another Review
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const activeRating = hoverRating || rating;
  const entityName = targetEntity?.name || targetEntity?.title || targetNameParam || (targetId ? `ID: ${targetId}` : 'Selected Property');
  const entityImage = targetEntity?.images?.[0] || targetEntity?.image;

  return (
    <div className="trav-page-container">
      <TravellerHeader title="Submit Guest Review" backTo="/hotels" backLabel="Back to Browse" />

      <main className="trav-main">
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 6px' }}>
              Share Your Experience
            </h1>
            <p style={{ color: 'var(--trav-text-muted)', margin: 0, fontSize: '1rem' }}>
              Honest feedback from travellers like you powers the Xploreo community.
            </p>
          </div>

          {/* 4. 400 Validation banner */}
          {submitError && (
            <div className="trav-validation-alert" role="alert">
              <span>⚠️</span>
              <div>
                <strong>Validation Notice:</strong> {submitError}
              </div>
            </div>
          )}

          {/* Target Entity Card Preview */}
          {targetEntity && (
            <div className="trav-card" style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px' }}>
              {entityImage && (
                <img
                  src={entityImage}
                  alt={entityName}
                  style={{ width: '80px', height: '80px', borderRadius: 'var(--trav-radius-md)', objectFit: 'cover' }}
                />
              )}
              <div>
                <span className="trav-badge trav-badge-primary" style={{ marginBottom: '4px' }}>
                  {targetType === 'hotel' ? 'Hotel Stay' : 'Tour Experience'}
                </span>
                <h3 style={{ margin: '4px 0 2px', fontSize: '1.2rem', fontWeight: 700 }}>
                  {entityName}
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--trav-text-muted)' }}>
                  📍 {targetEntity.location || targetEntity.city || targetEntity.destination || 'India'}
                </span>
              </div>
            </div>
          )}

          {/* Review Form Card */}
          <form onSubmit={handleSubmit} className="trav-card" style={{ padding: '32px' }}>
            {/* Completed Trip Eligibility Selector */}
            <div className="trav-form-group" style={{ marginBottom: '20px' }}>
              <label className="trav-form-label" htmlFor="trav-review-trip">
                Eligible Completed Trip *
              </label>
              {loadingTrips ? (
                <div style={{ fontSize: '0.88rem', color: 'var(--trav-text-muted)' }}>
                  Verifying completed trip eligibility...
                </div>
              ) : eligibleTrips.length === 0 && !selectedTripId ? (
                <div
                  style={{
                    background: '#fffbeb',
                    border: '1px solid #fef3c7',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    fontSize: '0.9rem',
                    color: '#92400e',
                  }}
                  data-testid="no-eligible-trips-notice"
                >
                  <strong>No Eligible Completed Trips Found: </strong>
                  Reviews can only be submitted for completed trips that have not already been reviewed.
                </div>
              ) : (
                <select
                  id="trav-review-trip"
                  className={`trav-select ${fieldErrors.tripId ? 'has-error' : ''}`}
                  value={selectedTripId}
                  onChange={(e) => setManualSelectedTripId(e.target.value)}
                  disabled={Boolean(searchParams.get('tripId'))}
                >
                  {eligibleTrips.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.id} — {t.itinerary?.day1?.hotel?.name || t.destination || t.planId || 'Completed Itinerary'} ({t.currentLocation || 'Completed'})
                    </option>
                  ))}
                  {selectedTripId && !eligibleTrips.some((t) => t.id === selectedTripId) && (
                    <option value={selectedTripId}>Trip #{selectedTripId}</option>
                  )}
                </select>
              )}
              {fieldErrors.tripId && <span className="trav-field-error">{fieldErrors.tripId}</span>}
            </div>

            {/* Target Selectors if not passed in URL */}
            {!targetIdParam && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                <div className="trav-form-group" style={{ margin: 0 }}>
                  <label className="trav-form-label" htmlFor="trav-target-type">Category *</label>
                  <select
                    id="trav-target-type"
                    className="trav-select"
                    value={targetType}
                    onChange={(e) => setTargetType(e.target.value)}
                  >
                    <option value="hotel">Hotel</option>
                    <option value="experience">Experience</option>
                  </select>
                </div>

                <div className="trav-form-group" style={{ margin: 0 }}>
                  <label className="trav-form-label" htmlFor="trav-target-id">Property / Tour ID *</label>
                  <input
                    id="trav-target-id"
                    type="text"
                    className={`trav-input ${fieldErrors.targetId ? 'has-error' : ''}`}
                    placeholder="e.g. hotel-goa-1 or exp-goa-1"
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                  />
                  {fieldErrors.targetId && (
                    <span className="trav-field-error">{fieldErrors.targetId}</span>
                  )}
                </div>
              </div>
            )}

            {/* Star Rating Selector */}
            <div className="trav-form-group">
              <label className="trav-form-label">Overall Rating *</label>
              <div className="trav-star-picker" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`trav-star-btn ${star <= activeRating ? 'active' : ''}`}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`${star} Stars`}
                  >
                    ★
                  </button>
                ))}
                <span className="trav-star-label">{RATING_LABELS[activeRating]}</span>
              </div>
              {fieldErrors.rating && <span className="trav-field-error">{fieldErrors.rating}</span>}
            </div>

            {/* Review Title */}
            <div className="trav-form-group">
              <label className="trav-form-label" htmlFor="trav-review-title">Review Headline (Optional)</label>
              <input
                id="trav-review-title"
                type="text"
                className="trav-input"
                placeholder="e.g. Peaceful stay with breathtaking ocean views"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Review Content */}
            <div className="trav-form-group">
              <label className="trav-form-label" htmlFor="trav-review-comment">Your Review *</label>
              <textarea
                id="trav-review-comment"
                className={`trav-textarea ${fieldErrors.comment ? 'has-error' : ''}`}
                rows={5}
                placeholder="Tell other travellers about the room cleanliness, staff hospitality, location convenience, and any highlights..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                {fieldErrors.comment ? (
                  <span className="trav-field-error">{fieldErrors.comment}</span>
                ) : (
                  <span style={{ fontSize: '0.8rem', color: 'var(--trav-text-light)' }}>
                    Minimum 10 characters
                  </span>
                )}
                <span style={{ fontSize: '0.8rem', color: comment.length > 950 ? 'var(--trav-error)' : 'var(--trav-text-light)' }}>
                  {comment.length} / 1000
                </span>
              </div>
            </div>

            {/* Reviewer Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div className="trav-form-group" style={{ margin: 0 }}>
                <label className="trav-form-label" htmlFor="trav-author-name">Your Full Name *</label>
                <input
                  id="trav-author-name"
                  type="text"
                  className={`trav-input ${fieldErrors.authorName ? 'has-error' : ''}`}
                  placeholder="e.g. Priya Sharma"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                />
                {fieldErrors.authorName && (
                  <span className="trav-field-error">{fieldErrors.authorName}</span>
                )}
              </div>

              <div className="trav-form-group" style={{ margin: 0 }}>
                <label className="trav-form-label" htmlFor="trav-trip-type">Trip Companion</label>
                <select
                  id="trav-trip-type"
                  className="trav-select"
                  value={tripType}
                  onChange={(e) => setTripType(e.target.value)}
                >
                  <option value="Solo">Solo Traveller</option>
                  <option value="Couple">Couple / Romantic</option>
                  <option value="Family">Family with Children</option>
                  <option value="Friends">Group of Friends</option>
                  <option value="Business">Business Trip</option>
                </select>
              </div>
            </div>

            {/* Submission Action */}
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <button
                type="submit"
                disabled={submitting || (!loadingTrips && eligibleTrips.length === 0 && !selectedTripId)}
                className="trav-btn trav-btn-primary"
                style={{ padding: '14px 28px', fontSize: '1rem' }}
              >
                {submitting ? 'Submitting Review...' : 'Publish Review →'}
              </button>

              <button
                type="button"
                onClick={() => navigate(-1)}
                className="trav-btn trav-btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
