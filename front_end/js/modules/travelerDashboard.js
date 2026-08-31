import { travelerData } from "../api/legacyData.js";
import { fetchHotels, fetchExperiences, fetchPlans } from "../api/services.js";
import { attachLocationAutocomplete, getTodayDateString, extractUniqueLocations, extractFlightOrigins, extractFlightDestinations } from "../utils/locationAutocomplete.js";

// Heart SVG helper
const heartSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
const heartIconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
const SEARCH_STORAGE_KEY = "traveler_dashboard_search_state";
const FLIGHT_RESULTS_PAGE = "./traveller_flight-search.html";
const HOTEL_RESULTS_PAGE = "./traveller_hotel-search.html";
const PACKAGE_RESULTS_PAGE = "./traveller_package-search.html";
const EXPERIENCE_RESULTS_PAGE = "./traveller_experience-search.html";
const PLAN_DETAIL_PAGE = "./traveller_plan-detail.html";
const SELECTED_PLAN_KEY = "traveler_selected_plan";
const SELECTED_FLIGHT_KEY = "traveler_selected_flight";
const PLAN_SOURCE_KEY = "traveler_plan_source";
const TOUR_IMAGE_FALLBACK = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800";
const DESTINATION_IMAGE_FALLBACK = "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=800";
const CATEGORY_IMAGE_FALLBACK = "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=800";
const CONTINUE_IMAGE_FALLBACK = "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?auto=format&fit=crop&q=80&w=800";

const searchState = {
    activeTab: "hotels",
    tripType: "One Way",
    results: [],
    summary: "",
    values: {
        flights: {
            from: "Chennai (MAA)",
            to: "",
            departure: "",
            returnDate: "",
            travellers: "1 Traveller, Economy"
        },
        hotels: {
            city: "",
            checkIn: "",
            checkOut: "",
            rooms: "1",
            guestCount: "2",
            guests: "1 Room, 2 Guests"
        },
        packages: {
            destination: "",
            departureDate: "",
            rooms: "1",
            guestCount: "2",
            guests: "1 Room, 2 Guests"
        },
        experiences: {
            destination: "",
            activityDate: ""
        }
    }
};

initializeSearchState();

function buildBackgroundImageStyle(primaryImage, fallbackImage) {
    return `background-image: url('${primaryImage}'), url('${fallbackImage}');`;
}

function buildFallbackImg(primaryImage, fallbackImage, altText, extraAttributes = "") {
    return `<img src="${primaryImage}" alt="${altText}" onerror="this.onerror=null;this.src='${fallbackImage}';" ${extraAttributes}>`;
}

