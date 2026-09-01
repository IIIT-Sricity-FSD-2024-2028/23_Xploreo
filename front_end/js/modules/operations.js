import { getOperationsHTML } from './operationsTemplate.js';
import { attachOperationsEvents } from './operationsEvents.js';
import { fetchTravellerHotelBookings, fetchExperienceBookings } from '../api/services.js';

export async function initOperations() {
    const mainContainer = document.getElementById("main");
    if (!mainContainer) return;

    let allBookings = [];
    try {
        const hotelBookings = await fetchTravellerHotelBookings().catch(() => []);
        const experienceBookings = await fetchExperienceBookings().catch(() => []);
        allBookings = [...hotelBookings, ...experienceBookings];
    } catch (e) {
        console.warn("Could not fetch bookings", e);
    }

    // 1. Render the UI
    mainContainer.innerHTML = getOperationsHTML(allBookings);
    
    // 2. Attach Event Listeners
    attachOperationsEvents();
}