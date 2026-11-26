import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectHotelAccountId, selectSessionVersion } from '../sessionSlice.js';
import { fetchPartnerBookings } from './bookingsSlice.js';
import { fetchPartnerEarnings } from './earningsSlice.js';
import { fetchPartnerHotels } from './hotelsSlice.js';
import { fetchPartnerNotifications } from './notificationsSlice.js';
import { fetchPartnerProfile } from './partnerProfileSlice.js';
import { LIST, selectEntry } from './resource.js';
import { fetchPartnerReviews } from './reviewsSlice.js';
import { fetchPartnerRooms } from './roomTypesSlice.js';
import { selectProperties, selectReviewSummary, selectRooms } from './selectors.js';
import { fetchPartnerTickets } from './ticketsSlice.js';

const EMPTY = [];
const NO_PARAMS = {};

export function useHotelAction(thunk) {
  const dispatch = useDispatch();
  return useCallback((...args) => dispatch(thunk(...args)), [dispatch, thunk]);
}

function useHotelResource(resource, fetch, { key = LIST, params = NO_PARAMS, maxAge } = {}) {
  const dispatch = useDispatch();
  const accountId = useSelector(selectHotelAccountId);
  const sessionVersion = useSelector(selectSessionVersion);
  const entry = useSelector((state) => selectEntry(state, resource, key));
  const enabled = Boolean(accountId && key !== null);

  useEffect(() => {
    if (enabled) dispatch(fetch({ ...params, accountId, key, maxAge }));
  }, [accountId, dispatch, enabled, entry.revision, fetch, key, maxAge, params, sessionVersion]);

  const reload = useCallback(() => {
    if (enabled) return dispatch(fetch({ ...params, accountId, key, force: true }));
  }, [accountId, dispatch, enabled, fetch, key, params]);

  return {
    accountId,
    data: enabled ? entry.data : null,
    loading: enabled && (entry.status === 'idle' || entry.status === 'pending'),
    error: enabled ? entry.error : null,
    reload,
  };
}

export function usePartnerHotels() {
  const hotels = useHotelResource('hotels', fetchPartnerHotels, { maxAge: 0 });
  return { ...hotels, loading: hotels.loading && !hotels.data?.length };
}

export function usePartnerBookings() {
  return useHotelResource('bookings', fetchPartnerBookings);
}

export function usePartnerReviews() {
  const reviews = useHotelResource('reviews', fetchPartnerReviews);
  const summary = useMemo(() => selectReviewSummary(reviews.data), [reviews.data]);
  return { ...reviews, summary };
}

export function usePartnerEarnings(hotelId) {
  const params = useMemo(() => ({ hotelId: hotelId || null }), [hotelId]);
  return useHotelResource('earnings', fetchPartnerEarnings, { key: JSON.stringify(params.hotelId), params });
}

export function usePartnerProfile() {
  const profile = useHotelResource('profile', fetchPartnerProfile);
  return { ...profile, data: profile.data?.[0] ?? null };
}

export function usePartnerSupportTickets() {
  const tickets = useHotelResource('tickets', fetchPartnerTickets, { maxAge: 0 });
  return {
    accountId: tickets.accountId,
    tickets: tickets.data ?? EMPTY,
    isLoading: tickets.loading,
    error: tickets.error?.message ?? null,
  };
}

export function usePartnerNotifications() {
  return useHotelResource('notifications', fetchPartnerNotifications, { maxAge: 0 });
}

export function usePartnerCatalog() {
  const hotels = usePartnerHotels();
  const roomKey = hotels.data?.length ? JSON.stringify(hotels.data.map((hotel) => hotel.id)) : null;
  const params = useMemo(() => ({ hotelIds: roomKey === null ? EMPTY : JSON.parse(roomKey) }), [roomKey]);
  const rooms = useHotelResource('rooms', fetchPartnerRooms, { key: roomKey, params, maxAge: 0 });
  const roomData = hotels.data?.length === 0 ? EMPTY : rooms.data;
  const properties = useMemo(
    () => hotels.data && roomData ? selectProperties(hotels.data, roomData) : null,
    [hotels.data, roomData],
  );
  const services = useMemo(
    () => hotels.data && roomData ? selectRooms(hotels.data, roomData) : null,
    [hotels.data, roomData],
  );

  return {
    accountId: hotels.accountId,
    hotels: hotels.data,
    properties,
    rooms: services,
    loading: hotels.loading || (rooms.loading && !roomData),
    error: hotels.error || rooms.error,
    reload: () => { hotels.reload(); rooms.reload(); },
  };
}
