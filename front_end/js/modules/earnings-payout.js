import { filterByGuide } from "../utils/filterByGuide.js";
import { monthlyEarnings } from "../utils/monthlyEarnings.js";
import { renderPayoutStats } from "./earnings-payout-stats.js";
import { renderPayoutTable } from "./earnings-payout-table.js";

export function renderPayoutHistory(containerId, currentUser) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const allTrips = JSON.parse(localStorage.getItem("tours")) || [];
    const myTrips = filterByGuide(allTrips, currentUser.id);
    const completedTrips = myTrips.filter(t => t.status === "completed");

    const now = new Date();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Generate payout history from completed tour data
    const payouts = [];
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mo = d.getMonth();
        const yr = d.getFullYear();
        const earnings = monthlyEarnings(myTrips, mo, yr);
        if (earnings > 0) {
            const toursInMonth = completedTrips.filter(t => {
                const td = new Date(t.dateTime.split(" | ")[0]);
                return td.getMonth() === mo && td.getFullYear() === yr;
            });
            payouts.push({
                date: `${monthNames[mo]} 15, ${yr}`,
                ref: `PAY-${yr}-${String(mo + 1).padStart(2, '0')}-001`,
                method: "Bank Transfer",
                tours: toursInMonth.length,
                amount: earnings,
                status: "Completed"
            });
        }
    }

    container.innerHTML = `
        ${renderPayoutStats(payouts)}
        ${renderPayoutTable(payouts)}
    `;
}
