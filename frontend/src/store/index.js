import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { bindSession } from '@/services/session.js';
import experiencesReducer from './experience/experiencesSlice.js';
import { guideReducer } from './guide/index.js';
import { hotelReducer } from './hotel/index.js';
import sessionReducer, { selectUser, sessionEnded, sessionStarted } from './sessionSlice.js';

const reducers = combineReducers({
  session: sessionReducer,
  hotel: hotelReducer,
  guide: guideReducer,
  experience: combineReducers({ catalog: experiencesReducer }),
});

function rootReducer(state, action) {
  if (state && (sessionStarted.match(action) || sessionEnded.match(action))) {
    return reducers({ session: state.session }, action);
  }
  return reducers(state, action);
}

export const store = configureStore({ reducer: rootReducer });
bindSession(() => selectUser(store.getState()));
