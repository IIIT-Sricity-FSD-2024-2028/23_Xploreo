import { partners } from "../api/legacyData.js";

export function renderPartners(containerId) {
    const container = document.getElementById(containerId);

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

                    const initials = p.name
                        .split(" ")
                        .map(word => word[0])
                        .join("")
                        .slice(0, 2);

                    return `
                        <div class="table-row">

                            <!-- Partner Info -->
                            <div class="partner-cell">
                                <div class="avatar">${initials}</div>
                                <div>
                                    <p class="partner-name">${p.name}</p>
                                    <p class="partner-meta">${p.location}</p>
                                </div>
                            </div>

                            <!-- Bookings -->
                            <span>${p.bookings.toLocaleString()}</span>

                            <!-- Revenue -->
                            <span class="revenue">
                                ₹${(p.revenue / 100000).toFixed(1)}L
                            </span>

                            <!-- Growth -->
                            <span class="growth">+${p.growth}%</span>

                            <!-- Rating -->
                            <span class="rating">⭐ ${p.rating}</span>

                        </div>
                    `;
                }).join("")}

            </div>

        </div>
    `;
}
