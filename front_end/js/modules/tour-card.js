import { apiGetAndSync } from "../utils/api.js";

const S = (v) => (v == null || v === "") ? "#" : v;
const N = (v) => (v == null || isNaN(Number(v))) ? -1 : Number(v);

export async function renderTour(containerId, currentUser, showAll = false) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const allRequests = await apiGetAndSync("/trips", "tours", []);

    let myRequests = (Array.isArray(allRequests) ? allRequests : []).filter(req =>
        String(req.guideId).trim() === String(currentUser.id).trim() && req.status === "pending"
    );

    const preview = myRequests.slice(0, 3);

    if (myRequests.length === 0) {
        container.innerHTML = `
            <div class="stat-card dark-blue">
                <h2>New Tour Requests</h2>
                <p class='no-data'>No new requests for you today!</p>
            </div>`;
        return;
    }

    container.innerHTML = `
        <div class="stat-card dark-blue">
            <div class="card-header">
                <div>
                    <h2>Upcoming Tour</h2>
                    <p>Tours to be taken by you</p>
                </div>
                <span>
                    <button class="view-all-btn" onclick="toggleViewAll()">
                        ${showAll ? "Show Less" : "View All"}
                    </button>
                </span>
            </div>
            <table class="tour-table">
                <thead>
                    <tr>
                        <th>Customer</th>
                        <th>Destination</th>
                        <th>Date & Time</th>
                        <th>Guests</th>
                        <th>Amount</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${preview.map(req => `
                        <tr>
                            <td class="cust-name">${S(req.customer)}</td>
                            <td>${S(req.destination)}</td>
                            <td>${S(req.dateTime)}</td>
                            <td>${N(req.guests)}</td>
                            <td class="amount-cell">$${N(req.amount)}</td>
                            <td><span class="status-tag ${req.status || ""}">${S(req.status)}</span></td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

window.toggleViewAll = () => {
    window.location.href = "../misleous/tours.html";
};