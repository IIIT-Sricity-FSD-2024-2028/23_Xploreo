import { getPartnerEarnings } from '@/services/hotels.api.js';
import { createProjectionSlice, createReadThunk } from './resource.js';

export const fetchPartnerEarnings = createReadThunk('earnings', ({ hotelId }) => getPartnerEarnings(hotelId));
export const earningsSlice = createProjectionSlice('earnings', fetchPartnerEarnings);
