import { renderNavbar } from "../components/layout/navbar.js";
import { getProfile } from "../components/layout/profile.js";
import { renderPageContent } from "./renderpages.js";
import { initLogin } from "./login.js";
import { initSignup } from "./signup.js";
import { getCurrentUser } from "./api/session.js";
import { apiGet } from "./api/http.js";
import { renderLandingNavbar } from "../components/layout/navbar_landing.js";

async function initApp() {
  try {
    const path = window.location.pathname.split("/").pop() || "index.html";
    if (path === "login.html") {
      renderLandingNavbar();
      console.log("Initializing login page...");
      initLogin();
      return;
    }

    if (path === "signup.html") {
      renderLandingNavbar();
      initSignup();
      return;
    }

    if (path === "index.html") {
      renderLandingNavbar();
      return;
    }

    let currentUser = getCurrentUser();

    if (!currentUser) {
      window.location.href = "./login.html";
      return;
    }

    // Attempt to sync the latest user status from the API
    try {
        const role = String(currentUser.role).toLowerCase().replace(/_/g, '');
        const actorId = currentUser.id || currentUser.userId;
        let endpoint = '';
        if (role === 'guide') endpoint = `/guide/${actorId}`;
        else if (role === 'traveller') endpoint = `/traveller/${actorId}`;
        else if (role === 'hotel') endpoint = `/hotels/${actorId}`;
        else if (role === 'experience') endpoint = `/experiences/${actorId}`;
        else if (role === 'superadmin') endpoint = `/superadmin/${actorId}`;
        else if (role === 'techadmin' || role === 'tech_admin') endpoint = `/auth/users/${actorId}`;
        
        if (endpoint) {
            const latestData = await apiGet(endpoint);
            if (latestData && (latestData.status || latestData.isDeleted !== undefined || latestData.isHighLevelAdmin !== undefined)) {
                currentUser.status = latestData.status || currentUser.status;
                currentUser.isDeleted = latestData.isDeleted || currentUser.isDeleted;
                if (latestData.isHighLevelAdmin !== undefined) {
                    currentUser.isHighLevelAdmin = Boolean(latestData.isHighLevelAdmin);
                }
                localStorage.setItem("currentUser", JSON.stringify(currentUser));
            }
        }
    } catch (e) {
        console.warn("Could not sync live user status", e);
    }

    const isRestrictedOrInactive =
        currentUser.status === 'restricted' ||
        currentUser.status === 'inactive' ||
        currentUser.status === 'deactivated' ||
        Boolean(currentUser.isDeleted);

    if (isRestrictedOrInactive) {
        const isSupportPage = path.includes("support");
        
        document.body.insertAdjacentHTML('afterbegin', `
            <div id="restriction-banner" style="background-color: #ef4444; color: white; padding: 12px 16px; text-align: center; font-weight: bold; position: fixed; top: 0; left: 0; right: 0; z-index: 999999; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4); display: flex; align-items: center; justify-content: center; gap: 8px;">
                <span style="font-size: 16px;">⚠️</span>
                <span>ADMIN RESTRICTED / DEACTIVATED YOU. You are unable to perform actions.</span>
                ${!isSupportPage ? `Please <a href="./support.html" style="color: white; text-decoration: underline; margin-left: 6px; font-weight: 700;">raise a support ticket</a>.` : `<span style="margin-left: 6px;">You may submit a ticket below.</span>`}
            </div>
        `);
        
        if (!isSupportPage) {
            document.body.insertAdjacentHTML('beforeend', `
                <style>
                    /* Push body down to accommodate fixed banner */
                    body {
                        padding-top: 48px !important;
                        cursor: not-allowed !important;
                    }

                    /* Restricted cursor on all elements */
                    body * {
                        cursor: not-allowed !important;
                    }

                    /* Allow interaction with banner link */
                    #restriction-banner,
                    #restriction-banner * {
                        cursor: default !important;
                    }
                    #restriction-banner a {
                        cursor: pointer !important;
                        pointer-events: auto !important;
                    }

                    /* Allow interaction with profile/logout */
                    .navbar .navbar-right,
                    .navbar .navbar-right *,
                    .profile,
                    .profile *,
                    .profile-dropdown,
                    .profile-dropdown *,
                    .logout-item,
                    .logout-btn,
                    #logout-btn {
                        cursor: pointer !important;
                        pointer-events: auto !important;
                    }

                    /* Disable navbar navigation links so user cannot freely roam */
                    .navbar .navbar-center,
                    .navbar .navbar-center * {
                        pointer-events: none !important;
                        opacity: 0.45 !important;
                        cursor: not-allowed !important;
                    }

                    /* Disable main interactive areas and all page elements */
                    main, #main, .main-content, .page-wrapper, .dashboard-wrapper, .crud-panel,
                    #hotel-dashboard, #experience-dashboard, #nta-dashboard, #admin-dashboard,
                    #tech-admin-dash, #nta-plans-page, .content-card, .card-header, .internal-navbar,
                    .tour-table, table, button, input, select, textarea, a:not(#restriction-banner a) {
                        pointer-events: none !important;
                        opacity: 0.55 !important;
                        user-select: none !important;
                        cursor: not-allowed !important;
                    }
                </style>
            `);
        } else {
            document.body.insertAdjacentHTML('beforeend', `
                <style>
                    /* Just push body down, but don't block interaction on support form */
                    body { padding-top: 48px !important; }
                    /* Disable navbar navigation links so user cannot freely roam */
                    .navbar .navbar-center,
                    .navbar .navbar-center * {
                        pointer-events: none !important;
                        opacity: 0.45 !important;
                        cursor: not-allowed !important;
                    }
                    .support-card, .support-card *, form, form * {
                        cursor: auto !important;
                        pointer-events: auto !important;
                    }
                </style>
            `);
        }
    }

    renderNavbar(currentUser);
    await getProfile(currentUser);
    await renderPageContent(currentUser);
  } catch (error) {
    console.error("App initialization failed:", error);
  }
}

if (document.readyState !== "loading") {
  void initApp();
  console.log("App initialized immediately.");
} else {
  document.addEventListener("DOMContentLoaded", () => {
    void initApp();
    console.log("App initialized on DOMContentLoaded.");
  });
}
