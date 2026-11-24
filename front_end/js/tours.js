import { rendertourpagehearder } from "./modules/tour-page-header.js";
import { renderinternalnavbar } from "./modules/internal-navbar.js";
import { renderinternalcontents } from "./modules/internal-contents.js";

let currentActiveTab = "pending"

export function rendertourpage(containerId,currentUser) {
    
    rendertourpagehearder("tour-page-header",currentUser);
    renderinternalnavbar("tours-internal-navbar",currentActiveTab);
    console.log("hi");
    //renderinternalsearchbar("internal-search-bar",currentUser);
    renderinternalcontents("internal-contents",currentUser,currentActiveTab);
}

const _origSwitchTab = window.switchTab;
window.switchTab = (status) => {
    const page = window.location.pathname.split("/").pop();
    if (page === "tours.html") {
        currentActiveTab = status;
        const user = JSON.parse(localStorage.getItem("currentUser")) || { id: "00001" };
        rendertourpage("main", user); 
    } else if (page === "earnings.html") {
        currentActiveTab = status;
        const user = JSON.parse(localStorage.getItem("currentUser")) || { id: "00001" };
        renderEarningsPage("main", user);
    } else if (_origSwitchTab) {
        _origSwitchTab(status);
    }
};

window.openTourModal = (tourId) => {
    const allTours = JSON.parse(localStorage.getItem("tours")) || [];
    const tour = allTours.find(t => String(t.id) === String(tourId));

    if (tour) {
        const modal = document.getElementById("tourModal");
        const body = document.getElementById("modalBody");
        
        // Use fallback variables to prevent undefined
        const title = tour.name || tour.title || tour.destination || tour.location || 'Guided Tour';
        const subtitle = tour.title && tour.title !== title ? tour.title : '';
        const bookingId = tour.id || tour.bookingId || 'N/A';
        const dateStr = tour.date || tour.dateTime || tour.dateRange || 'TBD';
        const customer = tour.customer || 'Traveller';
        
        body.innerHTML = `
            <div class="tracking-modal-header" style="padding: 20px 24px; border-bottom: 1px solid #e5e7eb;">
                <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #111827;">${title} <span style="font-weight: 400; color: #6b7280; font-size: 16px;">${subtitle ? '- ' + subtitle : ''}</span></h2>
                <div style="margin-top: 8px; display: flex; gap: 16px; font-size: 13px; color: #4b5563;">
                    <span><strong style="color: #111827;">ID:</strong> ${bookingId}</span>
                    <span><strong style="color: #111827;">Date:</strong> ${dateStr}</span>
                    <span><strong style="color: #111827;">Customer:</strong> ${customer}</span>
                </div>
            </div>

            <div class="tracking-container" style="height: 500px; padding: 24px;">
              <!-- LEFT -->
              <div class="tracking-left">
                <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #111827;">Itinerary</h3>
                <ul id="trackingStops"></ul>

                <!-- GUIDE CONTROLS -->
                <div id="guideControls" style="margin-top: auto; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                  <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
                      <button onclick="tracking.start()" class="btn-solid-blue">Start</button>
                      <button onclick="tracking.pause()" class="btn-outline-blue">Pause</button>
                      <button onclick="tracking.resume()" class="btn-outline-blue">Resume</button>
                      <button onclick="tracking.skip()" class="btn-outline-blue">Skip</button>
                  </div>
                  <div style="display: flex; gap: 8px;">
                      <input id="trackingMsgInput" placeholder="Send message to traveller..." />
                      <button onclick="tracking.sendMessage()" class="btn-solid-blue">Send</button>
                  </div>
                </div>

                <!-- TRAVELLER CONTROLS -->
                <div id="travellerControls" style="margin-top: auto; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                  <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                      <button onclick="tracking.sendRequest('🚻 Washroom')" class="btn-outline-blue">🚻 Washroom</button>
                      <button onclick="tracking.sendRequest('☕ Break')" class="btn-outline-blue">☕ Break</button>
                      <button onclick="tracking.sendRequest('🆘 Emergency')" style="background: #ea580c; color: white; border: none;">🆘 Emergency</button>
                  </div>
                </div>
              </div>

              <!-- RIGHT -->
              <div class="tracking-right">
                <div id="trackingMap"></div>
                <div id="trackingMessages"></div>
              </div>
            </div>
        `;
        
        modal.classList.add('active');
        modal.style.setProperty('display', 'flex', 'important');
        
        // Initialize tracking map
        if (window.tracking) {
            window.tracking.init(tour);
        }
    }
};

// Function to update LocalStorage and refresh the UI
window.handleStatusUpdate = (tourId, newStatus) => {
    let allTours = JSON.parse(localStorage.getItem("tours"));
    const index = allTours.findIndex(t => String(t.id) === String(tourId));

    if (index !== -1) {
        allTours[index].status = newStatus;
        localStorage.setItem("tours", JSON.stringify(allTours));
        
        // Close modal and refresh the specific container
        document.getElementById("tourModal").style.display = "none";
        const user = JSON.parse(localStorage.getItem("currentUser"));
        rendertourpage("main", user); 
    }
};

window.handleTourAction = (tourId) => {
    let allTours = JSON.parse(localStorage.getItem("tours")) || [];
    const tourIndex = allTours.findIndex(t => String(t.id) === String(tourId));

    if (tourIndex !== -1) {
        const tour = allTours[tourIndex];
        const itinerary = tour.plan_iternary || [];
        
        // Find where we are right now
        const currentIndex = itinerary.indexOf(tour.currentloction);
        const nextIndex = currentIndex + 1;

        if (nextIndex < itinerary.length) {
            // Move to the next stop
            tour.currentloction = itinerary[nextIndex];
            console.log(`Moving to next stop: ${tour.currentloction}`);
        } else {
            // We reached the end of the list
            tour.status = "completed"; 
            tour.currentloction = "Trip Completion";
            console.log("Tour Finished!");
        }

        // Save and Refresh
        localStorage.setItem("tours", JSON.stringify(allTours));
        
        const user = JSON.parse(localStorage.getItem("currentUser")) || { id: "00001" };
        // Re-render the 'ongoing' or 'completed' tab accordingly
        renderinternalcontents("internal-contents", user, tour.status); 
    }
};

window.closeModal = () => {
    const modal = document.getElementById("tourModal");
    if (modal) {
        modal.classList.remove('active');
        document.getElementById("modalBody").innerHTML = "";
    }
};

window.handleTourStart = (tourId) => {
    let allTours = JSON.parse(localStorage.getItem("tours")) || [];
    const tourIndex = allTours.findIndex(t => String(t.id) === String(tourId));

    if (tourIndex !== -1) {
        const tour = allTours[tourIndex];
        tour.status = "ongoing";
        // Initialize to first stop if not already set
        if (!tour.currentloction && tour.plan_iternary && tour.plan_iternary.length > 0) {
            tour.currentloction = tour.plan_iternary[0];
        }
        
        localStorage.setItem("tours", JSON.stringify(allTours));
        
        const user = JSON.parse(localStorage.getItem("currentUser")) || { id: "00001" };
        // Re-render the 'ongoing' tab
        currentActiveTab = "ongoing";
        rendertourpage("main", user);
    }
};

window.addEventListener("click", (event) => {
    const modal = document.getElementById("tourModal");
    if (event.target === modal) {
        closeModal();
    }
});