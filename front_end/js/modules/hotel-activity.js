export function renderActivity(containerId) {
    const container = document.getElementById(containerId);

    const activities = JSON.parse(localStorage.getItem("hotelActivity")) || [];

    container.innerHTML = `
        <div class="hotel-card-header">
            <h2>Recent Activity</h2>
        </div>

        <ul class="hotel-activity-list">
            ${activities.map(a => `
                <li class="hotel-activity-item">
                    <div>
                        <p>${a.text}</p>
                        <span class="hotel-sub-text">${a.time}</span>
                    </div>
                </li>
            `).join("")}
        </ul>
    `;
}