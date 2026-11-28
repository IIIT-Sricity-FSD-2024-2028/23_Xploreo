import { createSelector } from '@reduxjs/toolkit';

const norm = (value) => String(value || '').trim().toLowerCase();

const selectPlansState = (state) => state.nta.plans;

export const selectNtaPlans = (state) => selectPlansState(state).items;
export const selectNtaPlansTotal = (state) => selectPlansState(state).total;
export const selectNtaPlansStatus = (state) => selectPlansState(state).status;
export const selectNtaPlansError = (state) => selectPlansState(state).error;

// True until the first load finishes, and while any load is in flight.
export const selectNtaPlansLoading = (state) => {
  const status = selectNtaPlansStatus(state);
  return status === 'idle' || status === 'loading';
};

export const selectNtaPlanMutation = (state) => selectPlansState(state).mutation;
export const selectNtaPlanMutationStatus = (state) => selectPlansState(state).mutation.status;
export const selectNtaPlanMutationError = (state) => selectPlansState(state).mutation.error;

// One plan by id, or null.
export const selectNtaPlanById = createSelector(
  [selectNtaPlans, (_state, id) => id],
  (plans, id) => plans.find((plan) => plan.id === id) ?? null,
);

// Plans with a given status ('available' | 'draft' | 'sold_out' | 'unavailable'); a plan
// without a status counts as 'available', as in PlanList. 'all' returns every plan.
export const selectNtaPlansByStatus = createSelector(
  [selectNtaPlans, (_state, status) => status],
  (plans, status) =>
    !status || status === 'all' ? plans : plans.filter((plan) => norm(plan.status || 'available') === norm(status)),
);

// Plans whose destination matches a city/region exactly (case-insensitive). 'All' returns every plan.
export const selectNtaPlansByDestination = createSelector(
  [selectNtaPlans, (_state, destination) => destination],
  (plans, destination) =>
    !destination || norm(destination) === 'all'
      ? plans
      : plans.filter((plan) => norm(plan.destination) === norm(destination)),
);

// ---------------------------------------------------------------------------
// Guide applications (state.nta.guideApplications)
// ---------------------------------------------------------------------------

const selectGuideApplicationsState = (state) => state.nta.guideApplications;

export const selectGuideApplications = (state) => selectGuideApplicationsState(state).items;
export const selectGuideApplicationsStatus = (state) => selectGuideApplicationsState(state).status;
export const selectGuideApplicationsError = (state) => selectGuideApplicationsState(state).error;

// True until the first load finishes, and while any load is in flight.
export const selectGuideApplicationsLoading = (state) => {
  const status = selectGuideApplicationsStatus(state);
  return status === 'idle' || status === 'loading';
};

export const selectGuideApplicationMutation = (state) => selectGuideApplicationsState(state).mutation;
export const selectGuideApplicationMutationStatus = (state) => selectGuideApplicationsState(state).mutation.status;
export const selectGuideApplicationMutationError = (state) => selectGuideApplicationsState(state).mutation.error;

// One application by id, or null.
export const selectGuideApplicationById = createSelector(
  [selectGuideApplications, (_state, id) => id],
  (applications, id) => applications.find((app) => app.id === id) ?? null,
);

// Applications with a given status ('pending' | 'accepted' | 'rejected'); 'all' returns every one.
export const selectGuideApplicationsByStatus = createSelector(
  [selectGuideApplications, (_state, status) => status],
  (applications, status) =>
    !status || status === 'all' ? applications : applications.filter((app) => norm(app.status) === norm(status)),
);

// ---------------------------------------------------------------------------
// Dashboard (state.nta.dashboard for trips; package figures derived from state.nta.plans)
// ---------------------------------------------------------------------------

const selectDashboardState = (state) => state.nta.dashboard;

// Every package booking (trip) in the NTA's region, as GET /trips returned it.
export const selectNtaBookings = (state) => selectDashboardState(state).bookings;

