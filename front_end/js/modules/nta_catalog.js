import { apiGet } from "../api/http.js";
import { API_ENDPOINTS } from "../api/contracts.js";
import { formatCurrency } from "./experience_shared.js";

let allHotels = [];
let allExperiences = [];

export async function initNtaCatalogPage(containerId) {
    const main = document.getElementById(containerId);
    if (!main) return;
    
    // Fetch data concurrently
    try {
        const [hotelsRes, experiencesRes] = await Promise.all([
            apiGet(API_ENDPOINTS.hotels).catch(() => []),
            apiGet(API_ENDPOINTS.experiences).catch(() => [])
        ]);

        // Clean up response wrappers if any
        allHotels = Array.isArray(hotelsRes) ? hotelsRes : (hotelsRes?.data || []);
        let rawExperiences = Array.isArray(experiencesRes) ? experiencesRes : (experiencesRes?.data || []);
        
        // Flatten nested experiences if needed
        allExperiences = [];
        rawExperiences.forEach(item => {
           if (item.experiences && Array.isArray(item.experiences)) {
               allExperiences.push(...item.experiences);
           } else {
               allExperiences.push(item);
           }
        });

    } catch (e) {
        console.error("Failed to load catalog data", e);
    }

    setupEventListeners();
    applyFiltersAndRender();
}

function setupEventListeners() {
    document.getElementById("applyFiltersBtn")?.addEventListener("click", applyFiltersAndRender);
    document.getElementById("clearFiltersBtn")?.addEventListener("click", clearFilters);
    document.getElementById("sortHotels")?.addEventListener("change", applyFiltersAndRender);
    document.getElementById("sortExperiences")?.addEventListener("change", applyFiltersAndRender);
}

function clearFilters() {
    document.getElementById("filterLocation").value = "";
    document.getElementById("filterPartner").value = "";
    document.getElementById("filterMinPrice").value = "";
    document.getElementById("filterMaxPrice").value = "";
    document.getElementById("sortHotels").value = "default";
    document.getElementById("sortExperiences").value = "default";
    applyFiltersAndRender();
}

function applyFiltersAndRender() {
    const location = document.getElementById("filterLocation")?.value.toLowerCase() || "";
    const partner = document.getElementById("filterPartner")?.value.toLowerCase() || "";
    const minPrice = parseFloat(document.getElementById("filterMinPrice")?.value) || 0;
    const maxPrice = parseFloat(document.getElementById("filterMaxPrice")?.value) || Infinity;
    
    const sortH = document.getElementById("sortHotels")?.value || "default";
    const sortE = document.getElementById("sortExperiences")?.value || "default";

    // Filter Hotels
    let filteredHotels = allHotels.filter(h => {
        const hLoc = (h.location || h.city || "").toLowerCase();
        const hPart = (h.partnerId || "").toLowerCase();
        const hPrice = h.pricePerNight || h.price || 0;

        if (location && !hLoc.includes(location)) return false;
        if (partner && !hPart.includes(partner)) return false;
        if (hPrice < minPrice || hPrice > maxPrice) return false;
        return true;
    });

    // Filter Experiences
    let filteredExperiences = allExperiences.filter(e => {
        const eLoc = (e.destination || e.location || "").toLowerCase();
        const ePart = (e.partnerId || "").toLowerCase();
        const ePrice = e.price || 0;

        if (location && !eLoc.includes(location)) return false;
        if (partner && !ePart.includes(partner)) return false;
        if (ePrice < minPrice || ePrice > maxPrice) return false;
        return true;
    });

    // Sort Hotels
    if (sortH === "price_asc") {
        filteredHotels.sort((a, b) => (a.pricePerNight || a.price || 0) - (b.pricePerNight || b.price || 0));
    } else if (sortH === "price_desc") {
        filteredHotels.sort((a, b) => (b.pricePerNight || b.price || 0) - (a.pricePerNight || a.price || 0));
    }

    // Sort Experiences
    if (sortE === "price_asc") {
        filteredExperiences.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortE === "price_desc") {
        filteredExperiences.sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    renderHotels(filteredHotels);
    renderExperiences(filteredExperiences);
}

function renderHotels(hotels) {
    const list = document.getElementById("hotelsList");
    const count = document.getElementById("hotelCount");
    if (!list || !count) return;

    count.textContent = hotels.length;

    if (hotels.length === 0) {
        list.innerHTML = `<div class="empty-state">No hotels match your filters</div>`;
        return;
    }

    list.innerHTML = hotels.map(h => {
        const price = h.pricePerNight || h.price || 0;
        const totalRooms = h.totalRooms || h.rooms?.length || 'N/A';
        const rating = h.rating ? `${h.rating} ★` : 'No rating';
        return `
            <div class="catalog-card no-image">
                <div class="card-details">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <h3 class="card-title">${h.name || h.title || 'Unnamed Hotel'}</h3>
                        <div class="card-price">${formatCurrency(price)} / night</div>
                    </div>
                    <div class="card-meta-grid">
                        <div class="meta-item"><strong>Location:</strong> ${h.location || h.city || 'N/A'}</div>
                        <div class="meta-item"><strong>Partner:</strong> ${h.partnerId || 'Unknown'}</div>
                        <div class="meta-item"><strong>Rooms:</strong> ${totalRooms}</div>
                        <div class="meta-item"><strong>Rating:</strong> ${rating}</div>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

function renderExperiences(experiences) {
    const list = document.getElementById("experiencesList");
    const count = document.getElementById("expCount");
    if (!list || !count) return;

    count.textContent = experiences.length;

    if (experiences.length === 0) {
        list.innerHTML = `<div class="empty-state">No experiences match your filters</div>`;
        return;
    }

    list.innerHTML = experiences.map(e => {
        const price = e.price || 0;
        const duration = e.durationHours ? `${e.durationHours} hours` : 'N/A';
        const capacity = e.capacity ? `${e.capacity} persons` : 'N/A';
        return `
            <div class="catalog-card no-image">
                <div class="card-details">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <h3 class="card-title">${e.title || e.name || 'Unnamed Experience'}</h3>
                        <div class="card-price">${formatCurrency(price)} / person</div>
                    </div>
                    <div class="card-meta-grid">
                        <div class="meta-item"><strong>Location:</strong> ${e.destination || e.location || 'N/A'}</div>
                        <div class="meta-item"><strong>Partner:</strong> ${e.partnerId || 'Unknown'}</div>
                        <div class="meta-item"><strong>Duration:</strong> ${duration}</div>
                        <div class="meta-item"><strong>Capacity:</strong> ${capacity}</div>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}
