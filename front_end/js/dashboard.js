import { renderStats } from "./modules/stat-cards.js";
import { renderTour } from "./modules/tour-card.js";
import { renderWelcomemsg} from "./modules/welcome-card.js";
import { renderDashEarnings } from "./modules/dash-earnings.js";
import { renderDashReviews } from "./modules/dash-reviews.js";

export function renderdashboard(containerId, currentUser) {
    renderWelcomemsg("welcome-section", currentUser);
    renderStats("stats-section", currentUser);
    renderTour("tour-section", currentUser);
    renderDashEarnings("earnings-section", currentUser);
    renderDashReviews("reviews-section", currentUser);
}