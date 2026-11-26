import { cancelBooking, checkInBooking, checkOutBooking, listHotelBookings } from '@/services/hotels.api.js';
import { createReadThunk, createRepositorySlice, createWriteThunk, invalidateHotelData } from './resource.js';

export const fetchPartnerBookings = createReadThunk('bookings', () => listHotelBookings());
export const bookingsSlice = createRepositorySlice('bookings', fetchPartnerBookings);

function bookingChange(name, change, affected) {
  return createWriteThunk(`bookings/${name}`, ({ bookingId }) => change(bookingId), (record, _args, dispatch) => {
    dispatch(bookingsSlice.actions.update({ record }));
    dispatch(invalidateHotelData(['bookings', 'earnings', ...affected]));
  });
}

export const checkInPartnerBooking = bookingChange('checkIn', checkInBooking, []);
export const checkOutPartnerBooking = bookingChange('checkOut', checkOutBooking, ['hotels', 'rooms']);
export const cancelPartnerBooking = bookingChange('cancel', cancelBooking, ['hotels', 'rooms']);
