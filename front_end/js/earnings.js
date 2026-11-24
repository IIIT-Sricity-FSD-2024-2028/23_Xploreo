import { renderinternalnavbar } from "./modules/internal-navbar.js";
import { renderEarningsOverview } from "./modules/earnings-overview.js";
import { renderPayoutHistory } from "./modules/earnings-payout.js";

let currentActiveTab = "overview";

export function renderEarningsPage(containerId, currentUser) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Build page skeleton with header, internal navbar, and content area
    container.innerHTML = `
        <div class="earn-page">
            <div class="earn-header">
                <h1 class="earn-page-title">Earnings Management</h1>
                <p class="earn-page-subtitle">Track your income and manage payouts</p>
            </div>
            <div id="earnings-internal-navbar" class="internal-navbar"></div>
            <div id="earnings-content"></div>
        </div>
    `;

    // Render internal navbar
    renderinternalnavbar("earnings-internal-navbar", currentActiveTab);

    // Render active tab content
    if (currentActiveTab === "overview") {
        renderEarningsOverview("earnings-content", currentUser);
    } else if (currentActiveTab === "payout-history") {
        renderPayoutHistory("earnings-content", currentUser);
    }
}

// Override switchTab — earnings.js loads after tours.js,
// so this replaces the tours version. Both check the page.
const _origSwitchTab = window.switchTab;
window.switchTab = (status) => {
    const page = window.location.pathname.split("/").pop();
    if (page === "earnings.html") {
        currentActiveTab = status;
        const user = JSON.parse(localStorage.getItem("currentUser")) || { id: "00001" };
        renderEarningsPage("main", user);
    } else if (_origSwitchTab) {
        _origSwitchTab(status);
    }
};
