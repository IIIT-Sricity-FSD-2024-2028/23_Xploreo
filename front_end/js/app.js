import { renderNavbar } from "../components/layout/navbar.js";
import { getProfile } from "../components/layout/profile.js";
import { renderPageContent } from "./renderpages.js";
import { initLogin } from "./login.js";
import { initSignup } from "./signup.js";
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

    // Landing pages (tours, partners, support) also just need navbar
    if (path.startsWith("landing_")) {
      renderLandingNavbar();
      return;
    }

    const currentUser = JSON.parse(localStorage.getItem("currentUser"));

    if (!currentUser) {
      const isSubPage = window.location.pathname.match(/\/pages\/[^/]+\//);
      window.location.href = isSubPage
        ? "../../pages/mainpages/login.html"
        : "./pages/mainpages/login.html";
      return;
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
