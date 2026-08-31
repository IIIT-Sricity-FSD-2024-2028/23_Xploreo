// Non-Technical Admin - Manage Travel Packages (Full CRUD)
import { nontechAdminData } from "../api/legacyData.js";
import { createPlan, updatePlan, deletePlan, fetchPlans, fetchHotels, fetchExperiences, fetchCities } from "../api/services.js";

let currentEditId = null;
let currentDeleteId = null;
let featuresList = [];
let planUploadedImageUrl = null;

export async function initNtaPlans() {
    console.log("Initializing Non-Technical Admin Travel Packages Page...");

    // Initialize data from backend
    try {
        const backendPlans = await fetchPlans();
        const mappedPlans = backendPlans.map(plan => ({
            id: plan.id,
            name: plan.title,
            description: plan.description,
            price: plan.pricePerPerson,
            duration: `${plan.durationNights} Days / ${plan.durationNights - 1 > 0 ? plan.durationNights - 1 : 0} Night`,
            destination: plan.destination,
            category: plan.category || "Tours",
            features: plan.tags || [],
            hotelId: plan.itinerary?.day1?.hotel?.hotelId || "",
            experienceIds: (plan.itinerary?.days || []).flatMap(d => (d.experiences || []).map(e => e.experienceId)).filter(Boolean),
            status: plan.isActive !== false ? "available" : "unavailable",
            createdAt: plan.createdAt || new Date().toISOString()
        }));
        localStorage.setItem("ntaPlans", JSON.stringify(mappedPlans));
    } catch (e) {
        console.warn("Failed to fetch plans from backend, falling back to local data", e);
        if (!localStorage.getItem("ntaPlans")) {
            localStorage.setItem("ntaPlans", JSON.stringify(nontechAdminData.plans));
        }
    }

    if (!localStorage.getItem("ntaActivity")) {
        localStorage.setItem("ntaActivity", JSON.stringify(nontechAdminData.recentActivity));
    }

    renderHeader();
    renderToolbar();
    renderPlansTable();
    setupEventListeners();
}

function renderHeader() {
    const header = document.getElementById("nta-plans-header");
    if (header) {
        header.innerHTML = `
            <div class="nta-page-header">
                <h1>Manage Travel Packages</h1>
                <p>Create, edit, and manage your travel packages and experiences.</p>
            </div>
        `;
    }
}

function renderToolbar() {
    const toolbar = document.getElementById("nta-plans-toolbar");
    if (toolbar) {
        toolbar.innerHTML = `
            <div class="nta-toolbar">
                <div class="nta-toolbar-left">
                    <input type="text" class="nta-search-input" id="nta-search" placeholder="Search packages by name or destination..." oninput="window.ntaSearchPlans()">
                    <select class="nta-filter-select" id="nta-status-filter" onchange="window.ntaFilterPlans()">
                        <option value="all">All Availability</option>
                        <option value="available">Available Only</option>
                        <option value="unavailable">Unavailable Only</option>
                    </select>
                </div>
                <button class="nta-create-btn" onclick="window.ntaOpenCreateModal()">
                    <span>＋</span>
                    Create New Package
                </button>
            </div>
        `;
    }
}

