import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { bindSession, bindUnauthorizedHandler } from '@/services/session.js';
import authReducer, {
  loginUser,
  logoutSession,
  logoutUser,
  registerUser,
  restoreAuthSession,
  selectAuthUser,
  setAuthUser,
} from '@/features/authSlice.js';
import bookingsReducer from '@/features/bookingsSlice.js';
import browseReducer from '@/features/browseSlice.js';
import checkoutReducer from '@/features/checkoutSlice.js';
import dashboardReducer from '@/features/dashboardSlice.js';
import notificationsReducer from '@/features/notificationsSlice.js';
import reviewsReducer from '@/features/reviewsSlice.js';
import supportTicketsReducer from '@/features/supportTicketsSlice.js';
import tripsReducer from '@/features/tripsSlice.js';
import experienceBookingsReducer from './experience/bookingsSlice.js';
import experienceEarningsReducer from './experience/earningsSlice.js';
import experiencesReducer from './experience/experiencesSlice.js';
import experienceNotificationsReducer from './experience/notificationsSlice.js';
import experienceReviewsReducer from './experience/reviewsSlice.js';
import experienceTicketsReducer from './experience/ticketsSlice.js';
import { guideReducer } from './guide/index.js';
import { hotelReducer } from './hotel/index.js';
import { ntaReducer } from './nta/index.js';
import { superadminReducer } from './superadmin/index.js';
import { techadminReducer } from './techadmin/index.js';
import sessionReducer, { sessionEnded, sessionStarted } from './sessionSlice.js';

const reducers = combineReducers({
  auth: authReducer,
  session: sessionReducer,
  hotel: hotelReducer,
  guide: guideReducer,
  superadmin: superadminReducer,
  techadmin: techadminReducer,
  nta: ntaReducer,
  dashboard: dashboardReducer,
  browse: browseReducer,
  bookings: bookingsReducer,
  trips: tripsReducer,
  reviews: reviewsReducer,
  supportTickets: supportTicketsReducer,
  checkout: checkoutReducer,
  notifications: notificationsReducer,
  experience: combineReducers({
    catalog: experiencesReducer,
    bookings: experienceBookingsReducer,
    earnings: experienceEarningsReducer,
    reviews: experienceReviewsReducer,
    tickets: experienceTicketsReducer,
    notifications: experienceNotificationsReducer,
  }),
});

function isSessionResetAction(action) {
  return (
    sessionStarted.match(action) ||
    sessionEnded.match(action) ||
    loginUser.fulfilled.match(action) ||
    registerUser.fulfilled.match(action) ||
    logoutSession.fulfilled.match(action) ||
    logoutUser.match(action) ||
    setAuthUser.match(action) ||
    restoreAuthSession.rejected.match(action) ||
    action.type === 'auth/login/fulfilled' ||
    action.type === 'auth/register/fulfilled' ||
    action.type === 'auth/logout/fulfilled'
  );
}

function rootReducer(state, action) {
  if (state && isSessionResetAction(action)) {
    return reducers({ auth: state.auth, session: state.session }, action);
  }
  return reducers(state, action);
}

export const store = configureStore({ reducer: rootReducer });
bindSession(() => selectAuthUser(store.getState()));
bindUnauthorizedHandler(() => store.dispatch(logoutSession()));
