import { renderAdminDashboard } from "./adminDashboard.js";
import { renderdashboard } from "./dashboard.js";
import { renderHotelDashboard } from "./modules/hotelDashboard.js";
import { renderBookingsPage } from "./modules/hotel-bookings-page.js?v=hotel-workflow-2";
import { renderServicesPage } from "./modules/hotel-services-page.js?v=hotel-workflow-2";
import { renderHotelEarningPage } from "./modules/hotel-earning-page.js";
import { rendertourpage } from "./tours.js";
import { renderEarningsPage } from "./earnings.js";
import { renderReviewsPage } from "./reviews.js";
import { renderSchedulePage } from "./schedule.js";
import { renderProfilePage } from "./profile.js";
import { renderSupportPage } from "./support.js";
import {
  renderGuideCrudPage,
  renderPlansCrudPage,
  renderTripsCrudPage,
} from "./moduleCrudPages.js";
import { initUsers } from "./modules/users.js";
import { initFinance } from "./modules/finance.js";
import { renderExperienceHomePage } from "./modules/experience_home.js?v=phase2-bookings-v2";
//import { renderExperienceDashboard } from "./modules/experienceDashboard.js?v=phase2-bookings-v2";
import { renderExperienceEarningsPage } from "./modules/experience_earnings.js?v=phase2-bookings-v2";
import { renderExperienceBookingsPage } from "./modules/experience_bookings.js?v=phase2-bookings-v2";
import { renderExperienceCatalogPage } from "./modules/experience_experience.js?v=phase2-bookings-v2";
import { renderExperienceProfilePage } from "./modules/experience_profile.js?v=phase2-bookings-v2";
import { initOperations } from "./modules/operations.js";
import { renderTechAdminDashboard } from "./techAdminDashboard.js";
import { initTicketManagement } from "./modules/tech_tickets.js?v=phase3-tickets";
import { renderTechTicketDetail } from "./modules/tech_ticket_detail.js";
import { renderNtaDashboard } from "./modules/ntaDashboard.js";
import { initNtaPlans } from "./modules/ntaPlans.js";
import { renderGuideDashboard } from "./modules/guide_dashboard.js";
import { initNtaGuideApplications } from "./modules/nta_guide_applications.js";

// Traveler modules
import { renderTravelerDashboard as renderTravellerDashboard } from "./modules/travelerDashboard.js?v=traveller-ui-6";
import { renderTravelerWishlist } from "./modules/travelerWishlist.js?v=traveller-ui-6";
import { renderTravelerTrips } from "./modules/travelerTrips.js?v=traveller-ui-6";
import { renderTravelerPlanDetailPage } from "./modules/travelerPlanDetailPage.js";
import { renderTravelerPackageSearchPage } from "./modules/travelerPackageSearchPage.js";
import { renderTravelerHotelSearchPage } from "./modules/travelerHotelSearchPage.js";
import { renderTravelerHotelDetailPage } from "./modules/travelerHotelDetailPage.js";
import { renderTravelerHotelConfirmationPage } from "./modules/travelerHotelConfirmationPage.js";
import { renderTravelerHotelBookingPage } from "./modules/travelerHotelBookingPage.js";
import { renderTravelerFlightsPage } from "./modules/travelerFlightsPage.js";
import { renderTravelerFlightSearchPage } from "./modules/travelerFlightSearchPage.js";
import { renderTravelerFlightDetailPage } from "./modules/travelerFlightDetailPage.js";
import { renderTravelerBookingConfirmationPage } from "./modules/travelerBookingConfirmationPage.js";
import { renderTravelerBookingDetailsPage } from "./modules/travelerBookingDetailsPage.js";
import { initTravelerProfilePage } from "./modules/travelerProfilePage.js";
import { renderTravelerSupportPage } from "./modules/travelerSupportPage.js?v=phase3-tickets";

import { renderTravelerExperienceSearchPage } from "./modules/travelerExperienceSearchPage.js?v=phase2-bookings-v2";
import { renderTravelerExperienceDetailPage } from "./modules/travelerExperienceDetailPage.js?v=phase2-bookings-v2";
import { renderTravelerExperienceBookingPage } from "./modules/travelerExperienceBookingPage.js?v=phase2-bookings-v2";
import { renderTravelerExperienceConfirmationPage } from "./modules/travelerExperienceConfirmationPage.js?v=phase2-bookings-v2";
import { initTripPlannerPage } from "./modules/tripPlannerPage.js";

