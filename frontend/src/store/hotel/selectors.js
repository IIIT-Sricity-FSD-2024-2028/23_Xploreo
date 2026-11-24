export const selectProperties = (hotels = [], rooms = []) =>
  hotels.map((hotel) => ({ ...hotel, rooms: rooms.filter((room) => room.hotelId === hotel.id) }));

export const selectRooms = (hotels = [], rooms = []) => {
  const names = new Map(hotels.map((hotel) => [hotel.id, hotel.name]));
  return rooms.map((room) => ({ ...room, hotelName: names.get(room.hotelId) }));
};

export function selectReviewSummary(reviews) {
  const total = reviews?.length ?? 0;
  let ratingSum = 0;
  let fiveStar = 0;
  for (const { rating } of reviews ?? []) {
    ratingSum += rating;
    if (rating === 5) fiveStar += 1;
  }
  return { total, average: total ? ratingSum / total : null, fiveStar };
}
