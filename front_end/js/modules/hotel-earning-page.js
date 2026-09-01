import { fetchPartnerHotelBookings } from "../api/services.js?v=hotel-workflow-2";

export async function renderHotelEarningPage() {
    let bookings = [];
    try {
        bookings = await fetchPartnerHotelBookings();
    } catch (error) {
        console.error("Failed to load bookings for earnings:", error);
    }

    renderEarningStats("earning-stats", bookings);
    renderEarningPerformance("earning-performance", bookings);
    renderEarningRevenue("earning-revenue", bookings);
    renderEarningRefund("earning-refund", bookings);
    renderEarningTransactions("earning-transactions", bookings);
    renderEarningPayout("earning-payout", bookings);
}

/* =========================
   STATS
========================= */
function renderEarningStats(containerId, bookings) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const getPartnerBase = (b) => {
        const amt = Number(b.totalAmount || 0);
        return amt > 14 ? amt - 14 : 0;
    };
    const getPartnerNet = (b) => getPartnerBase(b) * 0.96;

    const totalRevenue = bookings
        .filter(b => b.status !== "CANCELLED" && b.status !== "REFUNDED")
        .reduce((sum, b) => sum + getPartnerNet(b), 0);

    const refunded = bookings
        .filter(b => b.status === "CANCELLED" || b.status === "REFUNDED")
        .reduce((sum, b) => sum + getPartnerNet(b), 0);

    const totalAdminCut = bookings
        .filter(b => b.status !== "CANCELLED" && b.status !== "REFUNDED")
        .reduce((sum, b) => sum + (getPartnerBase(b) * 0.04), 0);

    const validBookings = bookings.filter(b => b.status !== "CANCELLED" && b.status !== "REFUNDED");
    const avgBooking = validBookings.length ? (totalRevenue / validBookings.length) : 0;

    // Real calculation for "this month"
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const thisMonth = validBookings
        .filter(b => {
            if (!b.checkIn) return false;
            const d = new Date(b.checkIn);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((sum, b) => sum + getPartnerBase(b), 0);

    const stats = [
        {
            label: "Total Revenue",
            value: `₹${totalRevenue.toLocaleString()}`,
            icon: "../components/ui/montlyearning.svg",
            color: "blue",
            subtext: bookings.length ? "Based on real data" : "No bookings yet",
            subClass: "positive"
        },
        {
            label: "Earnings This Month",
            value: `₹${thisMonth.toLocaleString()}`,
            icon: "../components/ui/upcomingtours.svg",
            color: "dark-green",
            subtext: "Est. from total",
            subClass: "positive"
        },
        {
            label: "Refunded Payments",
            value: `₹${refunded.toLocaleString()}`,
            icon: "../components/ui/recentreview.svg",
            color: "violet",
            subtext: refunded === 0 ? "Perfect score!" : "Needs attention",
            subClass: refunded === 0 ? "positive" : "negative"
        },
        {
            label: "Avg Booking Value",
            value: `₹${Math.round(avgBooking).toLocaleString()}`,
            icon: "../components/ui/avgrating.svg",
            color: "orange",
            subtext: validBookings.length + " valid bookings",
            subClass: "positive"
        },
        {
            label: "Super Admin Cut (4%)",
            value: `₹${totalAdminCut.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            icon: "../components/ui/finance.png",
            color: "blue",
            subtext: "Total platform commission",
            subClass: "negative"
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
function renderEarningPerformance(containerId, bookings) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const refundRate = bookings.length ? (bookings.filter(b => b.status === "CANCELLED" || b.status === "REFUNDED").length / bookings.length * 100).toFixed(1) : 0;

    let topRoom = "N/A";
    let highestDay = "N/A";
    let totalBookingsStr = "0";

    if (bookings.length) {
        // Top Room
        const roomCounts = {};
        bookings.forEach(b => {
            if(b.status !== "CANCELLED" && b.status !== "REFUNDED") {
                const rt = b.roomType || "Standard";
                roomCounts[rt] = (roomCounts[rt] || 0) + 1;
            }
        });
        const sortedRooms = Object.entries(roomCounts).sort((a,b) => b[1]-a[1]);
        if(sortedRooms.length) topRoom = sortedRooms[0][0];

        // Highest Day
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const dayCounts = {};
        bookings.forEach(b => {
            if(b.checkIn) {
                const d = new Date(b.checkIn).getDay();
                if(!isNaN(d)) {
                    dayCounts[d] = (dayCounts[d] || 0) + 1;
                }
            }
        });
        const sortedDays = Object.entries(dayCounts).sort((a,b) => b[1]-a[1]);
        if(sortedDays.length) highestDay = days[sortedDays[0][0]];
        
        totalBookingsStr = bookings.length.toString();
    }

    const data = [
        { title: topRoom, subtitle: "Top Performing Room", icon: "🏆" },
        { title: highestDay, subtitle: "Highest Booking Day", icon: "📅" },
        { title: totalBookingsStr, subtitle: "Total Bookings", icon: "📊" },
        { title: `${refundRate}%`, subtitle: "Refund Rate", icon: "📉" }
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
function renderEarningRevenue(containerId, bookings) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const getPartnerNet = (b) => {
        const amt = Number(b.totalAmount || 0);
        const base = amt > 14 ? amt - 14 : 0;
        return base * 0.96;
    };

    const valid = bookings.filter(b => b.status !== "CANCELLED");
    const total = valid.reduce((sum, b) => sum + getPartnerNet(b), 0);
    
    // Group by roomType
    const roomTotals = {};
    valid.forEach(b => {
        const rt = b.roomType || "Unknown Room";
        roomTotals[rt] = (roomTotals[rt] || 0) + getPartnerNet(b);
    });

    const colors = ["blue", "green", "orange", "violet"];
    
    const data = Object.keys(roomTotals).map((room, i) => {
        const val = roomTotals[room];
        return {
            name: room,
            value: val,
            percent: total ? Math.round((val / total) * 100) : 0,
            color: colors[i % colors.length]
        };
    }).sort((a,b) => b.value - a.value).slice(0, 4);

    if (data.length === 0) {
        el.innerHTML = `<h3>Revenue Sources</h3><p>No revenue data available yet.</p>`;
        return;
    }

    el.innerHTML = `
        <h3>Revenue Sources</h3>
        ${data.map(r => `
            <div class="revenue-row">
                <div class="revenue-top">
                    <span>${r.name}</span>
                    <span>₹${r.value.toLocaleString()}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill ${r.color}" style="width:${r.percent}%"></div>
                </div>
                <span class="percent">${r.percent}%</span>
            </div>
        `).join("")}

        <div class="revenue-total">
            <strong>Total Revenue</strong>
            <span>₹${total.toLocaleString()}</span>
        </div>
    `;
}

/* =========================
   REFUND
========================= */
function renderEarningRefund(containerId, bookings) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const getPartnerNet = (b) => {
        const amt = Number(b.totalAmount || 0);
        const base = amt > 14 ? amt - 14 : 0;
        return base * 0.96;
    };

    const totalRevenue = bookings.reduce((sum, b) => sum + getPartnerNet(b), 0);
    const refunded = bookings
        .filter(b => b.status === "CANCELLED" || b.status === "REFUNDED")
        .reduce((sum, b) => sum + getPartnerNet(b), 0);

    const percent = totalRevenue ? ((refunded / totalRevenue) * 100).toFixed(1) : 0;

    el.innerHTML = `
        <h3>Refund Breakdown</h3>
        <p class="sub-text">Total Refunded</p>
        <h2 class="text-danger">₹${refunded.toLocaleString()}</h2>

        <p class="sub-text">Percentage of Total Volume</p>
        <h3>${percent}%</h3>

        <div class="progress-bar">
            <div class="progress-fill red" style="width:${percent}%"></div>
        </div>
    `;
}

/* =========================
   TRANSACTIONS
========================= */
function renderEarningTransactions(containerId, bookings) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const recent = bookings.slice(-5).reverse();

    if (recent.length === 0) {
        el.innerHTML = `<h3>Recent Transactions</h3><p>No recent transactions.</p>`;
        return;
    }

    el.innerHTML = `
        <h3>Recent Transactions</h3>
        ${recent.map(b => {
            const isCancelled = b.status === "CANCELLED" || b.status === "REFUNDED";
            const badgeClass = isCancelled ? "badge-red" : "badge-green";
            const amt = Number(b.totalAmount || 0);
            const partnerBase = amt > 14 ? amt - 14 : 0;
            const superAdminCut = partnerBase * 0.04;
            const partnerNet = partnerBase - superAdminCut;
            return `
            <div class="hotel-booking-row">
                <div>
                    <strong>${b.guestName || 'Guest'}</strong><br/>
                    <span class="hotel-sub-text">${b.roomType || 'Room'}</span>
                </div>
                <div style="text-align: right;">
                    <strong style="display: block;">₹${partnerNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    <small style="color: #64748b; font-size: 11px;">Admin Cut (4%): ₹${superAdminCut.toFixed(2)}</small>
                </div>
                <div>
                    <span class="hotel-status ${badgeClass}" style="padding:4px 10px; font-size:11px; border-radius:12px; background:${isCancelled?'#fee2e2':'#dcfce7'}; color:${isCancelled?'#dc2626':'#16a34a'}">
                        ${b.status || 'COMPLETED'}
                    </span>
                </div>
            </div>
            `;
        }).join("")}
    `;
}

/* =========================
   PAYOUT
========================= */
function renderEarningPayout(containerId, bookings) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const pending = bookings
        .filter(b => b.status === "CONFIRMED")
        .reduce((sum, b) => {
            const amt = Number(b.totalAmount || 0);
            const base = amt > 14 ? amt - 14 : 0;
            return sum + (base * 0.96);
        }, 0);

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + (7 - nextDate.getDay()) % 7 + 1); // Next Monday

    el.innerHTML = `
        <h3>Payout Information</h3>
        <p>Next payout: ${nextDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        <h2>₹${pending.toLocaleString()}</h2>
        <p class="hotel-sub-text">Pending confirmed bookings amount</p>
    `;
}