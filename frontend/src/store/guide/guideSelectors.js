import { createSelector } from '@reduxjs/toolkit';

// ============================================================================
// BASE SELECTORS (Read raw slices of guide state)
// ============================================================================

export const selectGuideState = (state) => state.guide;

export const selectGuidePlans = (state) => state.guide.plans;
export const selectGuideExperiences = (state) => state.guide.experiences;
export const selectGuideApplications = (state) => state.guide.applications;
export const selectGuideAssignments = (state) => state.guide.assignments;
export const selectGuideTrips = (state) => state.guide.trips;
export const selectGuideReviews = (state) => state.guide.reviews;
export const selectGuideTickets = (state) => state.guide.tickets;
export const selectActiveTraveller = (state) => state.guide.activeTraveller;

export const selectGuideLoading = (state) => state.guide.loading;
export const selectGuideActionBusy = (state) => state.guide.actionBusy;
export const selectGuideError = (state) => state.guide.error;
export const selectGuideSuccessMessage = (state) => state.guide.successMessage;

// Helper text matching for region
const sameArea = (a, b) => {
  const x = String(a ?? '').toLowerCase();
  const y = String(b ?? '').toLowerCase();
  return !x || !y || x.includes(y) || y.includes(x);
};

// Helper for job earnings
const amountOf = (job) => (job.kind === 'experience' ? Number(job.guideFee) || 0 : Number(job.totalAmount) || 0);
const sumJobs = (jobs) => (jobs || []).reduce((total, job) => total + amountOf(job), 0);

// ============================================================================
// MEMOIZED DERIVED SELECTORS (createSelector)
// ============================================================================

/**
 * Filters available plans by the guide's assigned home region.
 */
export const selectPlansForRegion = (region) =>
  createSelector([selectGuidePlans], (plans) =>
    (plans || []).filter((p) => sameArea(p.destination, region))
  );

/**
 * Filters available experiences by the guide's assigned home region.
 */
export const selectExperiencesForRegion = (region) =>
  createSelector([selectGuideExperiences], (experiences) =>
    (experiences || []).filter((e) => sameArea(e.destination, region))
  );

/**
 * Calculates quick dashboard KPI stats (accepted applications, pending, active jobs).
 */
export const selectDashboardStats = createSelector(
  [selectGuideApplications, selectGuideAssignments],
  (applications, assignments) => {
    const apps = applications || [];
    const jobs = assignments || [];
    return {
      acceptedCount: apps.filter((a) => a.status === 'accepted').length,
      pendingCount: apps.filter((a) => a.status === 'pending').length,
      activeJobsCount: jobs.filter((a) => a.status === 'confirmed').length,
      totalJobsCount: jobs.length,
    };
  }
);

/**
 * Calculates complete earnings summary (Total Earned, Pending Payout, Refund Breakdown).
 */
export const selectEarningsSummary = createSelector(
  [selectGuideAssignments, selectGuideTrips],
  (assignments, trips) => {
    const jobs = assignments || [];
    const tripList = trips || [];

    const confirmed = jobs.filter((j) => j.status === 'confirmed' || j.status === 'started' || j.status === 'completed');
    const pending = jobs.filter((j) => j.status === 'pending_guide_confirm');
    const refundedTrips = tripList.filter((t) => t.status === 'refunded' || t.status === 'cancelled');

    const totalEarned = sumJobs(confirmed);
    const pendingPayout = sumJobs(pending);
    const refundedAmount = sumJobs(refundedTrips);
    const grossAmount = totalEarned + refundedAmount;
    const refundPercent = grossAmount ? Math.round((refundedAmount / grossAmount) * 100) : 0;

    return {
      totalEarned,
      pendingPayout,
      confirmedCount: confirmed.length,
      totalJobsCount: jobs.length,
      refundedAmount,
      refundPercent,
      refundedCount: refundedTrips.length,
      totalTripsCount: tripList.length,
    };
  }
);

/**
 * Filters reviews for this specific guide and computes average rating & star distribution.
 */
export const selectGuideReviewsSummary = (guideId) =>
  createSelector([selectGuideReviews], (allReviews) => {
    const reviews = (allReviews || [])
      .filter((r) => r.targetType === 'guide' && String(r.targetId) === String(guideId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const totalCount = reviews.length;
    const avgRating = totalCount > 0
      ? (reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / totalCount).toFixed(1)
      : '0.0';

    const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      const star = Math.round(Number(r.rating) || 0);
      if (ratingCounts[star] !== undefined) ratingCounts[star]++;
    });

    return {
      reviews,
      totalCount,
      avgRating,
      ratingCounts,
    };
  });
