import { combineReducers } from '@reduxjs/toolkit';
import dashboardReducer from './dashboardSlice.js';
import guideApplicationsReducer from './guideApplicationsSlice.js';
import packageBookingsReducer from './packageBookingsSlice.js';
import plansReducer from './plansSlice.js';

// Non-Technical Admin state, registered in store/index.js as `nta`.
export const ntaReducer = combineReducers({
  plans: plansReducer,
  guideApplications: guideApplicationsReducer,
  dashboard: dashboardReducer,
  packageBookings: packageBookingsReducer,
});

export { clearPlanMutation, clearPlansError, planRemoved } from './plansSlice.js';
export { createNtaPlan, deletePlanThunk, fetchNtaPlans, updateNtaPlan } from './plansThunks.js';
export { clearGuideApplicationMutation, clearGuideApplicationsError } from './guideApplicationsSlice.js';
export { decideGuideApplication, fetchGuideApplications } from './guideApplicationsThunks.js';
export { clearDashboardError } from './dashboardSlice.js';
export { fetchNtaTripActivity } from './dashboardThunks.js';
export {
  clearNtaPackageDispatchResult,
  setSelectedNtaPackageBookingId,
} from './packageBookingsSlice.js';
export {
  dispatchNtaPackageBookingThunk,
  fetchNtaPackageBookingDetail,
  fetchNtaPackageBookings,
} from './packageBookingsThunks.js';
export * from './selectors.js';
