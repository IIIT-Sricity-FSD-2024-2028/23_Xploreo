import { apiGetAndSync } from "../utils/api.js";

const N = (v) => (v == null || isNaN(Number(v))) ? -1 : Number(v);
const S = (v) => (v == null || v === "") ? "#" : v;

export async function renderPartners(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const partners = await apiGetAndSync("/partners", "partners", []);

    if (!Array.isArray(partners) || partners.length === 0) {
        container.innerHTML = `<div class="partners-card"><p style="text-align:center;padding:32px;color:#9CA3AF;">No partner data available.</p></div>`;
        return;
    }

    container.innerHTML = `
        <div class="partners-card">
            <div class="partners-header">
                <div>
                    <h3>Top Performing Partners</h3>
                    <p>Sorted by total transaction volume and customer satisfaction index</p>
                </div>
            </div>
            <div class="partners-table">
                <div class="table-head">
                    <span>PARTNER</span>
                    <span>BOOKINGS</span>
                    <span>REVENUE</span>
                    <span>GROWTH</span>
                    <span>RATING</span>
                </div>
                ${partners.map(p => {
                    const name     = S(p.name);
                    const location = S(p.location);
                    const bookings = N(p.bookings);
                    const revenue  = N(p.revenue);
                    const growth   = N(p.growth);
                    const rating   = N(p.rating);

                    const initials = name === "#"
                        ? "?"
                        : name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

                    return `
                        <div class="table-row">
                            <div class="partner-cell">
                                <div class="avatar">${initials}</div>
                                <div>
                                    <p class="partner-name">${name}</p>
                                    <p class="partner-meta">${location}</p>
                                </div>
                            </div>
                            <span>${bookings === -1 ? "-1" : bookings.toLocaleString()}</span>
                            <span class="revenue">${revenue === -1 ? "-1" : "₹" + (revenue / 100000).toFixed(1) + "L"}</span>
                            <span class="growth">${growth === -1 ? "-1" : "+" + growth + "%"}</span>
                            <span class="rating">⭐ ${rating === -1 ? "-1" : rating}</span>
                        </div>
                    `;
                }).join("")}
            </div>
        </div>
    `;
}
