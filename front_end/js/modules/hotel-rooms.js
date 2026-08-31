import { fetchPartnerHotels } from "../api/services.js";

export async function renderRooms(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        const hotels = await fetchPartnerHotels().catch(() => []);
        let totalRooms = 0;
        let availableRooms = 0;

        hotels.forEach(h => {
            if (h.status === "active" || h.status === "ACTIVE") {
                totalRooms += (Number(h.totalRooms) || 10);
                availableRooms += (Number(h.availableRooms) ?? Number(h.totalRooms) ?? 10);
            }
        });

        const occupiedRooms = totalRooms - availableRooms;

        container.innerHTML = `
            <div class="hotel-card-header">
                <h2>Rooms & Occupancy</h2>
            </div>

            <div class="hotel-room-grid">

                <div class="hotel-room-box">
                    <img src="../components/ui/system.png" class="hotel-card-icon"/>
                    <p>Total Rooms</p>
                    <h3>${totalRooms}</h3>
                </div>

                <div class="hotel-room-box">
                    <img src="../components/ui/dashboard.png" class="hotel-card-icon"/>
                    <p>Available</p>
                    <h3 class="green">${availableRooms}</h3>
                </div>

                <div class="hotel-room-box">
                    <img src="../components/ui/operations.png" class="hotel-card-icon"/>
                    <p>Occupied</p>
                    <h3 class="blue">${occupiedRooms}</h3>
                </div>

            </div>
        `;
    } catch (err) {
        console.error("Failed to load rooms", err);
    }
}