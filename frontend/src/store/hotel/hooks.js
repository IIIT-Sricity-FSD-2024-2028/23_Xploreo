import { useMemo } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
import { useAuth } from '@/context/AuthContext.jsx';
import {
  getHotelAccountId, usePartnerBookingsQuery, usePartnerHotelsQuery, usePartnerReviewsQuery, usePartnerRoomsQuery,
} from './hotelApi.js';
import { selectProperties, selectReviewSummary, selectRooms } from './selectors.js';

const EMPTY_ROOMS = [];
const refreshOnOpen = { refetchOnMountOrArgChange: true };
const reuseRecentData = { refetchOnMountOrArgChange: 30 };

export function usePartnerHotels() {
  const { user } = useAuth();
  const accountId = getHotelAccountId(user);
  const query = usePartnerHotelsQuery(accountId ?? skipToken, refreshOnOpen);
  const data = query.currentData ?? null;
  return {
    accountId,
    data,
    loading: query.isFetching && !data?.length,
    error: query.error ?? null,
    reload: query.refetch,
  };
}

export function usePartnerBookings() {
  const { user } = useAuth();
  const accountId = getHotelAccountId(user);
  const query = usePartnerBookingsQuery(accountId ?? skipToken, reuseRecentData);
  return {
    accountId,
    data: query.currentData ?? null,
    loading: query.isFetching,
    error: query.error ?? null,
    reload: query.refetch,
  };
}

export function usePartnerReviews() {
  const { user } = useAuth();
  const accountId = getHotelAccountId(user);
  const query = usePartnerReviewsQuery(accountId ?? skipToken, reuseRecentData);
  const data = query.currentData ?? null;
  const summary = useMemo(() => selectReviewSummary(data), [data]);
  return {
    data,
    summary,
    loading: query.isFetching,
    error: query.error ?? null,
    reload: query.refetch,
  };
}

export function usePartnerCatalog() {
  const hotels = usePartnerHotels();
  const hotelIds = useMemo(() => hotels.data?.map((hotel) => hotel.id) ?? null, [hotels.data]);
  const hasHotels = Boolean(hotelIds?.length);
  const rooms = usePartnerRoomsQuery(
    hasHotels ? { accountId: hotels.accountId, hotelIds } : skipToken,
    refreshOnOpen,
  );
  const roomData = hotelIds?.length === 0 ? EMPTY_ROOMS : rooms.currentData;
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
    loading: hotels.loading || (rooms.isFetching && !roomData),
    error: hotels.error || rooms.error || null,
    reload: () => { hotels.reload(); if (hasHotels) rooms.refetch(); },
  };
}
