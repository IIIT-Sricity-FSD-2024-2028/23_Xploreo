import { createTicket, getTickets } from '@/services/tickets.api.js';
import { createReadThunk, createRepositorySlice, createWriteThunk, invalidateHotelData } from './resource.js';

export const fetchPartnerTickets = createReadThunk('tickets', getTickets);
export const ticketsSlice = createRepositorySlice('tickets', fetchPartnerTickets);

export const createPartnerSupportTicket = createWriteThunk('tickets/add', ({ values }) => createTicket(values), (record, _args, dispatch) => {
  dispatch(ticketsSlice.actions.create({ record }));
  dispatch(invalidateHotelData(['tickets']));
});