// Trip statuses that are still a live booking: booked and not yet over. Cancelled (incl. refunded)
// and completed trips are excluded; 'draft' trips were never booked.
export const ACTIVE_BOOKING_STATUSES = ['confirmed', 'pending_guide_confirm', 'rejected_by_guide', 'started'];

// The "Active Bookings" KPI: region bookings whose status is in ACTIVE_BOOKING_STATUSES.
export const selectNtaDashboardTripCount = createSelector([selectNtaBookings], (bookings) =>
  bookings.filter((b) => ACTIVE_BOOKING_STATUSES.includes(norm(b.status))).length,
);

// Package title for a booking: the title GET /trips sends, else the plan in state.nta.plans.
const withPackageTitle = (booking, plansById) => ({
  ...booking,
  packageTitle: booking.packageTitle || plansById.get(booking.packageId)?.title || booking.packageId || null,
});

// Recent Package Bookings table: newest first (trips without a booking time last), 15 rows,
// every status included so cancellations stay visible.
export const selectNtaRecentBookings = createSelector([selectNtaBookings, selectNtaPlans], (bookings, plans) => {
  const plansById = new Map(plans.map((p) => [p.id, p]));
  return [...bookings]
    .sort((a, b) => String(b.bookingDate || '').localeCompare(String(a.bookingDate || '')))
    .slice(0, 15)
    .map((b) => withPackageTitle(b, plansById));
});

// One booking (with its booked hotel and experiences) by trip id, or null.
export const selectNtaBookingById = createSelector(
  [selectNtaBookings, selectNtaPlans, (_state, bookingId) => bookingId],
  (bookings, plans, bookingId) => {
    const booking = bookings.find((b) => b.bookingId === bookingId);
    return booking ? withPackageTitle(booking, new Map(plans.map((p) => [p.id, p]))) : null;
  },
);

export const selectNtaDashboardStatus = (state) => selectDashboardState(state).status;
export const selectNtaDashboardError = (state) => selectDashboardState(state).error;

// True until the first load finishes, and while any load is in flight.
export const selectNtaDashboardLoading = (state) => {
  const status = selectNtaDashboardStatus(state);
  return status === 'idle' || status === 'loading';
};

// KPI cards — the same figures and trend objects nta.api.js#getNtaDashboardMetrics returned from
// GET /plans + GET /trips (the trend values are fixed there too, not computed).
export const selectNtaDashboardKpis = createSelector(
  [selectNtaPlans, selectNtaDashboardTripCount],
  (plans, tripCount) => ({
    totalPackages: plans.length,
    totalPackagesTrend: { value: 12.5, direction: 'up', label: 'vs last month' },
    availablePackages: plans.filter((p) => p.status === 'available').length,
    availablePackagesTrend: { value: 7.7, direction: 'up', label: 'active' },
    unavailablePackages: plans.filter((p) => p.status === 'unavailable').length,
    unavailablePackagesTrend: { value: 0, direction: 'neutral', label: 'paused / draft' },
    // Active bookings only (see ACTIVE_BOOKING_STATUSES); cancelled and completed trips excluded.
    recentBookingsCount: tripCount,
    recentBookingsTrend: { value: 18.2, direction: 'up', label: 'past 30 days' },
  }),
);

// ---------------------------------------------------------------------------
// Partner inventory (state.nta.inventory) for building packages
// ---------------------------------------------------------------------------

const selectInventoryState = (state) => state.nta.inventory;
const EMPTY_ROOMS = { items: [], status: 'idle', error: null };

export const selectNtaInventoryHotels = (state) => selectInventoryState(state).hotels.items;
export const selectNtaInventoryExperiences = (state) => selectInventoryState(state).experiences.items;
export const selectNtaInventoryHotelsStatus = (state) => selectInventoryState(state).hotels.status;
export const selectNtaInventoryExperiencesStatus = (state) => selectInventoryState(state).experiences.status;
export const selectNtaInventoryError = (state) =>
  selectInventoryState(state).hotels.error || selectInventoryState(state).experiences.error;