export async function renderTravelerDashboard(containerId, user) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Fetch dynamic data for the autocomplete catalog
    try {
        const [hotels, experiences, packages] = await Promise.all([
            fetchHotels().catch(() => []),
            fetchExperiences().catch(() => []),
            fetchPlans().catch(() => [])
        ]);

        const catalog = travelerData.searchCatalog || { flights: [], hotels: [], packages: [], experiences: [] };
        travelerData.searchCatalog = {
            ...catalog,
            hotels: hotels || [],
            experiences: experiences || [],
            packages: packages || []
        };
    } catch (err) {
        console.warn("Failed to load search catalog data:", err);
    }

    const dashboardHTML = `
        <!-- HERO SECTION -->
        <div class="hero-section">
            <div class="hero-overlay"></div>
            <div class="hero-content">
                <h1 class="hero-title">Discover Your Next Adventure</h1>
            </div>
        </div>
                
        <!-- SEARCH WIDGET OVERLAP -->
        <div class="search-widget-container">
            <div class="search-widget" id="main-search-widget">
                    <div class="search-tabs">
                        <button class="search-tab active" data-tab="hotels">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 22v-6.57"></path><path d="M14 22v-6.57"></path><path d="M22 22H2"></path><path d="M22 15a2 2 0 0 0-2-2h-3"></path><path d="M2 15a2 2 0 0 1 2-2h3"></path><path d="M7 2v10"></path><path d="M17 2v10"></path><path d="M7 12V6a5 5 0 0 1 10 0v6"></path></svg>
                            Hotels
                        </button>
                        <button class="search-tab" data-tab="packages">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                            Holiday Packages
                        </button>
                        <button class="search-tab" data-tab="experiences">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
                            Experiences
                        </button>
                    </div>
                    
                    <div class="search-panel active" id="hotels-panel">
                        <div class="search-inputs-row" style="margin-top: 20px;">
                            <div class="input-group full-width-input">
                                <label>City</label>
                                <div class="input-wrapper">
                                    <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                    <input type="text" id="hotel-city" placeholder="Enter city or hotel name" value="${searchState.values.hotels.city || ''}">
                                </div>
                                <span class="search-field-error" id="hotel-city-error"></span>
                            </div>
                            <div class="input-group">
                                <label>Check-in</label>
                                <div class="input-wrapper">
                                    <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                    <input type="date" id="hotel-checkin" value="${searchState.values.hotels.checkIn || ''}" min="${getTodayDateString()}">
                                </div>
                                <span class="search-field-error" id="hotel-checkin-error"></span>
                            </div>
                            <div class="input-group">
                                <label>Check-out</label>
                                <div class="input-wrapper">
                                    <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                    <input type="date" id="hotel-checkout" value="${searchState.values.hotels.checkOut || ''}" min="${getNextDateValue(searchState.values.hotels.checkIn) || getTodayDateString()}">
                                </div>
                                <span class="search-field-error" id="hotel-checkout-error"></span>
                            </div>
                            <div class="input-group">
                                <label>Rooms</label>
                                <div class="input-wrapper">
                                    <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                    <input type="number" id="hotel-rooms" min="1" max="8" step="1" inputmode="numeric" placeholder="1" value="${searchState.values.hotels.rooms || "1"}">
                                </div>
                                <span class="search-field-error" id="hotel-rooms-error"></span>
                            </div>
                            <div class="input-group">
                                <label>Guests</label>
                                <div class="input-wrapper">
                                    <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                    <input type="number" id="hotel-guests" min="1" max="20" step="1" inputmode="numeric" placeholder="2" value="${searchState.values.hotels.guestCount || "2"}">
                                </div>
                                <span class="search-field-error" id="hotel-guests-error"></span>
                            </div>
                        </div>
                        <button class="search-submit-btn" data-search-submit="hotels">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            SEARCH HOTELS
                        </button>
                    </div>

                    <div class="search-panel" id="packages-panel">
                        <div class="search-inputs-row" style="margin-top: 20px;">
                            <div class="input-group" style="flex: 2;">
                                <label>Destination</label>
                                <div class="input-wrapper">
                                    <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                    <input type="text" id="package-destination" placeholder="Where to?" value="${searchState.values.packages.destination || ''}">
                                </div>
                                <span class="search-field-error" id="package-destination-error"></span>
                            </div>
                            <div class="input-group">
                                <label>Departure Date</label>
                                <div class="input-wrapper">
                                    <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                    <input type="date" id="package-departure" value="${searchState.values.packages.departureDate || ''}" min="${getTodayDateString()}">
                                </div>
                                <span class="search-field-error" id="package-departure-error"></span>
                            </div>

                            <div class="input-group">
                                <label>Guests</label>
                                <div class="input-wrapper">
                                    <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                    <input type="number" id="package-guests" min="1" max="20" step="1" inputmode="numeric" placeholder="2" value="${searchState.values.packages.guestCount || "2"}">
                                </div>
                                <span class="search-field-error" id="package-guests-error"></span>
                            </div>
                        </div>
                        <button class="search-submit-btn" data-search-submit="packages">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            SEARCH PACKAGES
                        </button>
                    </div>

                    <div class="search-panel" id="experiences-panel">
                        <div class="search-inputs-row" style="margin-top: 20px;">
                            <div class="input-group full-width-input">
                                <label>Destination</label>
                                <div class="input-wrapper">
                                    <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                    <input type="text" id="experience-destination" placeholder="Where do you want to explore?" value="${searchState.values.experiences.destination || ''}">
                                </div>
                                <span class="search-field-error" id="experience-destination-error"></span>
                            </div>
                            <div class="input-group full-width-input">
                                <label>Activity Date</label>
                                <div class="input-wrapper">
                                    <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                    <input type="date" id="experience-date" value="${searchState.values.experiences.activityDate || ''}" min="${getTodayDateString()}">
                                </div>
                                <span class="search-field-error" id="experience-date-error"></span>
                            </div>
                        </div>
                        <button class="search-submit-btn" data-search-submit="experiences">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            SEARCH EXPERIENCES
                        </button>
                    </div>
            </div>
        </div>

        <!-- MAIN DASHBOARD CONTENT -->
        <div class="dashboard-container">
            <!-- 1. TRENDING DESTINATIONS -->
            <section class="travel-section">
                <div class="section-header">
                    <div>
                        <h2 class="section-title">Trending Destinations</h2>
                        <p class="section-subtitle">Popular places worth exploring right now</p>
                    </div>
                </div>
                <div class="cards-grid destinations-grid">
                    ${travelerData.destinations.map(dest => `
                        <div class="destination-card" style="${buildBackgroundImageStyle(dest.image, DESTINATION_IMAGE_FALLBACK)}">
                            <div class="card-gradient"></div>
                            <button class="heart-btn">${heartIconSvg}</button>
                            <div class="card-info">
                                <h3>${dest.title}</h3>
                                <p>${dest.subtitle}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </section>

            <!-- 2. RECOMMENDED TOURS -->
            <section class="travel-section light-bg-section">
                <div class="section-header">
                    <div>
                        <h2 class="section-title">Recommended for You</h2>
                        <p class="section-subtitle">Personalized experiences based on your interests</p>
                    </div>
                </div>
                <div class="cards-grid tours-grid">
                    ${travelerData.recommendedTours.map(tour => `
                        <div class="tour-card">
                            <div class="tour-image">
                                ${buildFallbackImg(tour.image, TOUR_IMAGE_FALLBACK, tour.title)}
                                <button class="heart-btn-circle">${heartSvg}</button>
                                <div class="rating-badge">★ ${tour.rating} <span>(${tour.reviews})</span></div>
                            </div>
                            <div class="tour-content">
                                <h4>${tour.title}</h4>
                                <p class="tour-desc">${tour.desc}</p>
                                <div class="tour-footer">
                                    <span class="tour-duration"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> ${tour.duration}</span>
                                    <span class="tour-price">${tour.price}</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </section>

            <!-- 3. EXPLORE BY CATEGORY -->
            <section class="travel-section">
                <div class="section-header">
                    <div>
                        <h2 class="section-title">Explore by Category</h2>
                        <p class="section-subtitle">Find experiences that match your travel style</p>
                    </div>
                </div>
                <div class="cards-grid destinations-grid">
                    ${travelerData.categories.map(cat => `
                        <div class="destination-card" style="${buildBackgroundImageStyle(cat.image, CATEGORY_IMAGE_FALLBACK)}">
                            <div class="card-gradient"></div>
                            <div class="category-icon" style="background: ${cat.color};">
                                ${cat.svg}
                            </div>
                            <div class="card-info">
                                <h3>${cat.title}</h3>
                                <p>${cat.desc}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </section>

            <!-- 4. HOW IT WORKS -->
            <section class="travel-section text-center">
                <h2 class="section-title">How It Works</h2>
                <p class="section-subtitle">Start your journey in three simple steps</p>
                <div class="steps-container">
                    ${travelerData.steps.map((step, index) => `
                        <div class="step-card">
                            <div class="step-icon">
                                <img src="${step.icon}" alt="Step" style="width: 32px; filter: brightness(0) invert(1);">
                                <span class="step-number">${step.number}</span>
                            </div>
                            <h4>${step.title}</h4>
                            <p>${step.desc}</p>
                        </div>
                        ${index < travelerData.steps.length - 1 ? `<div class="step-line"></div>` : ''}
                    `).join('')}
                </div>
            </section>

            <!-- POPULAR ITINERARIES -->
            <section class="travel-section">
                <div class="section-header">
                    <div>
                        <h2 class="section-title">Popular Itineraries</h2>
                        <p class="section-subtitle">Curated multi-day travel experiences</p>
                    </div>
                </div>
                <div class="cards-grid itineraries-grid">
                    ${travelerData.itineraries.map(itin => `
                        <div class="itinerary-card">
                            <div class="itin-image" style="${buildBackgroundImageStyle(itin.image, DESTINATION_IMAGE_FALLBACK)}">
                                <button class="heart-btn-circle">${heartSvg}</button>
                                <div class="days-badge">📅 ${itin.days} Days</div>
                                <div class="itin-title-overlay">
                                    <h3>${itin.title}</h3>
                                    <div class="itin-tags">
                                        ${itin.tags.map(tag => `<span>${tag}</span>`).join('')}
                                    </div>
                                </div>
                            </div>
                            <div class="itin-content">
                                <div class="itin-meta-row">
                                    <span class="itin-rating">★ ${itin.rating} <small>(${itin.reviews})</small></span>
                                    <span class="itin-travelers">👥 ${itin.travelers} travelers</span>
                                </div>
                                <ul class="itin-features">
                                    ${itin.features.map(f => `<li>${f}</li>`).join('')}
                                </ul>
                                <div class="itin-footer">
                                    <div class="itin-price-block">
                                        <span class="price-label">From</span>
                                        <span class="price-value">${itin.price}</span>
                                    </div>
                                    <button class="view-plan-btn" data-view-plan="${itin.id || itin.title}">View Plan</button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </section>

            <!-- WHAT TRAVELERS SAY -->
            <section class="travel-section text-center">
                <h2 class="section-title">What Travelers Say</h2>
                <p class="section-subtitle">Real stories from our community</p>
                <div class="cards-grid itineraries-grid" style="margin-top: 40px; text-align: left;">
                    ${travelerData.reviews.map(rev => `
                        <div class="review-card">
                            <div class="review-stars">${rev.stars}</div>
                            <p class="review-text">${rev.text}</p>
                            <div class="reviewer-info">
                                <img src="${rev.avatar}" style="width: 40px; height: 40px; border-radius: 50%; background:#e2e8f0; padding:4px;" alt="Reviewer">
                                <div>
                                    <h4>${rev.name}</h4>
                                    <p>${rev.location}</p>
                                </div>
                                <span class="review-loc">${rev.tourLoc}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </section>
            
            <!-- CONTINUE EXPLORING -->
            <section class="travel-section">
                <h2 class="section-title">Continue Exploring</h2>
                <p class="section-subtitle" style="margin-bottom: 30px;">Pick up where you left off</p>
                <div class="cards-grid tours-grid">
                    ${travelerData.continueExploring.map(item => `
                        <div class="tour-card" style="opacity: 0.9;">
                            <div class="tour-image">
                                ${buildFallbackImg(item.image, CONTINUE_IMAGE_FALLBACK, item.title, item.grayscale ? 'style="filter: grayscale(100%);"' : "")}
                                <button class="heart-btn-circle">${heartSvg}</button>
                                <div class="rating-badge" style="background:#10B981; color:white; top:12px; left:12px; right:auto;">${item.badge}</div>
                            </div>
                            <div class="tour-content">
                                <h4>${item.title}</h4>
                                <p class="tour-desc">${item.desc}</p>
                                <div class="tour-footer">
                                    <span class="tour-duration" style="color:#9CA3AF;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> ${item.duration}</span>
                                    <span class="tour-price">${item.price}</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </section>
        </div>
    `;

    container.innerHTML = dashboardHTML;
    attachDashboardEvents();
    attachDashboardAutocomplete();
}

// Extract event listeners that were previously in js/traveler/dashboard.js
function attachDashboardEvents() {
    // Search Tabs functionality
    const searchTabs = document.querySelectorAll(".search-tab");
    const searchPanels = document.querySelectorAll(".search-panel");

    searchTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            searchTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");

            searchPanels.forEach(p => p.classList.remove("active"));
            const tabId = tab.getAttribute("data-tab");
            searchState.activeTab = tabId;
            const activePanel = document.getElementById(tabId + "-panel");
            if (activePanel) activePanel.classList.add("active");
        });
    });

    hydrateFlightLayout();
    bindSearchActions();
    bindDateMinConstraints();

    // Initialize Wishlist State
    let wishlist = JSON.parse(localStorage.getItem("traveler_wishlist") || "[]");

    // Heart Button Interactions
    const heartBtns = document.querySelectorAll(".heart-btn, .heart-btn-circle");
    heartBtns.forEach(btn => {
        const cardItem = btn.closest('.destination-card, .tour-card, .itinerary-card');
        let itemData = { likes: Math.floor(Math.random() * 20) + 5 }; // Fake default likes

        // Extract metadata safely depending on card type
        if (cardItem) {
            if (cardItem.classList.contains('destination-card')) {
                const h3 = cardItem.querySelector('h3');
                itemData.title = h3 ? h3.textContent : "";
                const p = cardItem.querySelector('.card-info p');
                itemData.location = p ? p.textContent : "";
                const bg = cardItem.style.backgroundImage;
                if (bg) itemData.image = bg.slice(5, -2).replace(/"/g, "");
            } else if (cardItem.classList.contains('tour-card')) {
                const h4 = cardItem.querySelector('h4');
                itemData.title = h4 ? h4.textContent : "";
                const p = cardItem.querySelector('p.tour-desc');
                itemData.location = p ? p.textContent : "";
                const img = cardItem.querySelector('img');
                if (img) itemData.image = img.src;
            } else if (cardItem.classList.contains('itinerary-card')) {
                const h3 = cardItem.querySelector('h3');
                itemData.title = h3 ? h3.textContent : "";
                const tags = cardItem.querySelector('.itin-tags');
                itemData.location = tags ? tags.textContent.trim().replace(/\s+/g, ' ') : "";
                const bg = cardItem.querySelector('.itin-image').style.backgroundImage;
                if (bg) itemData.image = bg.slice(5, -2).replace(/"/g, "");
            }
        }

        // Pre-fill if already in wishlist
        const svg = btn.querySelector("svg");
        if (itemData.title && wishlist.find(i => i.title === itemData.title)) {
            btn.style.color = "#EF4444";
            svg.style.fill = "#EF4444";
        }

        btn.addEventListener("click", (e) => {
            e.preventDefault();
            // Re-fetch wishlist for accuracy
            wishlist = JSON.parse(localStorage.getItem("traveler_wishlist") || "[]");

            if (btn.style.color === "rgb(239, 68, 68)" || btn.style.color === "#EF4444") {
                // Remove
                btn.style.color = "#9CA3AF";
                svg.style.fill = "none";
                showToast("Removed from Wishlist");

                if (itemData.title) {
                    wishlist = wishlist.filter(i => i.title !== itemData.title);
                }
            } else {
                // Add
                btn.style.color = "#EF4444";
                svg.style.fill = "#EF4444";
                showToast("Added to Wishlist");

                if (itemData.title && !wishlist.find(i => i.title === itemData.title)) {
                    wishlist.push(itemData);
                }
            }
            localStorage.setItem("traveler_wishlist", JSON.stringify(wishlist));
        });
    });

    bindPlanActions();
}

function bindPlanActions() {
    const planButtons = document.querySelectorAll("[data-view-plan]");

    planButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const planId = button.getAttribute("data-view-plan");
            const itinerary = travelerData.itineraries.find((item) => item.id === planId || item.title === planId);

            if (!itinerary) {
                showToast("Unable to open this plan right now.");
                return;
            }

            const itineraryType = String(itinerary.type || "").toLowerCase();

            if (itineraryType === "flight" && itinerary.flightDetail) {
                if (typeof localStorage !== "undefined") {
                    localStorage.setItem(SELECTED_FLIGHT_KEY, JSON.stringify(itinerary.flightDetail));
                }
                window.location.href = `./traveller_flight-detail.html?flight=${encodeURIComponent(itinerary.flightDetail.id || itinerary.id)}`;
                return;
            }

            if (typeof localStorage !== "undefined") {
                localStorage.setItem(SELECTED_PLAN_KEY, JSON.stringify(itinerary));
                localStorage.setItem(PLAN_SOURCE_KEY, "dashboard");
            }

            window.location.href = `${PLAN_DETAIL_PAGE}?plan=${encodeURIComponent(itinerary.id || itinerary.title)}`;
        });
    });
}

