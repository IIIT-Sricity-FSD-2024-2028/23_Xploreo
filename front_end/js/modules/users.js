import { initialUsersData, initialPartnersData } from '../api/legacyData.js';
import { getUserStylesHTML } from './userStyles.js';
import { getUserStatsHTML } from './userStats.js';
import { getUserTableShellHTML, generateUserRowsHTML } from './userTable.js';
import { generateProfileHTML } from './userProfile.js';
import { getPartnerTableShellHTML, generatePartnerRowsHTML } from './partnerTable.js';

export function initUsers() {
    const mainContainer = document.getElementById("main");
    if (!mainContainer) return;

    // --- 1. PERSISTENT STATE MANAGEMENT ---
    // Load existing data from storage or seed it from the data file
    let platformUsersData = JSON.parse(localStorage.getItem('platformUsers')) || [...initialUsersData];
    let partnersData = JSON.parse(localStorage.getItem('partners')) || [...initialPartnersData];
    
    let currentUserFilter = "All";
    let currentPartnerFilter = "All";

    // Global Sync: Saves state and triggers a UI refresh for dependent components
    const updateEcosystem = () => {
        localStorage.setItem('platformUsers', JSON.stringify(platformUsersData));
        localStorage.setItem('partners', JSON.stringify(partnersData));
        
        // Refresh Stats & Tables
        renderStats();
        renderUserTable();
        renderPartnerTable();
    };

    // --- 2. INITIAL PAGE SHELL ---
    mainContainer.innerHTML = `
        ${getUserStylesHTML()}
        <div class="page-header" style="margin-bottom: 24px;">
            <h1 class="page-title" style="margin: 0; font-size: 28px;">User & Partner Ecosystem</h1>
            <p style="margin: 5px 0 0; font-size: 14px; color: #718096;">Manage access levels and monitor platform health.</p>
        </div>
        
        <div id="stats-container"></div>
        
        <div style="display:grid; grid-template-columns: 1fr 380px; gap:24px; align-items: start; margin-bottom: 32px;">
            <div id="user-table-container">${getUserTableShellHTML()}</div>
            <div id="profile-panel" style="background:#fff; border-radius:20px; border:1px solid #edf2f7; padding:40px 24px; position:sticky; top:24px;"></div>
        </div>

        <div id="partner-table-container">${getPartnerTableShellHTML()}</div>
    `;

    // --- 3. RENDERING FUNCTIONS ---
    function renderStats() {
        const container = document.getElementById("stats-container");
        if (container) container.innerHTML = getUserStatsHTML(platformUsersData, partnersData);
    }

    function renderUserTable() {
        const tbody = document.getElementById("users-tbody");
        if (!tbody) return;

        const filtered = currentUserFilter === "All" 
            ? platformUsersData 
            : platformUsersData.filter(u => u.role === currentUserFilter);
        
        tbody.innerHTML = generateUserRowsHTML(filtered);
    }

    function renderPartnerTable() {
    const tbody = document.getElementById("partners-tbody");
    if (!tbody) return;

    console.log("Current Data:", partnersData); // Check if this is empty!
    console.log("Current Filter:", currentPartnerFilter);

    const filtered = currentPartnerFilter === "All" 
        ? partnersData 
        : partnersData.filter(p => p.type === currentPartnerFilter);
    
    tbody.innerHTML = generatePartnerRowsHTML(filtered);
}

    function updateProfile(id) {
        const panel = document.getElementById("profile-panel");
        const user = platformUsersData.find(u => u.id === id);
        panel.dataset.currentId = id || "";
        panel.innerHTML = generateProfileHTML(user);
    }

    // --- 4. EVENT DELEGATION (The "Logic Hub") ---
    // We attach one listener to the main container to handle all dynamic clicks
    mainContainer.addEventListener('click', (e) => {
        // User Row Selection
        const row = e.target.closest(".user-row");
        if (row && !e.target.closest('.remove-btn') && e.target.tagName !== 'SELECT') {
            document.querySelectorAll(".user-row").forEach(r => r.style.background = "transparent");
            row.style.background = "#f8fafc";
            updateProfile(row.dataset.id);
        }

        // Delete User Action
        const removeBtn = e.target.closest(".remove-btn");
        if (removeBtn) {
            const userId = removeBtn.dataset.id;
            platformUsersData = platformUsersData.filter(u => u.id !== userId);
            if (document.getElementById("profile-panel").dataset.currentId === userId) updateProfile(null);
            updateEcosystem();
        }

        // Filter Buttons
        const userFilter = e.target.closest(".user-filter-btn");
        if (userFilter) {
            document.querySelectorAll(".user-filter-btn").forEach(b => b.classList.remove("active"));
            userFilter.classList.add("active");
            currentUserFilter = userFilter.dataset.filter;
            renderUserTable();
        }

        const partnerFilter = e.target.closest(".partner-filter-btn");
        if (partnerFilter) {
            document.querySelectorAll(".partner-filter-btn").forEach(b => b.classList.remove("active"));
            partnerFilter.classList.add("active");
            currentPartnerFilter = partnerFilter.dataset.filter;
            renderPartnerTable();
        }
    });

    // Handle Dropdown Changes (Status Updates)
    mainContainer.addEventListener('change', (e) => {
        if (e.target.classList.contains("user-status-select")) {
            const userId = e.target.dataset.id;
            const index = platformUsersData.findIndex(u => u.id === userId);
            if (index !== -1) {
                platformUsersData[index].status = e.target.value;
                updateEcosystem();
                if (document.getElementById("profile-panel").dataset.currentId === userId) updateProfile(userId);
            }
        }

        if (e.target.classList.contains("partner-status-select")) {
            const partnerId = e.target.dataset.id;
            const index = partnersData.findIndex(p => p.id === partnerId);
            if (index !== -1) {
                partnersData[index].status = e.target.value;
                updateEcosystem();
            }
        }
    });

    // --- 5. STARTUP ---
    updateEcosystem(); // Initial render and storage sync
    
    // Auto-select the first user for the profile panel
    const firstRow = document.querySelector(".user-row");
    if (firstRow) firstRow.click();
}
