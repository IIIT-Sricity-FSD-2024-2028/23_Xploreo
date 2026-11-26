import { createHotel, deleteHotel, listHotels, updateHotel } from '@/services/hotels.api.js';
import { createReadThunk, createRepositorySlice, createWriteThunk, invalidateHotelData } from './resource.js';

export const fetchPartnerHotels = createReadThunk('hotels', () => listHotels());
export const hotelsSlice = createRepositorySlice('hotels', fetchPartnerHotels);
const actions = hotelsSlice.actions;

export const addProperty = createWriteThunk('hotels/add', ({ values }) => createHotel(values), (record, _args, dispatch) => {
  dispatch(actions.create({ record }));
  dispatch(invalidateHotelData(['hotels', 'rooms', 'earnings']));
});

export const changeProperty = createWriteThunk('hotels/change', ({ hotelId, values }) => updateHotel(hotelId, values), (record, _args, dispatch) => {
  dispatch(actions.update({ record }));
  dispatch(invalidateHotelData(['hotels', 'bookings', 'reviews', 'earnings']));
});

export const removeProperty = createWriteThunk('hotels/remove', ({ hotelId }) => deleteHotel(hotelId), (_result, { hotelId }, dispatch) => {
  dispatch(actions.delete({ id: hotelId }));
  dispatch(invalidateHotelData(['hotels', 'rooms', 'bookings', 'reviews', 'earnings']));
});
