import { avgrating }       from "../utils/avgrating.js";
import { countreview }     from "../utils/countreviews.js";
import { totalAmount }     from "../utils/totalamount.js";
import { upcomingtripcount } from "../utils/upcomingtripcount.js";
import { filterByGuide }   from "../utils/filterByGuide.js";
import { monthlyEarnings } from "../utils/monthlyEarnings.js";
import { formatCurrency }  from "../utils/formatCurrency.js";
import { apiGetAndSync }   from "../utils/api.js";

const N = (v) => (v == null || isNaN(Number(v))) ? -1 : Number(v);

export async function renderStats(containerId, currentUser) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Fetch live data; sync to localStorage so other modules stay up-to-date
    const [allReviews, allTrips] = await Promise.all([
        apiGetAndSync("/reviews", "reviews", []),
        apiGetAndSync("/trips",   "tours",   [])
    ]);

    const myReviews = filterByGuide(allReviews, currentUser.id);
    const myTrips   = filterByGuide(allTrips,   currentUser.id);

    const upcomingTrips = myTrips.filter(t => t.status === "pending");
    const ongoingTrips  = myTrips.filter(t => t.status === "ongoing");

    const now = new Date();
    const currentMonthEarnings = monthlyEarnings(myTrips, now.getMonth(), now.getFullYear());

    let stats;

    if (currentUser.role === "guide") {
        stats = [
            { label: "Today's Tours",     value: upcomingtripcount(ongoingTrips)        ?? -1, icon: "../../components/ui/todaytours.svg",    color: "blue" },
            { label: "Upcoming Tours",    value: upcomingtripcount(upcomingTrips)       ?? -1, icon: "../../components/ui/upcomingtours.svg",  color: "light-green" },
            { label: "Monthly Earnings",  value: formatCurrency(N(currentMonthEarnings)) ,     icon: "../../components/ui/montlyearning.svg",  color: "dark-green" },
            { label: "Total Earnings",    value: formatCurrency(N(totalAmount(myTrips))),       icon: "../../components/ui/totalearnings.svg",  color: "red" },
            { label: "Average Rating",    value: avgrating(myReviews)                   ?? -1, icon: "../../components/ui/avgrating.svg",      color: "orange" },
            { label: "Recent Reviews",    value: countreview(myReviews)                 ?? -1, icon: "../../components/ui/recentreview.svg",   color: "violet" }
        ];
    } else if (currentUser.role === "hotel") {
        stats = [
            { label: "Total Bookings",      value: -1,  icon: "../../components/ui/todaytours.svg",   color: "blue" },
            { label: "Revenue This Month",  value: "#", icon: "../../components/ui/montlyearning.svg", color: "dark-green" },
            { label: "Upcoming Bookings",   value: -1,  icon: "../../components/ui/upcomingtours.svg", color: "light-green" },
            { label: "Average Rating",      value: -1,  icon: "../../components/ui/avgrating.svg",     color: "orange" }
        ];
    } else {
        stats = [];
    }

    container.innerHTML = stats.map(stat => `
        <div class="stat-card ${stat.color}">
            ${stat.icon ? `<div class="card-icon"><img src="${stat.icon}" alt="icon"></div>` : ""}
            <p class="stat-label">${stat.label}</p>
            <h2 class="stat-value">${stat.value}</h2>
            <p class="stat-subtext ${stat.subClass || ""}">${stat.subtext || ""}</p>
        </div>
    `).join("");
}