function bindDateMinConstraints() {
    // Ensure all date fields always have today as minimum
    const today = getTodayDateString();
    const dateFields = [
        "flight-departure", "hotel-checkin", "package-departure", "experience-date"
    ];
    dateFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (!el.min || el.min < today) el.min = today;
            if (el.value && el.value < today) el.value = "";
        }
    });
}

function attachDashboardAutocomplete() {
    const flights = travelerData.searchCatalog.flights;
    const packages = travelerData.searchCatalog.packages || [];
    const experiences = travelerData.searchCatalog.experiences || [];

    // Flights: From only gets origins, To only gets destinations — field-specific
    const flightOrigins = extractFlightOrigins(flights);
    const flightDests = extractFlightDestinations(flights);

    // Hotels: only hotel city names
    const hotelCities = extractUniqueLocations(travelerData.searchCatalog.hotels, ["city"]);

    // Experiences: destination field only
    const expDests = extractUniqueLocations(experiences, ["destination"]);

    // Flights & Hotels & Experiences — static lists (each field only has one relevant dimension)
    attachLocationAutocomplete("flight-from", flightOrigins.length ? flightOrigins : flightDests);
    attachLocationAutocomplete("flight-to", flightDests.length ? flightDests : flightOrigins);
    attachLocationAutocomplete("hotel-city", hotelCities);
    attachLocationAutocomplete("experience-destination", expDests);

    // Packages — cross-field dynamic filtering so no dead-end suggestions
    const destEl = document.getElementById("package-destination");

    function getPkgFromSuggestions() {
        const currentDest = (destEl ? destEl.value : "").trim().toLowerCase();
        const filtered = currentDest
            ? packages.filter(p => p.destination.toLowerCase().includes(currentDest))
            : packages;
        return [...new Set(filtered.map(p => p.origin).filter(Boolean))].sort();
    }

    function getPkgDestSuggestions() {
        const currentFrom = (fromEl ? fromEl.value : "").trim().toLowerCase();
        const filtered = currentFrom
            ? packages.filter(p => p.origin.toLowerCase().includes(currentFrom))
            : packages;
        return [...new Set(filtered.map(p => p.destination).filter(Boolean))].sort();
    }

    attachLocationAutocomplete("package-destination", getPkgDestSuggestions);
}