function renderPlansTable(filteredPlans) {
    const container = document.getElementById("nta-plans-container");
    if (!container) return;

    const plans = filteredPlans || JSON.parse(localStorage.getItem("ntaPlans")) || [];

    if (plans.length === 0) {
        container.innerHTML = `
            <div class="nta-empty-state">
                <div class="empty-icon">📦</div>
                <p>No packages found. Create your first travel package to get started!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <table class="nta-plans-table">
            <thead>
                <tr>
                    <th>Package Name</th>
                    <th>Price</th>
                    <th>Duration</th>
                    <th>Availability</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${plans.map(plan => `
                    <tr>
                        <td data-label="Package Name">
                            <div>
                                <div class="nta-plan-name">${plan.name}</div>
                                <div class="nta-plan-desc">${plan.description}</div>
                            </div>
                        </td>
                        <td data-label="Price">
                            <span class="nta-plan-price">₹${plan.price.toLocaleString()}</span>
                        </td>
                        <td data-label="Duration">
                            <span class="nta-plan-duration">${plan.duration}</span>
                        </td>
                        <td data-label="Availability">
                            <span class="nta-status-pill ${plan.status}">${plan.status === 'available' ? 'Available' : 'Unavailable'}</span>
                        </td>
                        <td data-label="Actions">
                            <div class="nta-action-group">
                                <button class="nta-action-btn edit" onclick="window.ntaEditPlan('${plan.id}')">✏️ Edit</button>
                                <button class="nta-action-btn delete" onclick="window.ntaDeletePlan('${plan.id}')">🗑️ Delete</button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

async function openCreateModal() {
    currentEditId = null;
    featuresList = [];
    planUploadedImageUrl = null;
    const [hotels, experiences, cities] = await Promise.all([
        fetchHotels().catch(() => []),
        fetchExperiences().catch(() => []),
        fetchCities().catch(() => [])
    ]);

    renderPlanModal("Create New Package", {
        name: "",
        description: "",
        price: "",
        duration: "",
        destination: "",
        category: "",
        features: [],
        hotelId: "",
        experienceIds: [],
        status: "available",
        image: ""
    }, hotels, experiences, cities);
}

async function openEditModal(planId) {
    const plans = JSON.parse(localStorage.getItem("ntaPlans")) || [];
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    currentEditId = planId;
    featuresList = [...(plan.features || [])];
    planUploadedImageUrl = plan.image || null;

    const [hotels, experiences, cities] = await Promise.all([
        fetchHotels().catch(() => []),
        fetchExperiences().catch(() => []),
        fetchCities().catch(() => [])
    ]);

    renderPlanModal("Edit Package", plan, hotels, experiences, cities);
}

function renderPlanModal(title, plan, availableHotels = [], availableExperiences = [], availableCities = []) {
    const modal = document.getElementById("nta-plan-modal");
    if (!modal) return;

    featuresList = plan.features || [];

    const categories = ["Adventure", "Family", "International", "Weekend Getaway", "Luxury", "Honeymoon", "Pilgrimage"];
    const allDestinations = [...new Set([
        ...availableCities.map(c => c.name),
        ...availableHotels.map(h => h.city),
        ...availableExperiences.map(e => e.location || e.destination),
        "Goa", "Mumbai", "Delhi", "Jaipur", "Kerala", "Manali", "Bangalore", "Alleppey"
    ].filter(Boolean))].sort();

    modal.innerHTML = `
        <div class="nta-modal">
            <div class="nta-modal-header">
                <h2>${title}</h2>
                <button class="nta-modal-close" onclick="window.ntaCloseModal()">&times;</button>
            </div>

            <div class="nta-form-group">
                <label for="plan-name">Package Name</label>
                <input type="text" id="plan-name" placeholder="e.g., Himalayan Trek Adventure" value="${plan.name || ''}">
                <div class="nta-form-hint">Give your travel package a catchy, descriptive name.</div>
            </div>

            <div class="nta-form-group">
                <label for="plan-desc">Description</label>
                <textarea id="plan-desc" placeholder="Briefly describe the travel experience, destinations, and highlights...">${plan.description || ''}</textarea>
            </div>

            <div class="nta-form-row">
                <div class="nta-form-group">
                    <label for="plan-price">Price (₹)</label>
                    <input type="number" id="plan-price" placeholder="e.g., 18999" value="${plan.price || ''}">
                </div>
                <div class="nta-form-group">
                    <label for="plan-duration">Duration</label>
                    <select id="plan-duration">
                        <option value="" disabled ${!plan.duration ? 'selected' : ''}>Select duration</option>
                        <option value="2 Days / 1 Night" ${plan.duration === '2 Days / 1 Night' ? 'selected' : ''}>2 Days / 1 Night</option>
                        <option value="3 Days / 2 Nights" ${plan.duration === '3 Days / 2 Nights' ? 'selected' : ''}>3 Days / 2 Nights</option>
                        <option value="4 Days / 3 Nights" ${plan.duration === '4 Days / 3 Nights' ? 'selected' : ''}>4 Days / 3 Nights</option>
                        <option value="5 Days / 4 Nights" ${plan.duration === '5 Days / 4 Nights' ? 'selected' : ''}>5 Days / 4 Nights</option>
                        <option value="7 Days / 6 Nights" ${plan.duration === '7 Days / 6 Nights' ? 'selected' : ''}>7 Days / 6 Nights</option>
                        <option value="10 Days / 9 Nights" ${plan.duration === '10 Days / 9 Nights' ? 'selected' : ''}>10 Days / 9 Nights</option>
                        <option value="12 Days / 11 Nights" ${plan.duration === '12 Days / 11 Nights' ? 'selected' : ''}>12 Days / 11 Nights</option>
                        <option value="15 Days / 14 Nights" ${plan.duration === '15 Days / 14 Nights' ? 'selected' : ''}>15 Days / 14 Nights</option>
                    </select>
                </div>
            </div>

            <div class="nta-form-row">
                <div class="nta-form-group">
                    <label for="plan-destination">Destination</label>
                    <select id="plan-destination">
                        <option value="" disabled ${!plan.destination ? 'selected' : ''}>Select destination</option>
                        ${allDestinations.map(dest => `
                            <option value="${dest}" ${plan.destination === dest ? 'selected' : ''}>${dest}</option>
                        `).join('')}
                    </select>
                    <div class="nta-form-hint">Choose destination city for this package.</div>
                </div>
                <div class="nta-form-group">
                    <label for="plan-category">Category</label>
                    <select id="plan-category">
                        <option value="" disabled ${!plan.category ? 'selected' : ''}>Select category</option>
                        ${categories.map(cat => `
                            <option value="${cat}" ${plan.category === cat ? 'selected' : ''}>${cat}</option>
                        `).join('')}
                    </select>
                </div>
            </div>

            <div class="nta-form-group">
                <label for="plan-hotel">Select Partner Hotel</label>
                <select id="plan-hotel">
                    <option value="" disabled ${!plan.hotelId ? 'selected' : ''}>Select an existing hotel</option>
                    ${availableHotels.map(h => `
                        <option value="${h.id}" data-city="${h.city || ''}" ${plan.hotelId === h.id ? 'selected' : ''}>
                            ${h.name} (${h.city}) - ₹${h.pricePerNight}/night [${h.stars}★]
                        </option>
                    `).join('')}
                </select>
                <div class="nta-form-hint">Choose an active partner hotel to include in this package.</div>
            </div>

            <div class="nta-form-group">
                <label>Select Partner Experiences / Guided Activities</label>
                <div id="plan-experiences-list" style="display:flex; flex-direction:column; gap:6px; max-height:140px; overflow-y:auto; border:1px solid #e5e7eb; padding:8px; border-radius:6px; background:#fafafa;">
                    ${availableExperiences.length ? availableExperiences.map(e => `
                        <label style="display:flex; align-items:center; gap:8px; font-size:13px; color:#374151; cursor:pointer;">
                            <input type="checkbox" name="plan-experience-item" value="${e.id}" data-title="${e.title}" ${(plan.experienceIds || []).includes(e.id) ? 'checked' : ''}>
                            <span><strong>${e.title}</strong> (${e.location || e.city || 'Standard'}) - ₹${e.price}</span>
                        </label>
                    `).join('') : '<p style="font-size:12px; color:#9ca3af; margin:0;">No partner experiences available</p>'}
                </div>
                <div class="nta-form-hint">Tick existing partner experiences to include in the itinerary.</div>
            </div>

            <div class="nta-form-group">
                <label>Included Features</label>
                <div id="features-tags" class="nta-features-container">
                    ${featuresList.map((f, i) => `
                        <span class="nta-feature-tag">
                            ${f}
                            <span class="remove-feature" onclick="window.ntaRemoveFeature(${i})">&times;</span>
                        </span>
                    `).join('')}
                </div>
                <div class="nta-feature-input-row">
                    <input type="text" id="feature-input" placeholder="Type a feature and click Add">
                    <button class="nta-add-feature-btn" onclick="window.ntaAddFeature()">+ Add</button>
                </div>
                <div class="nta-form-hint">Add what's included, like "Hotel stay", "Meals", "Guide", "Transport".</div>
            </div>

            <div class="nta-form-group">
                <label for="plan-image">Package Image (Optional)</label>
                <input type="file" id="plan-image" accept="image/*">
                <div id="plan-image-preview" class="nta-image-preview" style="margin-top: 10px;">
                    ${plan.image ? `<img src="${plan.image}" alt="Package Image" style="max-width: 120px; border-radius: 4px;" onerror="this.style.display='none'">` : `<div style="display:flex; align-items:center; justify-content:center; background:#f5f5f5; color:#999; border-radius:4px; width:120px; height:80px; font-size:12px;">No Image</div>`}
                </div>
                <div class="nta-form-hint">Upload an image for this package. If you skip this, no image will be shown.</div>
            </div>

            <div class="nta-form-group">
                <label>Availability</label>
                <div class="nta-toggle-wrap">
                    <label class="nta-toggle">
                        <input type="checkbox" id="plan-status" ${plan.status === 'available' ? 'checked' : ''}>
                        <span class="nta-toggle-slider"></span>
                    </label>
                    <span class="nta-toggle-label" id="toggle-label">${plan.status === 'available' ? 'Available' : 'Unavailable'}</span>
                </div>
            </div>

            <div class="nta-modal-actions">
                <button class="nta-btn-cancel" onclick="window.ntaCloseModal()">Cancel</button>
                <button class="nta-btn-save" onclick="window.ntaSavePlan()">
                    ${currentEditId ? 'Save Changes' : 'Create Package'}
                </button>
            </div>
        </div>
    `;

    modal.classList.add("active");

    // Auto-sync destination when hotel is selected
    const hotelSelect = document.getElementById("plan-hotel");
    const destSelect = document.getElementById("plan-destination");
    if (hotelSelect && destSelect) {
        hotelSelect.addEventListener("change", () => {
            const selectedOpt = hotelSelect.options[hotelSelect.selectedIndex];
            const city = selectedOpt?.dataset?.city;
            if (city && destSelect.querySelector(`option[value="${city}"]`)) {
                destSelect.value = city;
            }
        });
    }

    // Toggle label listener
    const toggleInput = document.getElementById("plan-status");
    const toggleLabel = document.getElementById("toggle-label");
    if (toggleInput && toggleLabel) {
        toggleInput.addEventListener("change", () => {
            toggleLabel.textContent = toggleInput.checked ? "Available" : "Unavailable";
        });
    }

    // Enter key for features
    const featureInput = document.getElementById("feature-input");
    if (featureInput) {
        featureInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                window.ntaAddFeature();
            }
        });
    }

    // Image upload handler
    const imageInput = document.getElementById("plan-image");
    const imagePreview = document.getElementById("plan-image-preview");
    if (imageInput && imagePreview) {
        imageInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    planUploadedImageUrl = e.target.result;
                    imagePreview.innerHTML = `<img src="${planUploadedImageUrl}" alt="Package Image" style="max-width: 120px; border-radius: 4px;" onerror="this.style.display='none'">`;
                };
                reader.readAsDataURL(file);
            } else {
                planUploadedImageUrl = currentEditId ? JSON.parse(localStorage.getItem("ntaPlans"))?.find(p => p.id === currentEditId)?.image || "" : "";
                imagePreview.innerHTML = planUploadedImageUrl ? `<img src="${planUploadedImageUrl}" alt="Package Image" style="max-width: 120px; border-radius: 4px;" onerror="this.style.display='none'">` : '';
            }
        });
    }
}

