export function renderRooms(containerId) {
    const container = document.getElementById(containerId);

    container.innerHTML = `
        <div class="hotel-card-header">
            <h2>Rooms & Occupancy</h2>
        </div>

        <div class="hotel-room-grid">

            <div class="hotel-room-box">
                <img src="../../components/ui/system.png" class="hotel-card-icon"/>
                <p>Total Rooms</p>
                <h3>50</h3>
            </div>

            <div class="hotel-room-box">
                <img src="../../components/ui/dashboard.png" class="hotel-card-icon"/>
                <p>Available</p>
                <h3 class="green">11</h3>
            </div>

            <div class="hotel-room-box">
                <img src="../../components/ui/operations.png" class="hotel-card-icon"/>
                <p>Occupied</p>
                <h3 class="blue">39</h3>
            </div>

        </div>
    `;
}