function bindSearchActions() {
    const submitButtons = document.querySelectorAll("[data-search-submit]");

    submitButtons.forEach(button => {
        button.addEventListener("click", () => {
            const tab = button.getAttribute("data-search-submit");
            runSearch(tab);
        });
    });

    bindIntegerField("flight-travellers", 1, 12);
    bindIntegerField("hotel-rooms", 1, 8);
    bindIntegerField("hotel-guests", 1, 20);
    bindIntegerField("package-rooms", 1, 8);
    bindIntegerField("package-guests", 1, 20);
    bindDateRangeField("flight-departure", "flight-return");
    bindDateRangeField("hotel-checkin", "hotel-checkout");
}

function hydrateFlightLayout() {
    const travellersGroup = document.getElementById("travellers-group");
    if (travellersGroup) {
        travellersGroup.classList.remove("full-width-input");
    }
}

function runSearch(tab) {
    clearSearchErrors();
    persistSearchValues();

    const { errors, summary, results } = getSearchOutcome(tab);

    if (Object.keys(errors).length > 0) {
        renderSearchErrors(errors);
        showToast("Please complete the highlighted search fields");
        return;
    }

    searchState.activeTab = tab;
    searchState.results = results;
    searchState.summary = summary;
    if (typeof localStorage !== "undefined") {
        localStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify(searchState));
    }

    if (tab === "flights") {
        window.location.href = FLIGHT_RESULTS_PAGE;
        return;
    }

    if (tab === "hotels") {
        window.location.href = HOTEL_RESULTS_PAGE;
        return;
    }

    if (tab === "packages") {
        window.location.href = PACKAGE_RESULTS_PAGE;
        return;
    }

    window.location.href = EXPERIENCE_RESULTS_PAGE;
}