// Active partner hotels in a destination (exact city match, case-insensitive) — the only hotels
// the backend accepts in a package for that destination.
export const selectNtaRegionHotels = createSelector(
  [selectNtaInventoryHotels, (_state, destination) => destination],
  (hotels, destination) =>
    hotels.filter((h) => (!h.status || h.status === 'active') && norm(h.city) === norm(destination)),
);

// Available partner experiences in a destination (exact match on experience.destination).
export const selectNtaRegionExperiences = createSelector(
  [selectNtaInventoryExperiences, (_state, destination) => destination],
  (experiences, destination) =>
    experiences.filter((e) => norm(e.availability) === 'available' && norm(e.destination) === norm(destination)),
);

// Room types of one hotel: { items, status, error }.
export const selectNtaHotelRooms = (state, hotelId) =>
  selectInventoryState(state).roomsByHotel[hotelId] || EMPTY_ROOMS;

// Package pricing distribution — as nta.api.js#getNtaPricingDistribution built it from GET /plans:
// plans in the region (exact, case-insensitive), in the order the server returns them.
export const selectNtaPricingDistribution = createSelector(
  [selectNtaPlans, (_state, region) => region],
  (plans, region) => {
    const targetRegion = String(region || '').trim();
    const filtered = targetRegion
      ? plans.filter((plan) => plan.destination?.toLowerCase() === targetRegion.toLowerCase())
      : plans;
    return filtered.map((plan) => ({
      id: plan.id,
      name: plan.title,
      price: Number(plan.pricePerPerson || plan.price) || 0,
      destination: plan.destination || 'Unassigned',
      status: plan.status || 'available',
    }));
  },
);

// Bar-chart series for SAChart — the dashboard's chartData mapping.
export const selectNtaPricingChartData = createSelector([selectNtaPricingDistribution], (distribution) =>
  distribution.map((item) => ({
    label: item.name ? (item.name.length > 16 ? `${item.name.slice(0, 14)}...` : item.name) : 'Package',
    fullName: item.name,
    price: Number(item.price) || 0,
    destination: item.destination,
  })),
);

// Tab counts, calculated exactly as the Guide Applications page did.
export const selectGuideApplicationCounts = createSelector([selectGuideApplications], (applications) => {
  const res = { all: applications.length, pending: 0, accepted: 0, rejected: 0 };
  applications.forEach((app) => {
    const st = String(app.status || '').toLowerCase();
    if (st === 'pending') res.pending += 1;
    else if (st === 'accepted') res.accepted += 1;
    else if (st === 'rejected') res.rejected += 1;
  });
  return res;
});

// ---------------------------------------------------------------------------
// Package Bookings & Component Distribution (state.nta.packageBookings)
// ---------------------------------------------------------------------------

const selectNtaPackageBookingsState = (state) => state.nta.packageBookings;

export const selectNtaPackageBookings = (state) => selectNtaPackageBookingsState(state)?.items ?? [];
export const selectNtaPackageBookingsStatus = (state) => selectNtaPackageBookingsState(state)?.status ?? 'idle';
export const selectNtaPackageBookingsError = (state) => selectNtaPackageBookingsState(state)?.error ?? null;
export const selectSelectedNtaPackageBookingId = (state) => selectNtaPackageBookingsState(state)?.selectedId ?? null;
export const selectSelectedNtaPackageBookingDetail = (state) => selectNtaPackageBookingsState(state)?.selectedDetail ?? null;
export const selectNtaPackageBookingDetailStatus = (state) => selectNtaPackageBookingsState(state)?.detailStatus ?? 'idle';
export const selectNtaPackageBookingDetailError = (state) => selectNtaPackageBookingsState(state)?.detailError ?? null;
export const selectNtaPackageDispatchStatus = (state) => selectNtaPackageBookingsState(state)?.dispatchStatus ?? 'idle';
export const selectNtaPackageDispatchError = (state) => selectNtaPackageBookingsState(state)?.dispatchError ?? null;
export const selectNtaPackageLastDispatchResult = (state) => selectNtaPackageBookingsState(state)?.lastDispatchResult ?? null;
