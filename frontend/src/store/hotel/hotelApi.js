import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import {
  createHotel, createRoomType, deleteHotel, deleteRoomType,
  listHotels, listRooms, updateRoomType,
} from '@/services/hotels.api.js';

const failure = (error) => ({
  error: { status: error?.status ?? 'CUSTOM_ERROR', message: error?.message || 'Something went wrong.' },
});

const run = async (action) => {
  try {
    return { data: await action() };
  } catch (error) {
    return failure(error);
  }
};

export const hotelApi = createApi({
  reducerPath: 'hotelApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Hotels', 'Rooms'],
  endpoints: (builder) => ({
    partnerHotels: builder.query({
      queryFn: () => run(listHotels),
      providesTags: (_result, _error, accountId) => [{ type: 'Hotels', id: accountId }],
    }),
    partnerRooms: builder.query({
      queryFn: ({ hotelIds }) => run(async () => {
        const groups = await Promise.all(hotelIds.map((id) => listRooms(id)));
        return groups.flatMap((rooms, index) => rooms.map((room) => ({ ...room, hotelId: hotelIds[index] })));
      }),
      providesTags: (_result, _error, { accountId }) => [{ type: 'Rooms', id: accountId }],
    }),
    addProperty: builder.mutation({
      queryFn: ({ values }) => run(() => createHotel(values)),
      invalidatesTags: (_result, error, { accountId }) => error ? [] : [{ type: 'Hotels', id: accountId }],
    }),
    removeProperty: builder.mutation({
      queryFn: ({ hotelId }) => run(() => deleteHotel(hotelId)),
      invalidatesTags: (_result, error, { accountId }) => error ? [] : [{ type: 'Hotels', id: accountId }],
    }),
    addRoom: builder.mutation({
      queryFn: ({ hotelId, values }) => run(() => createRoomType(hotelId, values)),
      invalidatesTags: (_result, error, { accountId }) => error ? [] : [
        { type: 'Hotels', id: accountId }, { type: 'Rooms', id: accountId },
      ],
    }),
    changeRoom: builder.mutation({
      queryFn: ({ hotelId, roomId, values }) => run(() => updateRoomType(hotelId, roomId, values)),
      invalidatesTags: (_result, error, { accountId }) => error ? [] : [
        { type: 'Hotels', id: accountId }, { type: 'Rooms', id: accountId },
      ],
    }),
    removeRoom: builder.mutation({
      queryFn: ({ hotelId, roomId }) => run(() => deleteRoomType(hotelId, roomId)),
      invalidatesTags: (_result, error, { accountId }) => error ? [] : [
        { type: 'Hotels', id: accountId }, { type: 'Rooms', id: accountId },
      ],
    }),
  }),
});

export const {
  usePartnerHotelsQuery, usePartnerRoomsQuery,
  useAddPropertyMutation, useRemovePropertyMutation,
  useAddRoomMutation, useChangeRoomMutation, useRemoveRoomMutation,
} = hotelApi;