function openDeleteModal(planId) {
    const plans = JSON.parse(localStorage.getItem("ntaPlans")) || [];
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    currentDeleteId = planId;

    const modal = document.getElementById("nta-delete-modal");
    if (!modal) return;

    modal.innerHTML = `
        <div class="nta-modal nta-delete-modal">
            <div class="nta-delete-icon">⚠️</div>
            <h2>Remove this package?</h2>
            <p>
                You're about to delete <strong>"${plan.name}"</strong>. 
                This action cannot be undone. Any upcoming bookings for this package will need to be handled separately.
            </p>
            <div class="nta-delete-actions">
                <button class="nta-btn-cancel" onclick="window.ntaCloseDeleteModal()">Keep Package</button>
                <button class="nta-btn-delete" onclick="window.ntaConfirmDelete()">Yes, Delete</button>
            </div>
        </div>
    `;

    modal.classList.add("active");
}

function savePlan() {
    const name = document.getElementById("plan-name")?.value?.trim();
    const description = document.getElementById("plan-desc")?.value?.trim();
    const price = parseFloat(document.getElementById("plan-price")?.value);
    const duration = document.getElementById("plan-duration")?.value;
    const destination = document.getElementById("plan-destination")?.value?.trim();
    const category = document.getElementById("plan-category")?.value;
    const statusChecked = document.getElementById("plan-status")?.checked;
    const hotelSelect = document.getElementById("plan-hotel");
    const selectedHotelId = hotelSelect?.value || "";
    const selectedHotelName = hotelSelect?.options[hotelSelect.selectedIndex]?.text?.split(" (")[0] || "Partner Hotel";

    const selectedExpCheckboxes = Array.from(document.querySelectorAll('input[name="plan-experience-item"]:checked'));
    const selectedExpIds = selectedExpCheckboxes.map(cb => cb.value);
    const selectedExpTitles = selectedExpCheckboxes.map(cb => cb.dataset.title || cb.value);

    // Validation
    if (!name) { alert("Please enter a package name."); return; }
    if (!description) { alert("Please enter a description."); return; }
    if (isNaN(price) || price <= 0) { alert("Please enter a valid price."); return; }
    if (!duration) { alert("Please select a duration."); return; }
    if (!destination) { alert("Please enter a destination."); return; }
    if (!category) { alert("Please select a category."); return; }
    if (!selectedHotelId) { alert("Please select a partner hotel."); return; }

    const structuredItinerary = {
        day1: {
            flight: null,
            transport: {
                id: "trans-1",
                provider: "Partner Transport",
                vehicleType: "Cab",
                pickupLocation: destination,
                dropoffLocation: destination,
                pickupAt: "10:00 AM",
                status: "confirmed"
            },
            hotel: {
                id: `hotel-${selectedHotelId}`,
                hotelId: selectedHotelId,
                name: selectedHotelName,
                checkInDate: "",
                checkOutDate: "",
                roomType: "Standard Room",
                status: "confirmed"
            }
        },
        days: [
            {
                dayNumber: 2,
                experiences: selectedExpIds.map((expId, idx) => ({
                    id: `exp-${expId}`,
                    experienceId: expId,
                    title: selectedExpTitles[idx] || "Guided Activity",
                    location: destination,
                    startsAt: "10:00 AM",
                    endsAt: "01:00 PM",
                    status: "confirmed"
                }))
            }
        ]
    };

    let plans = JSON.parse(localStorage.getItem("ntaPlans")) || [];
    let activityLog = JSON.parse(localStorage.getItem("ntaActivity")) || [];

    if (currentEditId) {
        // UPDATE
        const idx = plans.findIndex(p => p.id === currentEditId);
        if (idx !== -1) {
            plans[idx] = {
                ...plans[idx],
                name, description, price, duration, destination, category,
                hotelId: selectedHotelId,
                experienceIds: selectedExpIds,
                features: [...featuresList],
                status: statusChecked ? "available" : "unavailable",
                image: planUploadedImageUrl || ""
            };

            activityLog.unshift({ id: Date.now(), action: "Package updated", detail: `"${name}" was updated`, user: getCurrentUserName(), timestamp: new Date().toISOString(), type: "update" });
            
            // Sync to backend
            updatePlan(currentEditId, {
                title: name,
                description,
                pricePerPerson: Number(price),
                durationNights: parseInt(duration) || 3,
                destination,
                originCity: "Any",
                tags: featuresList,
                itinerary: structuredItinerary,
                image: planUploadedImageUrl || ""
            }).catch(e => console.warn("Failed to sync plan update to backend", e));
        }
    } else {
        // CREATE
        const newId = "PKG-" + String(plans.length + 1).padStart(3, "0");
        const newPlan = {
            id: newId,
            name, description, price, duration, destination, category,
            hotelId: selectedHotelId,
            experienceIds: selectedExpIds,
            features: [...featuresList],
            status: statusChecked ? "available" : "unavailable",
            createdAt: new Date().toISOString(),
            image: planUploadedImageUrl || ""
        };
        plans.push(newPlan);

        activityLog.unshift({ id: Date.now(), action: "Package created", detail: `"${name}" was added`, user: getCurrentUserName(), timestamp: new Date().toISOString(), type: "create" });
        
        // Sync to backend
        createPlan({
            id: newId,
            title: name,
            description,
            pricePerPerson: Number(price),
            durationNights: parseInt(duration) || 3,
            destination,
            originCity: "Any",
            tags: featuresList,
            itinerary: structuredItinerary,
            image: planUploadedImageUrl || ""
        }).catch(e => console.warn("Failed to sync plan creation to backend", e));
    }

    localStorage.setItem("ntaPlans", JSON.stringify(plans));
    localStorage.setItem("ntaActivity", JSON.stringify(activityLog));

    closeModal();
    renderPlansTable();
}

