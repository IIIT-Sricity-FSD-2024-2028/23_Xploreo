export function renderHotelEarningPage() {

    renderEarningStats("earning-stats");

    renderEarningPerformance("earning-performance");
    renderEarningRevenue("earning-revenue");
    renderEarningRefund("earning-refund");
    renderEarningTransactions("earning-transactions");
    renderEarningPayout("earning-payout");
}


/* =========================
   STATS (NO IMPORT NOW)
========================= */
function renderEarningStats(containerId) {

    const container = document.getElementById(containerId);

    const stats = [
        {
            label: "Total Revenue",
            value: "$48,250",
            icon: "../../components/ui/montlyearning.svg",
            color: "blue",
            subtext: "+12.5%",
            subClass: "positive"
        },
        {
            label: "Earnings This Month",
            value: "$14,800",
            icon: "../../components/ui/upcomingtours.svg",
            color: "dark-green",
            subtext: "+8.2%",
            subClass: "positive"
        },
        {
            label: "Refunded Payments",
            value: "$1,240",
            icon: "../../components/ui/recentreview.svg",
            color: "violet",
            subtext: "-2.1%",
            subClass: "negative"
        },
        {
            label: "Avg Booking Value",
            value: "$185",
            icon: "../../components/ui/avgrating.svg",
            color: "orange",
            subtext: "+5.4%",
            subClass: "positive"
        }
    ];

    container.innerHTML = stats.map(stat => `
        <div class="stat-card ${stat.color}">

            ${stat.icon ? `
            <div class="icon-container">
                <img src="${stat.icon}" alt="icon" width="20">
            </div>
            ` : ""}

            <p class="stat-label">${stat.label}</p>

            <h2 class="stat-value">${stat.value}</h2>

            <p class="stat-subtext ${stat.subClass || ""}">
                ${stat.subtext || ""}
            </p>

        </div>
    `).join('');
}

/* =========================
   PERFORMANCE
========================= */
function renderEarningPerformance(containerId) {

    const el = document.getElementById(containerId);

    const data = [
        { title: "Deluxe Room", subtitle: "Top Performing Room", icon: "🏆" },
        { title: "Saturday", subtitle: "Highest Booking Day", icon: "📅" },
        { title: "78%", subtitle: "Occupancy Rate", icon: "🏠" },
        { title: "2.6%", subtitle: "Refund Rate", icon: "📉" }
    ];

    el.innerHTML = `
        <h3>Performance Insights</h3>

        <div class="hotel-stats-grid">
            ${data.map(d => `
                <div class="hotel-content-card perf-card">
                    <div class="perf-icon">${d.icon}</div>
                    <h4>${d.title}</h4>
                    <p>${d.subtitle}</p>
                </div>
            `).join("")}
        </div>
    `;
}


/* =========================
   REVENUE
========================= */
function renderEarningRevenue(containerId) {

    const el = document.getElementById(containerId);

    const data = [
        { name: "Standard Room", value: 28500, percent: 59, color: "blue" },
        { name: "Deluxe Room", value: 19750, percent: 41, color: "green" }
    ];

    const total = data.reduce((sum, r) => sum + r.value, 0);

    el.innerHTML = `
        <h3>Revenue Sources</h3>

        ${data.map(r => `
            <div class="revenue-row">

                <div class="revenue-top">
                    <span>${r.name}</span>
                    <span>$${r.value.toLocaleString()}</span>
                </div>

                <div class="progress-bar">
                    <div class="progress-fill ${r.color}" style="width:${r.percent}%"></div>
                </div>

                <span class="percent">${r.percent}%</span>

            </div>
        `).join("")}

        <div class="revenue-total">
            <strong>Total Revenue</strong>
            <span>$${total.toLocaleString()}</span>
        </div>
    `;
}


/* =========================
   REFUND
========================= */
function renderEarningRefund(containerId) {

    const el = document.getElementById(containerId);

    el.innerHTML = `
        <h3>Refund Breakdown</h3>

        <p class="sub-text">Total Refunded</p>
        <h2 class="text-danger">$1,240</h2>

        <p class="sub-text">Percentage of Revenue</p>
        <h3>2.6%</h3>

        <div class="progress-bar">
            <div class="progress-fill red" style="width:2.6%"></div>
        </div>

        <div class="refund-note">
            Low Refund Rate <br/>
            <span>Your refund rate is below industry average</span>
        </div>
    `;
}


/* =========================
   TRANSACTIONS (DATA DRIVEN)
========================= */
function renderEarningTransactions(containerId) {

    const el = document.getElementById(containerId);

    const bookings = JSON.parse(localStorage.getItem("hotelBookings")) || [];

    el.innerHTML = `
        <h3>Recent Transactions</h3>

        ${bookings.map(b => `
            <div class="hotel-booking-row">

                <div>
                    <strong>${b.customer}</strong><br/>
                    <span class="hotel-sub-text">${b.room}</span>
                </div>

                <div>$${b.amount || 0}</div>

                <div>
                    <span class="${b.status === "cancelled" ? "badge-red" : "badge-green"}">
                        ${b.status}
                    </span>
                </div>

            </div>
        `).join("")}
    `;
}


/* =========================
   PAYOUT
========================= */
function renderEarningPayout(containerId) {

    const el = document.getElementById(containerId);

    el.innerHTML = `
        <h3>Payout Information</h3>
        <p>Next payout: April 16, 2026</p>
        <h2>$128,450</h2>
    `;
}