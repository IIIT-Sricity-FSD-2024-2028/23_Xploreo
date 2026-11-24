import { configureStore } from '@reduxjs/toolkit';
import { hotelApi } from './hotel/hotelApi.js';

export const store = configureStore({
  reducer: { [hotelApi.reducerPath]: hotelApi.reducer },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(hotelApi.middleware),
});