function confirmDelete() {
    if (!currentDeleteId) return;

    let plans = JSON.parse(localStorage.getItem("ntaPlans")) || [];
    let activityLog = JSON.parse(localStorage.getItem("ntaActivity")) || [];
    const plan = plans.find(p => p.id === currentDeleteId);

    plans = plans.filter(p => p.id !== currentDeleteId);
    localStorage.setItem("ntaPlans", JSON.stringify(plans));

    if (plan) {
        activityLog.unshift({
            id: Date.now(),
            action: "Package deleted",
            detail: `"${plan.name}" was removed`,
            user: getCurrentUserName(),
            timestamp: new Date().toISOString(),
            type: "status"
        });
        localStorage.setItem("ntaActivity", JSON.stringify(activityLog));

        // Sync to backend
        deletePlan(currentDeleteId).catch(e => console.warn("Failed to sync plan deletion to backend", e));
    }

    currentDeleteId = null;
    closeDeleteModal();
    renderPlansTable();
}

function addFeature() {
    const input = document.getElementById("feature-input");
    const val = input?.value?.trim();
    if (!val) return;

    featuresList.push(val);
    input.value = "";
    refreshFeatureTags();
}

function removeFeature(index) {
    featuresList.splice(index, 1);
    refreshFeatureTags();
}

