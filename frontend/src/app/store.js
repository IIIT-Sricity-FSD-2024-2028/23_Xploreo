import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/authSlice.js';
import bookingsReducer from '../features/bookingsSlice.js';
import browseReducer from '../features/browseSlice.js';
import checkoutReducer from '../features/checkoutSlice.js';
import dashboardReducer from '../features/dashboardSlice.js';
import notificationsReducer from '../features/notificationsSlice.js';
import reviewsReducer from '../features/reviewsSlice.js';
import supportTicketsReducer from '../features/supportTicketsSlice.js';
import tripsReducer from '../features/tripsSlice.js';
import { hotelApi } from '../store/hotel/hotelApi.js';

// Single central application store combining Traveller feature slices with existing teammate hotelApi.
export const store = configureStore({
  reducer: {
    auth: authReducer,
    dashboard: dashboardReducer,
    browse: browseReducer,
    bookings: bookingsReducer,
    trips: tripsReducer,
    reviews: reviewsReducer,
    supportTickets: supportTicketsReducer,
    checkout: checkoutReducer,
    notifications: notificationsReducer,
    [hotelApi.reducerPath]: hotelApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(hotelApi.middleware),
});
