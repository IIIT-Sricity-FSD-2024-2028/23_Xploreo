import { filterByGuide } from "../utils/filterByGuide.js";
import { renderOverviewToolbar } from "./earnings-overview-toolbar.js";
import { renderOverviewStats } from "./earnings-overview-stats.js";
import { renderOverviewCharts } from "./earnings-overview-charts.js";
import { renderOverviewPending } from "./earnings-overview-pending.js";
import { renderOverviewTransactions } from "./earnings-overview-transactions.js";

export function renderEarningsOverview(containerId, currentUser) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const allTrips = JSON.parse(localStorage.getItem("tours")) || [];
    const myTrips = filterByGuide(allTrips, currentUser.id);
    const completedTrips = myTrips.filter(t => t.status === "completed");

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    container.innerHTML = `
        ${renderOverviewToolbar(currentYear)}
        ${renderOverviewStats(myTrips, completedTrips, currentMonth, currentYear)}
        ${renderOverviewCharts(myTrips, completedTrips, currentMonth, currentYear)}
        ${renderOverviewPending(myTrips, currentMonth, currentYear)}
        ${renderOverviewTransactions(completedTrips, currentUser)}
    `;
}