function persistSearchValues() {
    const flightTravellers = readNumericValue("flight-travellers", "1");
    let hotelRooms = Number(readNumericValue("hotel-rooms", "1"));
    let hotelGuests = Number(readNumericValue("hotel-guests", "2"));
    let packageRooms = Number(readNumericValue("package-rooms", "1"));
    let packageGuests = Number(readNumericValue("package-guests", "2"));

    if (hotelGuests > hotelRooms * 4) {
        hotelRooms = Math.ceil(hotelGuests / 4);
        const roomsEl = document.getElementById("hotel-rooms");
        if (roomsEl) roomsEl.value = hotelRooms;
        showToast(`Rooms adjusted to ${hotelRooms} to accommodate ${hotelGuests} guests (max 4 per room)`);
    }

    if (packageGuests > packageRooms * 4) {
        packageRooms = Math.ceil(packageGuests / 4);
        const roomsEl = document.getElementById("package-rooms");
        if (roomsEl) roomsEl.value = packageRooms;
        showToast(`Rooms adjusted to ${packageRooms} to accommodate ${packageGuests} guests (max 4 per room)`);
    }

    searchState.values.flights = {
        from: readValue("flight-from"),
        to: readValue("flight-to"),
        departure: readValue("flight-departure"),
        returnDate: readValue("flight-return"),
        travellers: formatTravellerSummary(flightTravellers)
    };

    searchState.values.hotels = {
        city: readValue("hotel-city"),
        checkIn: readValue("hotel-checkin"),
        checkOut: readValue("hotel-checkout"),
        rooms: String(hotelRooms),
        guestCount: String(hotelGuests),
        guests: formatRoomsGuests(String(hotelRooms), String(hotelGuests))
    };

    searchState.values.packages = {
        destination: readValue("package-destination"),
        departureDate: readValue("package-departure"),
        rooms: String(packageRooms),
        guestCount: String(packageGuests),
        guests: formatRoomsGuests(String(packageRooms), String(packageGuests))
    };

    searchState.values.experiences = {
        destination: readValue("experience-destination"),
        activityDate: readValue("experience-date")
    };
}

