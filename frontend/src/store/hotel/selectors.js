export const selectProperties = (hotels = [], rooms = []) =>
  hotels.map((hotel) => ({ ...hotel, rooms: rooms.filter((room) => room.hotelId === hotel.id) }));

export const selectRooms = (hotels = [], rooms = []) => {
  const names = new Map(hotels.map((hotel) => [hotel.id, hotel.name]));
  return rooms.map((room) => ({ ...room, hotelName: names.get(room.hotelId) }));
};
