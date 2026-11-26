import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { bindSession, bindUnauthorizedHandler } from '@/services/session.js';
import { authReducer, logoutThunk } from './auth/index.js';
import experienceBookingsReducer from './experience/bookingsSlice.js';
import experiencesReducer from './experience/experiencesSlice.js';
import { guideReducer } from './guide/index.js';
import { hotelReducer } from './hotel/index.js';
import { superadminReducer } from './superadmin/index.js';
import sessionReducer, { selectUser, sessionEnded, sessionStarted } from './sessionSlice.js';

const reducers = combineReducers({
  auth: authReducer,
  session: sessionReducer,
  hotel: hotelReducer,
  guide: guideReducer,
  superadmin: superadminReducer,
  experience: combineReducers({ catalog: experiencesReducer, bookings: experienceBookingsReducer }),
});

function rootReducer(state, action) {
  if (state && (sessionStarted.match(action) || sessionEnded.match(action))) {
    return reducers({ auth: state.auth, session: state.session }, action);
  }
  return reducers(state, action);
}

export const store = configureStore({ reducer: rootReducer });
bindSession(() => selectUser(store.getState()));
bindUnauthorizedHandler(() => store.dispatch(logoutThunk()));