function getSearchOutcome(tab) {
    if (tab === "flights") {
        const values = searchState.values.flights;
        const errors = {};

        if (!values.from) errors["flight-from-error"] = "Enter a departure airport";
        if (!values.to) errors["flight-to-error"] = "Enter a destination";
        if (!values.departure) errors["flight-departure-error"] = "Choose a departure date";
        if (!values.travellers) errors["flight-travellers-error"] = "Add traveller details";
        if (searchState.tripType === "Round Trip" && !values.returnDate) {
            errors["flight-return-error"] = "Choose a return date";
        }
        if (searchState.tripType === "Round Trip" && values.departure && values.returnDate && !isDateAfter(values.departure, values.returnDate)) {
            errors["flight-return-error"] = "Return date must be after departure";
        }

        const results = travelerData.searchCatalog.flights.filter(item =>
            includesText(item.origin, values.from) && includesText(item.destination, values.to)
        );

        return {
            errors,
            summary: `Flights from ${values.from} to ${values.to} for ${values.travellers}`,
            results
        };
    }

    if (tab === "hotels") {
        const values = searchState.values.hotels;
        const errors = {};

        if (!values.city) errors["hotel-city-error"] = "Enter a city or hotel name";
        if (!values.checkIn) errors["hotel-checkin-error"] = "Choose a check-in date";
        if (!values.checkOut) errors["hotel-checkout-error"] = "Choose a check-out date";
        if (!values.rooms) errors["hotel-rooms-error"] = "Add rooms";
        if (!values.guestCount) errors["hotel-guests-error"] = "Add guests";
        if (values.checkIn && values.checkOut && !isDateAfter(values.checkIn, values.checkOut)) {
            errors["hotel-checkout-error"] = "Check-out must be after check-in";
        }

        const results = travelerData.searchCatalog.hotels.filter(item =>
            includesText(item.city, values.city) || includesText(item.name, values.city)
        );

        return {
            errors,
            summary: `Hotels in ${values.city} for ${formatRoomsGuests(values.rooms, values.guestCount)}`,
            results
        };
    }

    if (tab === "packages") {
        const values = searchState.values.packages;
        const errors = {};

        if (!values.destination) errors["package-destination-error"] = "Enter a destination";
        if (!values.destination) errors["package-destination-error"] = "Choose a destination";
        if (!values.departureDate) errors["package-departure-error"] = "Choose a departure date";
        if (!values.rooms) errors["package-rooms-error"] = "Add rooms";
        if (!values.guestCount) errors["package-guests-error"] = "Add guests";

        const results = travelerData.searchCatalog.packages.filter(item =>
            includesText(item.destination, values.destination)
        );

        return {
            errors,
            summary: `Holiday packages to ${values.destination}`,
            results
        };
    }

    const values = searchState.values.experiences;
    const errors = {};

    if (!values.destination) errors["experience-destination-error"] = "Choose a destination";
    if (!values.activityDate) errors["experience-date-error"] = "Choose an activity date";

    const results = travelerData.searchCatalog.experiences.filter(item =>
        includesText(item.destination, values.destination) || includesText(item.title, values.destination)
    );

    return {
        errors,
        summary: `Experiences in ${values.destination} on ${formatReadableDate(values.activityDate)}`,
        results
    };
}

