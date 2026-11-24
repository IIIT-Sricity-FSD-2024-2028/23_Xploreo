import { useMemo } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
import { useAuth } from '@/context/AuthContext.jsx';
import { usePartnerHotelsQuery, usePartnerRoomsQuery } from './hotelApi.js';
import { selectProperties, selectRooms } from './selectors.js';

export function usePartnerHotels() {
  const { user } = useAuth();
  const accountId = user?.role === 'hotel' ? String(user.id ?? user.userId ?? user.username) : null;
  const query = usePartnerHotelsQuery(accountId ?? skipToken);
  return {
    accountId,
    data: query.data ?? null,
    loading: query.isLoading || (!query.data && query.isFetching),
    error: query.error ?? null,
    reload: query.refetch,
  };
}

export function usePartnerCatalog() {
  const hotels = usePartnerHotels();
  const hotelIds = useMemo(() => hotels.data?.map((hotel) => hotel.id) ?? null, [hotels.data]);
  const rooms = usePartnerRoomsQuery(hotelIds ? { accountId: hotels.accountId, hotelIds } : skipToken);
  const properties = useMemo(
    () => hotels.data && rooms.data ? selectProperties(hotels.data, rooms.data) : null,
    [hotels.data, rooms.data],
  );
  const services = useMemo(
    () => hotels.data && rooms.data ? selectRooms(hotels.data, rooms.data) : null,
    [hotels.data, rooms.data],
  );
  return {
    accountId: hotels.accountId,
    hotels: hotels.data,
    properties,
    rooms: services,
    loading: hotels.loading || (!rooms.data && (rooms.isLoading || rooms.isFetching)),
    error: hotels.error || rooms.error || null,
    reload: () => { hotels.reload(); if (hotelIds) rooms.refetch(); },
  };
}