function refreshFeatureTags() {
    const container = document.getElementById("features-tags");
    if (!container) return;

    container.innerHTML = featuresList.map((f, i) => `
        <span class="nta-feature-tag">
            ${f}
            <span class="remove-feature" onclick="window.ntaRemoveFeature(${i})">&times;</span>
        </span>
    `).join('');
}

function closeModal() {
    const modal = document.getElementById("nta-plan-modal");
    if (modal) {
        modal.classList.remove("active");
        setTimeout(() => { modal.innerHTML = ""; }, 300);
    }
    currentEditId = null;
    featuresList = [];
}

function closeDeleteModal() {
    const modal = document.getElementById("nta-delete-modal");
    if (modal) {
        modal.classList.remove("active");
        setTimeout(() => { modal.innerHTML = ""; }, 300);
    }
    currentDeleteId = null;
}

function searchPlans() {
    const query = document.getElementById("nta-search")?.value?.toLowerCase() || "";
    const statusFilter = document.getElementById("nta-status-filter")?.value || "all";

    let plans = JSON.parse(localStorage.getItem("ntaPlans")) || [];

    if (query) {
        plans = plans.filter(p => p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query) || (p.destination && p.destination.toLowerCase().includes(query)));
    }
    if (statusFilter !== "all") {
        plans = plans.filter(p => p.status === statusFilter);
    }

    renderPlansTable(plans);
}

function filterPlans() {
    searchPlans(); // Reuse combined filtering
}

function getCurrentUserName() {
    const user = JSON.parse(localStorage.getItem("currentUser"));
    return user ? user.name : "Admin";
}

function setupEventListeners() {
    // Expose to global scope for inline handlers
    window.ntaOpenCreateModal = openCreateModal;
    window.ntaEditPlan = openEditModal;
    window.ntaDeletePlan = openDeleteModal;
    window.ntaSavePlan = savePlan;
    window.ntaConfirmDelete = confirmDelete;
    window.ntaCloseModal = closeModal;
    window.ntaCloseDeleteModal = closeDeleteModal;
    window.ntaAddFeature = addFeature;
    window.ntaRemoveFeature = removeFeature;
    window.ntaSearchPlans = searchPlans;
    window.ntaFilterPlans = filterPlans;
}
