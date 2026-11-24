// Non-Technical Admin - Manage Travel Packages (Full CRUD with API)
import { apiGetAndSync, apiFetch } from "../utils/api.js";

const N = (v) => (v == null || isNaN(Number(v))) ? -1 : Number(v);
const S = (v) => (v == null || v === "") ? "#" : String(v);

let currentEditId  = null;
let currentDeleteId = null;
let featuresList   = [];
let _plans         = [];  // in-memory cache, kept in sync after every API call

// ────────────────────────────────────────────────────
// INIT
// ────────────────────────────────────────────────────
export async function initNtaPlans() {
    console.log("Initializing Non-Technical Admin Travel Packages Page...");
    renderHeader();
    renderToolbar();
    setupEventListeners();
    await loadAndRender();   // fetch from backend
}

async function loadAndRender(filteredPlans) {
    if (filteredPlans) {
        renderPlansTable(filteredPlans);
        return;
    }
    _plans = await apiGetAndSync("/plans", "ntaPlans", []);
    if (!Array.isArray(_plans)) _plans = [];
    renderPlansTable(_plans);
}

// ────────────────────────────────────────────────────
// HEADER & TOOLBAR
// ────────────────────────────────────────────────────
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

// ────────────────────────────────────────────────────
// TABLE RENDER
// ────────────────────────────────────────────────────
function renderPlansTable(plans) {
    const container = document.getElementById("nta-plans-container");
    if (!container) return;

    if (!Array.isArray(plans) || plans.length === 0) {
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
                ${plans.map(plan => {
                    const price    = N(plan.price);
                    const name     = S(plan.name);
                    const desc     = S(plan.description);
                    const duration = S(plan.duration);
                    const status   = S(plan.status);
                    return `
                        <tr>
                            <td data-label="Package Name">
                                <div>
                                    <div class="nta-plan-name">${name}</div>
                                    <div class="nta-plan-desc">${desc}</div>
                                </div>
                            </td>
                            <td data-label="Price">
                                <span class="nta-plan-price">${price === -1 ? "-1" : "₹" + price.toLocaleString()}</span>
                            </td>
                            <td data-label="Duration">
                                <span class="nta-plan-duration">${duration}</span>
                            </td>
                            <td data-label="Availability">
                                <span class="nta-status-pill ${status}">
                                    ${status === "available" ? "Available" : status === "#" ? "#" : "Unavailable"}
                                </span>
                            </td>
                            <td data-label="Actions">
                                <div class="nta-action-group">
                                    <button class="nta-action-btn edit" onclick="window.ntaEditPlan('${plan.id}')">✏️ Edit</button>
                                    <button class="nta-action-btn delete" onclick="window.ntaDeletePlan('${plan.id}')">🗑️ Delete</button>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join("")}
            </tbody>
        </table>
    `;
}

// ────────────────────────────────────────────────────
// CREATE / EDIT MODAL
// ────────────────────────────────────────────────────
function openCreateModal() {
    currentEditId = null;
    featuresList  = [];
    renderPlanModal("Create New Package", {
        name: "", description: "", price: "",
        duration: "", destination: "", category: "",
        features: [], status: "available"
    });
}

function openEditModal(planId) {
    const plan = _plans.find(p => String(p.id) === String(planId));
    if (!plan) return;
    currentEditId = planId;
    featuresList  = [...(plan.features || [])];
    renderPlanModal("Edit Package", plan);
}

function renderPlanModal(title, plan) {
    const modal = document.getElementById("nta-plan-modal");
    if (!modal) return;

    featuresList = plan.features || [];
    const categories = ["Adventure", "Family", "International", "Weekend Getaway", "Luxury", "Honeymoon", "Pilgrimage"];

    modal.innerHTML = `
        <div class="nta-modal">
            <div class="nta-modal-header">
                <h2>${title}</h2>
                <button class="nta-modal-close" onclick="window.ntaCloseModal()">&times;</button>
            </div>

            <div class="nta-form-group">
                <label for="plan-name">Package Name</label>
                <input type="text" id="plan-name" placeholder="e.g., Himalayan Trek Adventure" value="${plan.name || ""}">
                <div class="nta-form-hint">Give your travel package a catchy, descriptive name.</div>
            </div>

            <div class="nta-form-group">
                <label for="plan-desc">Description</label>
                <textarea id="plan-desc" placeholder="Briefly describe the travel experience...">${plan.description || ""}</textarea>
            </div>

            <div class="nta-form-row">
                <div class="nta-form-group">
                    <label for="plan-price">Price (₹)</label>
                    <input type="number" id="plan-price" placeholder="e.g., 18999" value="${plan.price || ""}">
                </div>
                <div class="nta-form-group">
                    <label for="plan-duration">Duration</label>
                    <select id="plan-duration">
                        <option value="" disabled ${!plan.duration ? "selected" : ""}>Select duration</option>
                        ${["2 Days / 1 Night","3 Days / 2 Nights","4 Days / 3 Nights","5 Days / 4 Nights","7 Days / 6 Nights","10 Days / 9 Nights","12 Days / 11 Nights","15 Days / 14 Nights"].map(d => `
                            <option value="${d}" ${plan.duration === d ? "selected" : ""}>${d}</option>
                        `).join("")}
                    </select>
                </div>
            </div>

            <div class="nta-form-row">
                <div class="nta-form-group">
                    <label for="plan-destination">Destination</label>
                    <input type="text" id="plan-destination" placeholder="e.g., Manali, Himachal Pradesh" value="${plan.destination || ""}">
                    <div class="nta-form-hint">Enter the main destination or cities covered.</div>
                </div>
                <div class="nta-form-group">
                    <label for="plan-category">Category</label>
                    <select id="plan-category">
                        <option value="" disabled ${!plan.category ? "selected" : ""}>Select category</option>
                        ${categories.map(cat => `
                            <option value="${cat}" ${plan.category === cat ? "selected" : ""}>${cat}</option>
                        `).join("")}
                    </select>
                </div>
            </div>

            <div class="nta-form-group">
                <label>Included Features</label>
                <div id="features-tags" class="nta-features-container">
                    ${featuresList.map((f, i) => `
                        <span class="nta-feature-tag">
                            ${f}
                            <span class="remove-feature" onclick="window.ntaRemoveFeature(${i})">&times;</span>
                        </span>
                    `).join("")}
                </div>
                <div class="nta-feature-input-row">
                    <input type="text" id="feature-input" placeholder="Type a feature and click Add">
                    <button class="nta-add-feature-btn" onclick="window.ntaAddFeature()">+ Add</button>
                </div>
                <div class="nta-form-hint">Add what's included, like "Hotel stay", "Meals", "Guide", "Transport".</div>
            </div>

            <div class="nta-form-group">
                <label>Availability</label>
                <div class="nta-toggle-wrap">
                    <label class="nta-toggle">
                        <input type="checkbox" id="plan-status" ${plan.status === "available" ? "checked" : ""}>
                        <span class="nta-toggle-slider"></span>
                    </label>
                    <span class="nta-toggle-label" id="toggle-label">${plan.status === "available" ? "Available" : "Unavailable"}</span>
                </div>
            </div>

            <div class="nta-modal-actions">
                <button class="nta-btn-cancel" onclick="window.ntaCloseModal()">Cancel</button>
                <button class="nta-btn-save" onclick="window.ntaSavePlan()">
                    ${currentEditId ? "Save Changes" : "Create Package"}
                </button>
            </div>
        </div>
    `;

    modal.classList.add("active");

    const toggleInput = document.getElementById("plan-status");
    const toggleLabel = document.getElementById("toggle-label");
    if (toggleInput && toggleLabel) {
        toggleInput.addEventListener("change", () => {
            toggleLabel.textContent = toggleInput.checked ? "Available" : "Unavailable";
        });
    }

    const featureInput = document.getElementById("feature-input");
    if (featureInput) {
        featureInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") { e.preventDefault(); window.ntaAddFeature(); }
        });
    }
}

// ────────────────────────────────────────────────────
// DELETE MODAL
// ────────────────────────────────────────────────────
function openDeleteModal(planId) {
    const plan = _plans.find(p => String(p.id) === String(planId));
    if (!plan) return;

    currentDeleteId = planId;

    const modal = document.getElementById("nta-delete-modal");
    if (!modal) return;

    modal.innerHTML = `
        <div class="nta-modal nta-delete-modal">
            <div class="nta-delete-icon">⚠️</div>
            <h2>Remove this package?</h2>
            <p>
                You're about to delete <strong>"${S(plan.name)}"</strong>.
                This action cannot be undone.
            </p>
            <div class="nta-delete-actions">
                <button class="nta-btn-cancel" onclick="window.ntaCloseDeleteModal()">Keep Package</button>
                <button class="nta-btn-delete" onclick="window.ntaConfirmDelete()">Yes, Delete</button>
            </div>
        </div>
    `;

    modal.classList.add("active");
}

// ────────────────────────────────────────────────────
// SAVE (CREATE / UPDATE) — hits API
// ────────────────────────────────────────────────────
async function savePlan() {
    const name          = document.getElementById("plan-name")?.value?.trim();
    const description   = document.getElementById("plan-desc")?.value?.trim();
    const price         = parseFloat(document.getElementById("plan-price")?.value);
    const duration      = document.getElementById("plan-duration")?.value;
    const destination   = document.getElementById("plan-destination")?.value?.trim();
    const category      = document.getElementById("plan-category")?.value;
    const statusChecked = document.getElementById("plan-status")?.checked;

    if (!name)                       { alert("Please enter a package name.");  return; }
    if (!description)                { alert("Please enter a description.");   return; }
    if (isNaN(price) || price <= 0)  { alert("Please enter a valid price.");   return; }
    if (!duration)                   { alert("Please select a duration.");     return; }
    if (!destination)                { alert("Please enter a destination.");   return; }
    if (!category)                   { alert("Please select a category.");     return; }

    const body = {
        name, description, price, duration, destination, category,
        features: [...featuresList],
        status: statusChecked ? "available" : "unavailable"
    };

    const saveBtn = document.querySelector(".nta-btn-save");
    if (saveBtn) { saveBtn.textContent = "Saving..."; saveBtn.disabled = true; }

    try {
        if (currentEditId) {
            // UPDATE
            const res  = await apiFetch(`/plans/${currentEditId}`, { method: "PATCH", body });
            const saved = (await res.json?.().catch(() => ({}))).data || body;
            const idx  = _plans.findIndex(p => String(p.id) === String(currentEditId));
            if (idx !== -1) _plans[idx] = { ..._plans[idx], ...saved };
        } else {
            // CREATE
            const res  = await apiFetch("/plans", { method: "POST", body });
            const saved = (await res.json?.().catch(() => ({}))).data || { ...body, id: "PKG-" + Date.now() };
            _plans.push(saved);
        }
    } catch {
        // Offline: apply locally
        if (currentEditId) {
            const idx = _plans.findIndex(p => String(p.id) === String(currentEditId));
            if (idx !== -1) _plans[idx] = { ..._plans[idx], ...body };
        } else {
            _plans.push({ ...body, id: "PKG-" + Date.now(), createdAt: new Date().toISOString() });
        }
    }

    localStorage.setItem("ntaPlans", JSON.stringify(_plans));
    closeModal();
    renderPlansTable(_plans);
}

// ────────────────────────────────────────────────────
// CONFIRM DELETE — hits API
// ────────────────────────────────────────────────────
async function confirmDelete() {
    if (!currentDeleteId) return;

    try {
        await apiFetch(`/plans/${currentDeleteId}`, { method: "DELETE" });
    } catch {
        // proceed with local delete even if API fails
    }

    _plans = _plans.filter(p => String(p.id) !== String(currentDeleteId));
    localStorage.setItem("ntaPlans", JSON.stringify(_plans));

    currentDeleteId = null;
    closeDeleteModal();
    renderPlansTable(_plans);
}

// ────────────────────────────────────────────────────
// FEATURES
// ────────────────────────────────────────────────────
function addFeature() {
    const input = document.getElementById("feature-input");
    const val   = input?.value?.trim();
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
    `).join("");
}

// ────────────────────────────────────────────────────
// SEARCH / FILTER — works on cached _plans
// ────────────────────────────────────────────────────
function searchPlans() {
    const query        = document.getElementById("nta-search")?.value?.toLowerCase() || "";
    const statusFilter = document.getElementById("nta-status-filter")?.value || "all";

    let filtered = [..._plans];

    if (query) {
        filtered = filtered.filter(p =>
            S(p.name).toLowerCase().includes(query) ||
            S(p.description).toLowerCase().includes(query) ||
            S(p.destination).toLowerCase().includes(query)
        );
    }
    if (statusFilter !== "all") {
        filtered = filtered.filter(p => p.status === statusFilter);
    }

    renderPlansTable(filtered);
}

function filterPlans() { searchPlans(); }

// ────────────────────────────────────────────────────
// MODALS CLOSE
// ────────────────────────────────────────────────────
function closeModal() {
    const modal = document.getElementById("nta-plan-modal");
    if (modal) {
        modal.classList.remove("active");
        setTimeout(() => { modal.innerHTML = ""; }, 300);
    }
    currentEditId = null;
    featuresList  = [];
}

function closeDeleteModal() {
    const modal = document.getElementById("nta-delete-modal");
    if (modal) {
        modal.classList.remove("active");
        setTimeout(() => { modal.innerHTML = ""; }, 300);
    }
    currentDeleteId = null;
}

// ────────────────────────────────────────────────────
// EXPOSE GLOBAL HANDLERS
// ────────────────────────────────────────────────────
function setupEventListeners() {
    window.ntaOpenCreateModal  = openCreateModal;
    window.ntaEditPlan         = openEditModal;
    window.ntaDeletePlan       = openDeleteModal;
    window.ntaSavePlan         = savePlan;
    window.ntaConfirmDelete    = confirmDelete;
    window.ntaCloseModal       = closeModal;
    window.ntaCloseDeleteModal = closeDeleteModal;
    window.ntaAddFeature       = addFeature;
    window.ntaRemoveFeature    = removeFeature;
    window.ntaSearchPlans      = searchPlans;
    window.ntaFilterPlans      = filterPlans;
}