function renderSearchErrors(errors) {
    Object.entries(errors).forEach(([id, message]) => {
        const node = document.getElementById(id);
        if (node) {
            node.textContent = message;
        }
    });
}

function clearSearchErrors() {
    document.querySelectorAll(".search-field-error").forEach(error => {
        error.textContent = "";
    });
}

function readValue(id) {
    const node = document.getElementById(id);
    return node ? node.value.trim() : "";
}

function readNumericValue(id, fallback) {
    const raw = readValue(id).replace(/[^\d]/g, "");
    return raw || fallback;
}

function bindIntegerField(id, min, max) {
    const field = document.getElementById(id);
    if (!field) return;

    field.addEventListener("input", () => {
        const digitsOnly = field.value.replace(/[^\d]/g, "");

        if (!digitsOnly) {
            field.value = "";
            return;
        }

        const clamped = Math.min(max, Math.max(min, Number.parseInt(digitsOnly, 10)));
        field.value = String(clamped);
    });
}

function bindDateRangeField(startId, endId) {
    const startField = document.getElementById(startId);
    const endField = document.getElementById(endId);
    if (!startField || !endField) return;

    const syncMin = () => {
        const nextDate = getNextDateValue(startField.value);
        if (nextDate) {
            endField.min = nextDate;
        } else {
            endField.removeAttribute("min");
        }
    };

    startField.addEventListener("input", syncMin);
    startField.addEventListener("change", syncMin);
    syncMin();
}

