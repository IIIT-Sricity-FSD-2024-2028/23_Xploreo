import { combineReducers } from '@reduxjs/toolkit';
import ticketsReducer from './ticketsSlice.js';

// Technical Admin state, registered in store/index.js as `techadmin`.
export const techadminReducer = combineReducers({
  tickets: ticketsReducer,
});

export { clearResolveError, clearTicketsError } from './ticketsSlice.js';
export { fetchTickets, resolveTicketThunk } from './ticketsThunks.js';
export * from './selectors.js';
