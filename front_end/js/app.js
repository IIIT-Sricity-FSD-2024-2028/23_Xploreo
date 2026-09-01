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
        let endpoint = '';
        if (role === 'guide') endpoint = `/guide/${currentUser.id}`;
        else if (role === 'traveller') endpoint = `/traveller/${currentUser.id}`;
        else if (role === 'hotel') endpoint = `/hotels/${currentUser.id}`;
        else if (role === 'experience') endpoint = `/experiences/${currentUser.id}`;
        else if (role === 'superadmin') endpoint = `/superadmin/${currentUser.id}`;
        
        if (endpoint) {
            const latestData = await apiGet(endpoint);
            if (latestData && (latestData.status || latestData.isDeleted !== undefined)) {
                currentUser.status = latestData.status || currentUser.status;
                currentUser.isDeleted = latestData.isDeleted || currentUser.isDeleted;
                localStorage.setItem("currentUser", JSON.stringify(currentUser));
            }
        }
    } catch (e) {
        console.warn("Could not sync live user status", e);
    }

    if (currentUser.status === 'restricted' || currentUser.isDeleted) {
        const isSupportPage = path.includes("support");
        
        document.body.insertAdjacentHTML('afterbegin', `
            <div style="background-color: #ef4444; color: white; padding: 12px; text-align: center; font-weight: bold; position: fixed; top: 0; left: 0; right: 0; z-index: 999999;">
                ⚠️ ADMIN RESTRICTED YOU. You are unable to perform actions. 
                ${!isSupportPage ? `Please <a href="./support.html" style="color: white; text-decoration: underline;">raise a support ticket</a>.` : `You may submit a ticket below.`}
            </div>
        `);
        
        if (!isSupportPage) {
            document.body.insertAdjacentHTML('beforeend', `
                <style>
                    /* Push body down to accommodate fixed banner */
                    body { padding-top: 48px !important; }
                    /* Disable main interactive areas */
                    main, #main, .main-content, .dashboard-wrapper, .crud-panel {
                        pointer-events: none;
                        opacity: 0.6;
                        user-select: none;
                    }
                </style>
            `);
        } else {
            document.body.insertAdjacentHTML('beforeend', `
                <style>
                    /* Just push body down, but don't block interaction */
                    body { padding-top: 48px !important; }
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