function includesText(source, input) {
    return String(source || "").toLowerCase().includes(String(input || "").toLowerCase());
}

function formatReadableDate(dateString) {
    if (!dateString) return "the selected date";
    return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function formatRoomsGuests(rooms, guests) {
    const roomCount = Math.max(1, Number.parseInt(rooms, 10) || 1);
    const guestCount = Math.max(1, Number.parseInt(guests, 10) || 1);
    return `${roomCount} Room${roomCount === 1 ? "" : "s"}, ${guestCount} Guest${guestCount === 1 ? "" : "s"}`;
}

function formatTravellerSummary(travellers) {
    const travellerCount = Math.max(1, Number.parseInt(travellers, 10) || 1);
    return `${travellerCount} Traveller${travellerCount === 1 ? "" : "s"}, Economy`;
}

function parseTravellerCount(summary) {
    const text = String(summary || "");
    const match = text.match(/(\d+)/);
    return match ? match[1] : "1";
}

function isDateAfter(startDate, endDate) {
    if (!startDate || !endDate) return true;
    return new Date(`${endDate}T00:00:00`) > new Date(`${startDate}T00:00:00`);
}

function getNextDateValue(dateString) {
    if (!dateString) return "";
    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "";
    date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 10);
}

function parseRoomsGuestsSummary(summary) {
    const text = String(summary || "");
    const roomMatch = text.match(/(\d+)\s*Rooms?/i);
    const guestMatch = text.match(/(\d+)\s*Guests?/i);

    return {
        rooms: roomMatch ? roomMatch[1] : "1",
        guestCount: guestMatch ? guestMatch[1] : "2"
    };
}

function initializeSearchState() {
    if (typeof localStorage === "undefined") return;

    const stored = localStorage.getItem(SEARCH_STORAGE_KEY);
    if (!stored) return;

    try {
        const parsed = JSON.parse(stored);
        Object.assign(searchState, parsed);
        const cleanValues = (obj) => {
            if (!obj) return {};
            const cleanObj = { ...obj };
            const scrubWords = ["undefined", "mumbai", "kerala", "goa", "jaipur", "delhi"];
            for (const key in cleanObj) {
                if (typeof cleanObj[key] === "string" && scrubWords.includes(cleanObj[key].toLowerCase())) {
                    cleanObj[key] = "";
                }
            }
            return cleanObj;
        };

        const flightValues = cleanValues(searchState.values?.flights);
        const hotelValues = cleanValues(searchState.values?.hotels);
        const parsedHotelOccupancy = parseRoomsGuestsSummary(hotelValues.guests);
        const packageValues = cleanValues(searchState.values?.packages);
        const parsedPackageOccupancy = parseRoomsGuestsSummary(packageValues.guests);
        const experienceValues = cleanValues(searchState.values?.experiences);

        searchState.values.flights = {
            ...flightValues,
            travellers: formatTravellerSummary(parseTravellerCount(flightValues.travellers))
        };
        searchState.values.hotels = {
            ...hotelValues,
            rooms: hotelValues.rooms || parsedHotelOccupancy.rooms,
            guestCount: hotelValues.guestCount || parsedHotelOccupancy.guestCount,
            guests: formatRoomsGuests(
                hotelValues.rooms || parsedHotelOccupancy.rooms,
                hotelValues.guestCount || parsedHotelOccupancy.guestCount
            )
        };
        searchState.values.packages = {
            ...packageValues,
            rooms: packageValues.rooms || parsedPackageOccupancy.rooms,
            guestCount: packageValues.guestCount || parsedPackageOccupancy.guestCount,
            guests: formatRoomsGuests(
                packageValues.rooms || parsedPackageOccupancy.rooms,
                packageValues.guestCount || parsedPackageOccupancy.guestCount
            )
        };
        searchState.values.experiences = experienceValues;
    } catch (error) {
        console.warn("Unable to restore traveler search state", error);
    }
}

export function showToast(message) {
    let toast = document.getElementById("wishlist-toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "wishlist-toast";
        toast.className = "toast-notification";
        toast.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            <span id="toast-message"></span>
        `;
        document.body.appendChild(toast);
    }

    document.getElementById("toast-message").textContent = message;

    toast.classList.remove("show");

    // Force reflow
    void toast.offsetWidth;

    toast.classList.add("show");

    if (toast.timeoutId) clearTimeout(toast.timeoutId);
    toast.timeoutId = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}
