import { renderStats } from "./stat-cards.js";
import { renderRooms } from "./hotel-rooms.js";
import { renderBookings } from "./hotel-bookings.js";
import { renderHotelReviews } from "./hotel-reviews.js";
import { renderActivity } from "./hotel-activity.js";

export function renderHotelDashboard(user) {
    renderStats("hotel-stats", user);  
    renderRooms("rooms-section");
    renderBookings("bookings-section");
}