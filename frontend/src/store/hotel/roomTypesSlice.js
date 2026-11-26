import { createRoomType, deleteRoomType, listRooms, updateRoomType } from '@/services/hotels.api.js';
import { LIST, createReadThunk, createRepositorySlice, createWriteThunk, invalidateHotelData } from './resource.js';

export const fetchPartnerRooms = createReadThunk('rooms', async ({ hotelIds }) => {
  const groups = await Promise.all(hotelIds.map((id) => listRooms(id)));
  return groups.flatMap((records, index) => records.map((record) => ({ ...record, hotelId: hotelIds[index] })));
});

export const roomTypesSlice = createRepositorySlice('rooms', fetchPartnerRooms);
const actions = roomTypesSlice.actions;

function syncRooms(action, record, { hotelId, roomId }, dispatch, getState) {
  for (const key of Object.keys(getState().hotel.rooms.entries)) {
    if (key === LIST || (key.startsWith('[') && JSON.parse(key).includes(hotelId))) {
      dispatch(action({ key, id: roomId, record: { ...record, hotelId } }));
    }
  }
  dispatch(invalidateHotelData(['hotels', 'rooms', 'earnings']));
}

export const addRoom = createWriteThunk('rooms/add', ({ hotelId, values }) => createRoomType(hotelId, values),
  (...args) => syncRooms(actions.create, ...args));
export const changeRoom = createWriteThunk('rooms/change', ({ hotelId, roomId, values }) => updateRoomType(hotelId, roomId, values),
  (...args) => syncRooms(actions.update, ...args));
export const removeRoom = createWriteThunk('rooms/remove', ({ hotelId, roomId }) => deleteRoomType(hotelId, roomId),
  (...args) => syncRooms(actions.delete, ...args));
