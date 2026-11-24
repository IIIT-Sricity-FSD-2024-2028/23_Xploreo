import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import {
  cancelBooking, checkInBooking, checkOutBooking, listHotelBookings,
  createHotel, createRoomType, deleteHotel, deleteRoomType,
  getPartnerEarnings, getPartnerProfile, listHotels, listPartnerReviews, listRooms,
  updatePartnerProfile, updateRoomType,
} from '@/services/hotels.api.js';
import { createTicket, getTickets } from '@/services/tickets.api.js';
import { getUser } from '@/services/session.js';

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

export function getHotelAccountId(user) {
  const userId = user?.userId || user?.id || user?.username;
  return user?.role === 'hotel' && userId ? String(userId) : null;
}

function runForHotelPartner(accountId, action) {
  if (!accountId || getHotelAccountId(getUser()) !== accountId) {
    return { error: { status: 403, message: 'Sign in as this hotel partner to continue.' } };
  }
  return run(action);
}

const bookingTag = (accountId) => ({ type: 'Bookings', id: accountId });
const earningsTag = (accountId) => ({ type: 'Earnings', id: accountId });
const reviewTag = (accountId) => ({ type: 'Reviews', id: accountId });
const supportTicketsTag = (accountId) => ({ type: 'SupportTickets', id: accountId });
const bookingChangeTags = (accountId) => [bookingTag(accountId), earningsTag(accountId)];
const bookingAndInventoryTags = (_result, error, { accountId }) => error ? [] : [
  ...bookingChangeTags(accountId), { type: 'Hotels', id: accountId }, { type: 'Rooms', id: accountId },
];

export const hotelApi = createApi({
  reducerPath: 'hotelApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Hotels', 'Rooms', 'Bookings', 'Reviews', 'Earnings', 'SupportTickets'],
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
    partnerBookings: builder.query({
      queryFn: (accountId) => runForHotelPartner(accountId, listHotelBookings),
      providesTags: (_result, _error, accountId) => [bookingTag(accountId)],
    }),
    partnerReviews: builder.query({
      queryFn: (accountId) => runForHotelPartner(accountId, listPartnerReviews),
      providesTags: (_result, _error, accountId) => [reviewTag(accountId)],
    }),
    partnerEarnings: builder.query({
      queryFn: ({ accountId, hotelId }) => runForHotelPartner(accountId, () => getPartnerEarnings(hotelId)),
      providesTags: (_result, _error, { accountId }) => [earningsTag(accountId)],
    }),
    partnerProfile: builder.query({
      queryFn: (accountId) => runForHotelPartner(accountId, getPartnerProfile),
    }),
    savePartnerProfile: builder.mutation({
      queryFn: ({ accountId, values }) => runForHotelPartner(accountId, () => updatePartnerProfile(values)),
      async onQueryStarted({ accountId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(hotelApi.util.upsertQueryEntries([
            { endpointName: 'partnerProfile', arg: accountId, value: data },
          ]));
        } catch {
          // Keep the last saved profile when the update fails.
        }
      },
    }),
    partnerSupportTickets: builder.query({
      queryFn: (accountId) => runForHotelPartner(accountId, getTickets),
      providesTags: (_result, _error, accountId) => [supportTicketsTag(accountId)],
    }),
    createPartnerSupportTicket: builder.mutation({
      queryFn: ({ accountId, values }) => runForHotelPartner(accountId, () => createTicket(values)),
      invalidatesTags: (_result, error, { accountId }) => error ? [] : [supportTicketsTag(accountId)],
    }),
    checkInPartnerBooking: builder.mutation({
      queryFn: ({ accountId, bookingId }) => runForHotelPartner(accountId, () => checkInBooking(bookingId)),
      invalidatesTags: (_result, error, { accountId }) => error ? [] : bookingChangeTags(accountId),
    }),
    checkOutPartnerBooking: builder.mutation({
      queryFn: ({ accountId, bookingId }) => runForHotelPartner(accountId, () => checkOutBooking(bookingId)),
      invalidatesTags: bookingAndInventoryTags,
    }),
    cancelPartnerBooking: builder.mutation({
      queryFn: ({ accountId, bookingId }) => runForHotelPartner(accountId, () => cancelBooking(bookingId)),
      invalidatesTags: bookingAndInventoryTags,
    }),
    addProperty: builder.mutation({
      queryFn: ({ values }) => run(() => createHotel(values)),
      invalidatesTags: (_result, error, { accountId }) => error ? [] : [
        { type: 'Hotels', id: accountId }, earningsTag(accountId),
      ],
    }),
    removeProperty: builder.mutation({
      queryFn: ({ hotelId }) => run(() => deleteHotel(hotelId)),
      invalidatesTags: (_result, error, { accountId }) => error ? [] : [
        { type: 'Hotels', id: accountId }, bookingTag(accountId), reviewTag(accountId), earningsTag(accountId),
      ],
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
  usePartnerHotelsQuery, usePartnerRoomsQuery, usePartnerBookingsQuery, usePartnerReviewsQuery, usePartnerEarningsQuery,
  usePartnerProfileQuery, useSavePartnerProfileMutation,
  usePartnerSupportTicketsQuery, useCreatePartnerSupportTicketMutation,
  useAddPropertyMutation, useRemovePropertyMutation,
  useAddRoomMutation, useChangeRoomMutation, useRemoveRoomMutation,
  useCheckInPartnerBookingMutation, useCheckOutPartnerBookingMutation, useCancelPartnerBookingMutation,
} = hotelApi;
