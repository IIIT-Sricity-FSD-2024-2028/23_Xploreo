import { combineReducers } from '@reduxjs/toolkit';
import { bookingsSlice } from './bookingsSlice.js';
import { earningsSlice } from './earningsSlice.js';
import { hotelsSlice } from './hotelsSlice.js';
import { notificationsSlice } from './notificationsSlice.js';
import { partnerProfileSlice } from './partnerProfileSlice.js';
import { reviewsSlice } from './reviewsSlice.js';
import { roomTypesSlice } from './roomTypesSlice.js';
import { ticketsSlice } from './ticketsSlice.js';
import { hotelUiReducer } from './uiSlice.js';

export const hotelReducer = combineReducers({
  hotels: hotelsSlice.reducer,
  rooms: roomTypesSlice.reducer,
  bookings: bookingsSlice.reducer,
  reviews: reviewsSlice.reducer,
  profile: partnerProfileSlice.reducer,
  tickets: ticketsSlice.reducer,
  notifications: notificationsSlice.reducer,
  earnings: earningsSlice.reducer,
  ui: hotelUiReducer,
});
