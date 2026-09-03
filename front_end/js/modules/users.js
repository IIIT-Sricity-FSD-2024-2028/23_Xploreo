import { renderGuideCrudPage, renderTravellerCrudPage, renderHotelCrudPage, renderExperienceCrudPage } from '../moduleCrudPages.js';

export function initUsers(user = {}) {
    const mainContainer = document.getElementById("main");
    if (!mainContainer) return;

    // All allowed roles see all four tabs
    const role = String(user.role || '').toLowerCase().replace(/_/g, '');
    const isTechAdmin = role === 'techadmin';
    const showGuides = true;
    const showTravellers = true;

    // Build tab buttons based on permissions
    const tabButtons = [
        ...(showGuides     ? [`<button class="eco-tab-btn" data-tab="guides"      style="padding: 12px 24px; background: none; border: none; cursor: pointer; font-size: 16px; font-weight: 600; color: #718096;">Guides</button>`] : []),
        ...(showTravellers ? [`<button class="eco-tab-btn" data-tab="travelers"   style="padding: 12px 24px; background: none; border: none; cursor: pointer; font-size: 16px; font-weight: 600; color: #718096;">Travelers</button>`] : []),
        `<button class="eco-tab-btn" data-tab="hotels"      style="padding: 12px 24px; background: none; border: none; cursor: pointer; font-size: 16px; font-weight: 600; color: #718096;">Hotel Partners</button>`,
        `<button class="eco-tab-btn" data-tab="experiences" style="padding: 12px 24px; background: none; border: none; cursor: pointer; font-size: 16px; font-weight: 600; color: #718096;">Experience Partners</button>`,
    ].join('');

    // --- INITIAL PAGE SHELL ---
    mainContainer.innerHTML = `
        <div class="page-header" style="margin-bottom: 24px; padding: 24px;">
            <h1 class="page-title" style="margin: 0; font-size: 28px;">Users &amp; Partners Ecosystem</h1>
            <p style="margin: 5px 0 0; font-size: 14px; color: #718096;">Manage access levels, roles, and profiles.</p>
        </div>
        
        <div style="padding: 0 24px;">
            <div style="display: flex; gap: 16px; border-bottom: 2px solid #edf2f7; margin-bottom: 24px;">
                ${tabButtons}
            </div>
            
            <div id="eco-content-area"></div>
        </div>
    `;

    const contentArea = document.getElementById("eco-content-area");
    

    function switchTab(tabName) {
        // Update active tab styles
        document.querySelectorAll('.eco-tab-btn').forEach(btn => {
            if (btn.dataset.tab === tabName) {
                btn.style.color = "#3182ce";
                btn.style.borderBottom = "2px solid #3182ce";
                btn.classList.add("active");
            } else {
                btn.style.color = "#718096";
                btn.style.borderBottom = "none";
                btn.classList.remove("active");
            }
        });

        contentArea.innerHTML = ""; // Clear current content
        
        if (tabName === "guides" && showGuides) {
            renderGuideCrudPage("eco-content-area", user);
        } else if (tabName === "travelers" && showTravellers) {
            renderTravellerCrudPage("eco-content-area");
        } else if (tabName === "hotels") {
            renderHotelCrudPage("eco-content-area");
        } else if (tabName === "experiences") {
            renderExperienceCrudPage("eco-content-area");
        }
    }

    // Attach click listeners to tabs
    document.querySelectorAll('.eco-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchTab(e.currentTarget.dataset.tab);
        });
    });

    // Default: techadmin starts on Hotels tab, others start on Guides
    switchTab(isTechAdmin ? "hotels" : "guides");
}