export async function renderPageContent(user) {
  const page = window.location.pathname.split("/").pop() || "dashboard.html";
  const role = user.role;
  const isTraveller =
    role === "traveller" || role === "TRAVELLER" || role === "TRAVELER";

  if (
    isTraveller &&
    (page === "dashboard.html" ||
      page === "traveller_dashboard.html" ||
      page === "travelerDashboard.html")
  ) {
    showOnlyDashboard("main");
    await renderSafely("Render traveller dashboard", () =>
      renderTravellerDashboard("main", user),
    );
    return;
  }

  if (
    isTraveller &&
    (page === "wishlist.html" || page === "traveller_wishlist.html")
  ) {
    await renderSafely("Render traveller wishlist", () =>
      renderTravelerWishlist("main", user),
    );
    return;
  }

  if (
    isTraveller &&
    (page === "mytrips.html" || page === "traveller_mytrips.html")
  ) {
    await renderSafely("Render traveller trips", () =>
      renderTravelerTrips("main", user),
    );
    return;
  }

  if (isTraveller) {
    const travelerRoutes = {
      "traveller_plan-detail.html": renderTravelerPlanDetailPage,
      "traveller_package-search.html": renderTravelerPackageSearchPage,
      "traveller_hotel-search.html": renderTravelerHotelSearchPage,
      "traveller_hotel-detail.html": renderTravelerHotelDetailPage,
      "traveller_hotel-confirmation.html": renderTravelerHotelConfirmationPage,
      "traveller_hotel-booking.html": renderTravelerHotelBookingPage,
      "traveller_flights.html": renderTravelerFlightsPage,
      "traveller_flight-search.html": renderTravelerFlightSearchPage,
      "traveller_flight-detail.html": renderTravelerFlightDetailPage,
      "traveller_booking-confirmation.html":
        renderTravelerBookingConfirmationPage,
      "traveller_booking-details.html": renderTravelerBookingDetailsPage,
      "traveller_experience-search.html": renderTravelerExperienceSearchPage,
      "traveller_experience-detail.html": renderTravelerExperienceDetailPage,
      "traveller_experience-booking.html": renderTravelerExperienceBookingPage,
      "traveller_experience-confirmation.html":
        renderTravelerExperienceConfirmationPage,
      "traveller_trip-planning.html": initTripPlannerPage,
      "traveller_profile.html": initTravelerProfilePage,
      "traveller_support.html": renderTravelerSupportPage,
      "support.html": renderTravelerSupportPage,
    };

    if (travelerRoutes[page]) {
      await renderSafely(`Render ${page}`, () =>
        travelerRoutes[page]("main", user),
      );
      return;
    }
  }
  if (user.role === "guide" && (page === "dashboard.html" || page === "guide.html")) {
    showOnlyDashboard("main");
    await renderSafely("Render guide dashboard", () =>
      renderGuideDashboard("main", user),
    );
    return;
  } else if (user.role === "superadmin" && page === "dashboard.html") {
    await renderAdminDashboard("admin-dashboard");
    const main = document.getElementById("main");
    const admin = document.getElementById("admin-dashboard");
    const hotel = document.getElementById("hotel-dashboard");
    if (admin) admin.style.display = "block";
    if (main) main.style.display = "none";
    if (hotel) hotel.style.display = "none";
    document.getElementById("tech-admin-dash").style.display = "none";
  } else if ((user.role === "superadmin" || user.role === "nontechadmin") && page === "users.html") {
    initUsers();

  } else if (
    (user.role === "superadmin" || user.role === "nontechadmin") &&
    page === "plans.html"
  ) {
    renderPlansCrudPage("main", user);
  } else if (
    (user.role === "superadmin" || user.role === "nontechadmin") &&
    page === "trips.html"
  ) {
    renderTripsCrudPage("main", user);
  } else if (user.role === "superadmin" && page === "opsbook.html") {
    const mainDiv = document.getElementById("main");
    if (mainDiv) mainDiv.style.display = "block";
    initOperations();
  } else if (user.role === "superadmin" && page === "finance.html") {
    const adminDash = document.getElementById("admin-dashboard");
    if (adminDash) adminDash.style.display = "none";

    const mainDiv = document.getElementById("main");
    if (mainDiv) mainDiv.style.display = "block";

    initFinance();
  } else if (
    (role === "techadmin" || role === "TECH_ADMIN") &&
    page === "dashboard.html"
  ) {
    renderTechAdminDashboard("tech-admin-dash");
    document.getElementById("tech-admin-dash").style.display = "block";
  } else if (
    (role === "techadmin" || role === "TECH_ADMIN" || role === "superadmin") &&
    page === "tech_tickets.html"
  ) {
    initTicketManagement();
  } else if (
    (role === "techadmin" || role === "TECH_ADMIN" || role === "superadmin") &&
    page === "tech_ticket_detail.html"
  ) {
    renderTechTicketDetail("main");
  } else if (user.role === "guide" && page === "tours.html") {
    rendertourpage("main", user);
  } else if (user.role === "guide" && page === "earnings.html") {
    renderEarningsPage("main", user);
  } else if (user.role === "guide" && page === "reviews.html") {
    renderReviewsPage("main", user);
  } else if (user.role === "guide" && page === "schedule.html") {
    renderSchedulePage("main", user);
  } else if (
    (user.role === "guide" ||
      user.role === "experience" ||
      user.role === "EXPERIENCE_PARTNER" ||
      role === "techadmin" ||
      role === "TECH_ADMIN" ||
      user.role === "nontechadmin") &&
    page === "profile.html"
  ) {
    renderProfilePage("main", user);
  } else if (
    (user.role === "guide" ||
      user.role === "hotel" ||
      user.role === "PARTNER" ||
      user.role === "experience" ||
      user.role === "EXPERIENCE_PARTNER" ||
      user.role === "nontechadmin" ||
      user.role === "superadmin" ||
      page === "support.html") &&
    page === "support.html"
  ) {
    const main = document.getElementById("main");
    if (main) main.style.display = "block";
    renderSupportPage("main", user);
  } else if (
    (role === "hotel" || role === "PARTNER") &&
    (page === "dashboard.html" || page === "hotelDashboard.html")
  ) {
    renderHotelDashboard(user);
    const main = document.getElementById("main");
    const admin = document.getElementById("admin-dashboard");
    const hotel = document.getElementById("hotel-dashboard");
    if (main) main.style.display = "none";
    if (admin) admin.style.display = "none";
    if (hotel) hotel.style.display = "block";
  } else if (
    (role === "hotel" || role === "PARTNER") &&
    page === "hotelBookings.html"
  ) {
    await renderSafely("Render hotel partner bookings", () =>
      renderBookingsPage("main", user),
    );
  } else if (
    (role === "hotel" || role === "PARTNER") &&
    page === "hotelRooms.html"
  ) {
    await renderSafely("Render hotel partner services", () =>
      renderServicesPage("main"),
    );
  } else if (
    (role === "hotel" || role === "PARTNER") &&
    page === "hotelReviews.html"
  ) {
    await renderSafely("Render hotel partner reviews", async () => {
      const { renderHotelReviews } = await import("./modules/hotel-reviews.js");
      renderHotelReviews("reviews-section-h");
    });
  } else if (
    (role === "hotel" || role === "PARTNER") &&
    page === "hotelEarning.html"
  ) {
    renderHotelEarningPage();
  } /*else if (
    (role === "experience" || role === "EXPERIENCE_PARTNER") &&
    page === "dashboard.html"
  ) {
    showOnlyDashboard("experience-dashboard");
    await renderSafely("Render experience dashboard", () =>
      renderExperienceDashboard("experience-dashboard", user),
    );
  } */else if (
    (role === "experience" || role === "EXPERIENCE_PARTNER") &&
    page === "experience_home.html"
  ) {
    await renderSafely("Render experience home", () =>
      renderExperienceHomePage("main", user),
    );
  } else if (
    (role === "experience" || role === "EXPERIENCE_PARTNER") &&
    page === "experience_earnings.html"
  ) {
    renderExperienceEarningsPage();
  } else if (
    (role === "experience" || role === "EXPERIENCE_PARTNER") &&
    page === "experience_bookings.html"
  ) {
    renderExperienceBookingsPage();
  } else if (
    (role === "experience" || role === "EXPERIENCE_PARTNER") &&
    page === "experience_experience.html"
  ) {
    renderExperienceCatalogPage();
  } else if (
    (role === "experience" || role === "EXPERIENCE_PARTNER") &&
    page === "experience_profile.html"
  ) {
    renderExperienceProfilePage();
  } else if (
    user.role === "nontechadmin" &&
    (page === "dashboard.html" || page === "nta_dashboard.html")
  ) {
    renderNtaDashboard("nta-dashboard");
  } else if (user.role === "nontechadmin" && page === "nta_plans.html") {
    initNtaPlans();
  } else if (
    (user.role === "nontechadmin" || user.role === "superadmin") &&
    page === "nta_guide_applications.html"
  ) {
    const main = document.getElementById("main");
    if (main) main.style.display = "block";
    initNtaGuideApplications("main");
  }
}

async function renderSafely(label, renderFn) {
  try {
    await renderFn();
  } catch (error) {
    console.error(`${label} failed:`, error);
  }
}

function showOnlyDashboard(activeId) {
  [
    "main",
    "admin-dashboard",
    "hotel-dashboard",
    "tech-admin-dash",
    "nta-dashboard",
    "experience-dashboard",
  ].forEach((id) => {
    const element = document.getElementById(id);
    if (element) element.style.display = id === activeId ? "block" : "none";
  });
}
