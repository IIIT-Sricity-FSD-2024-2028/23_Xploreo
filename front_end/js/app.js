import { renderNavbar } from "../components/layout/navbar.js";
import { getProfile } from "../components/layout/profile.js";
import { renderPageContent } from "./renderpages.js";
import { initLogin } from "./login.js";
import { initSignup } from "./signup.js";
import { getCurrentUser } from "./api/session.js";
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

    const currentUser = getCurrentUser();

    if (!currentUser) {
      window.location.href = "./login.html";
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
