import { configureStore } from '@reduxjs/toolkit';
import { hotelApi } from './hotel/hotelApi.js';
import { guideReducer } from './guide/index.js';

export const store = configureStore({
  reducer: {
    [hotelApi.reducerPath]: hotelApi.reducer,
    guide: guideReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(hotelApi.middleware),
});
