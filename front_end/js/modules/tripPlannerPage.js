import {
    ensureTravelerSession,
    getLastTransport,
    getTravelerPlans,
    getTravelerWorkspaceSeed,
    saveLastTransport,
    saveTravelerPlans,
    seedTravelerWorkspace
} from "../utils/travelerWorkspaceState.js";
import { validateTripPlan } from "../utils/travelerWorkspaceValidators.js";
import {
    createEmptyState,
    formatCurrency,
    formatDate,
    renderFieldError,
    showWorkspaceToast
} from "./travelerWorkspaceUI.js";
import { travelerData } from "../api/legacyData.js";

const TRANSPORTS = ["Flight", "Train", "Bus", "Private Car"];

export function initTripPlannerPage(containerId) {
    const container = document.getElementById(containerId);
    const user = ensureTravelerSession();

    if (!container) {
        return;
    }

    seedTravelerWorkspace();

    const state = {
        user,
        formErrors: {},
        editingPlanId: null,
        selectedTransport: getLastTransport(),
        selectedTransportResultId: null
    };

    function getTransportOptions() {
        const seed = getTravelerWorkspaceSeed();
        return seed.transportOptions[state.selectedTransport] || [];
    }

    function render() {
        const plans = getTravelerPlans();
        const transportOptions = getTransportOptions();
        const selectedResult = transportOptions.find((item) => item.id === state.selectedTransportResultId) || transportOptions[0];

        if (!state.selectedTransportResultId && selectedResult) {
            state.selectedTransportResultId = selectedResult.id;
        }

        container.innerHTML = `
            <main class="traveler-workspace traveler-planner-page">
                <section class="traveler-hero-panel">
                    <div>
                        <p class="traveler-eyebrow">Traveller workspace</p>
                        <h1>Plan Your Trip</h1>
                        <p>Choose your destination, compare transport options, and save draft itineraries without leaving the page.</p>
                    </div>
                    <a class="traveler-link-chip" href="./bookings.html">Open bookings</a>
                </section>

                <section class="traveler-grid traveler-grid-main">
                    <div class="traveler-card">
                        <div class="traveler-card-header">
                            <div>
                                <h2>Create or update a plan</h2>
                                <p>Client-side validation keeps incomplete itineraries out of your saved list.</p>
                            </div>
                            ${state.editingPlanId ? `<button class="ghost-btn" id="cancel-plan-edit">Cancel edit</button>` : ""}
                        </div>

                        <form id="trip-plan-form" class="traveler-form-grid" novalidate>
                            <label>
                                <span>From</span>
                                <input type="text" name="origin" placeholder="Home city">
                                ${renderFieldError(state.formErrors, "origin")}
                            </label>
                            <label>
                                <span>Destination</span>
                                <input type="text" name="destination" placeholder="Enter city">
                                ${renderFieldError(state.formErrors, "destination")}
                            </label>
                            <label>
                                <span>Departure</span>
                                <input type="date" name="departure">
                                ${renderFieldError(state.formErrors, "departure")}
                            </label>
                            <label>
                                <span>Duration (days)</span>
                                <input type="number" name="duration" min="1" max="30" placeholder="5">
                                ${renderFieldError(state.formErrors, "duration")}
                            </label>
                            <label>
                                <span>Budget (INR)</span>
                                <input type="number" name="budget" min="1" step="1000" placeholder="84000">
                                ${renderFieldError(state.formErrors, "budget")}
                            </label>
                            <label>
                                <span>Status</span>
                                <select name="status">
                                    <option value="Draft">Draft</option>
                                    <option value="Confirmed">Confirmed</option>
                                </select>
                            </label>
                            <label class="traveler-form-span-full">
                                <span>Notes</span>
                                <textarea name="notes" rows="3" placeholder="Food spots, local experiences, or pacing notes"></textarea>
                                ${renderFieldError(state.formErrors, "notes")}
                            </label>

                            <div class="traveler-form-span-full">
                                <span class="group-label">Choose your transport</span>
                                <div class="transport-choice-grid">
                                    ${TRANSPORTS.map((transport) => `
                                        <button type="button" class="transport-choice-card ${transport === state.selectedTransport ? "active" : ""}" data-transport="${transport}">
                                            <strong>${transport}</strong>
                                            <span>${transport === "Flight" ? "Fastest option" : transport === "Train" ? "Scenic journey" : transport === "Bus" ? "Budget friendly" : "Flexible comfort"}</span>
                                        </button>
                                    `).join("")}
                                </div>
                            </div>

                            <div class="traveler-form-actions traveler-form-span-full">
                                <button type="submit" class="solid-btn">${state.editingPlanId ? "Save changes" : "Add trip plan"}</button>
                                <button type="button" class="ghost-btn" id="prefill-plan-form">Use sample values</button>
                            </div>
                        </form>
                    </div>

                    <div class="traveler-card">
                        <div class="traveler-card-header">
                            <div>
                                <h2>Available transport</h2>
                                <p>Live selection stays in local storage for the next planning session.</p>
                            </div>
                            <span class="traveler-status-pill">${state.selectedTransport}</span>
                        </div>
                        <div class="transport-list">
                            ${transportOptions.length ? transportOptions.map((option) => `
                                <article class="transport-row ${option.id === state.selectedTransportResultId ? "selected" : ""}" data-option-id="${option.id}">
                                    <div>
                                        <h3>${option.carrier}</h3>
                                        <p>${option.meta}</p>
                                    </div>
                                    <div class="transport-times">
                                        <strong>${option.departureTime}</strong>
                                        <span>${option.route}</span>
                                        <strong>${option.arrivalTime}</strong>
                                    </div>
                                    <div class="transport-price">
                                        <strong>${formatCurrency(option.price)}</strong>
                                        <button type="button" class="solid-btn small" data-select-option="${option.id}">Select</button>
                                    </div>
                                </article>
                            `).join("") : createEmptyState("No transport options", "Choose another mode to continue.", "Waiting for selection")}
                        </div>

                        ${selectedResult ? `
                            <div class="traveler-insight-panel">
                                <strong>Selected option</strong>
                                <p>${selectedResult.carrier} is currently attached to your next saved plan. Expected spend: ${formatCurrency(selectedResult.price)}.</p>
                            </div>
                        ` : ""}
                    </div>
                </section>

                <section class="traveler-card">
                    <div class="traveler-card-header">
                        <div>
                            <h2>Saved trip plans</h2>
                            <p>View, edit, or remove itineraries with immediate UI updates.</p>
                        </div>
                        <span class="traveler-stat-chip">${plans.length} plans</span>
                    </div>
                    <div class="plan-list">
                        ${plans.length ? plans.map((plan) => `
                            <article class="plan-card">
                                <div class="plan-card-main">
                                    <div class="plan-route">
                                        <strong>${plan.origin}</strong>
                                        <span>to</span>
                                        <strong>${plan.destination}</strong>
                                    </div>
                                    <p>${formatDate(plan.departure)} • ${plan.duration} days • ${plan.transport}</p>
                                    <small>${plan.notes || "No notes added yet."}</small>
                                </div>
                                <div class="plan-card-side">
                                    <span class="traveler-status-pill ${plan.status === "Confirmed" ? "success" : ""}">${plan.status}</span>
                                    <strong>${formatCurrency(plan.budget)}</strong>
                                    <div class="inline-actions">
                                        <button type="button" class="ghost-btn small" data-view-plan="${plan.id}">View</button>
                                        <button type="button" class="ghost-btn small" data-edit-plan="${plan.id}">Edit</button>
                                        <button type="button" class="danger-btn small" data-delete-plan="${plan.id}">Delete</button>
                                    </div>
                                </div>
                            </article>
                        `).join("") : createEmptyState("No plans saved yet", "Start with the form above to create your first traveller itinerary.", "Trip planning")}
                    </div>
                    <div id="plan-view-panel"></div>
                </section>
            </main>
        `;

        bindEvents();
        
        const params = new URLSearchParams(window.location.search);
        const planId = params.get("plan");
        
        if (planId && !state.editingPlanId) {
            const catalog = travelerData?.searchCatalog?.packages || [];
            const pkgMatch = catalog.find(p => p.id === planId) || catalog[0];
            if (pkgMatch) {
                hydrateForm({
                    origin: pkgMatch.origin || "Delhi",
                    destination: pkgMatch.destination || "Destination",
                    departure: new Date().toISOString().split("T")[0],
                    duration: parseInt(String(pkgMatch.days || "5").replace(/\D/g, ""), 10) || 5,
                    budget: (parseInt(String(pkgMatch.pricePerPerson).replace(/\D/g, ""), 10) || 5000),
                    status: "Draft",
                    notes: `Holiday Package Template: ${pkgMatch.title}\nIncludes: ${pkgMatch.activityLine || ""}`
                });
                return;
            }
        }
        
        hydrateForm();
    }

    function hydrateForm(plan) {
        const form = container.querySelector("#trip-plan-form");

        if (!form) {
            return;
        }

        if (!plan) {
            form.reset();
            form.elements.status.value = "Draft";
            return;
        }

        form.elements.origin.value = plan.origin;
        form.elements.destination.value = plan.destination;
        form.elements.departure.value = plan.departure;
        form.elements.duration.value = plan.duration;
        form.elements.budget.value = plan.budget;
        form.elements.status.value = plan.status;
        form.elements.notes.value = plan.notes;
    }

    function bindEvents() {
        const form = container.querySelector("#trip-plan-form");
        const plans = getTravelerPlans();

        container.querySelectorAll("[data-transport]").forEach((button) => {
            button.addEventListener("click", () => {
                state.selectedTransport = button.dataset.transport;
                state.selectedTransportResultId = null;
                saveLastTransport(state.selectedTransport);
                render();
            });
        });

        container.querySelectorAll("[data-select-option]").forEach((button) => {
            button.addEventListener("click", () => {
                state.selectedTransportResultId = button.dataset.selectOption;
                showWorkspaceToast(`${state.selectedTransport} option selected.`);
                render();
            });
        });

        container.querySelector("#prefill-plan-form")?.addEventListener("click", () => {
            hydrateForm({
                origin: "Hyderabad",
                destination: "Kyoto",
                departure: "2026-10-12",
                duration: 5,
                budget: 84000,
                status: "Draft",
                notes: "Focus on temples, local tea experiences, and a calm final day."
            });
        });

        container.querySelector("#cancel-plan-edit")?.addEventListener("click", () => {
            state.editingPlanId = null;
            state.formErrors = {};
            render();
        });

        form?.addEventListener("submit", (event) => {
            event.preventDefault();

            const payload = {
                origin: form.elements.origin.value.trim(),
                destination: form.elements.destination.value.trim(),
                departure: form.elements.departure.value,
                duration: Number(form.elements.duration.value),
                budget: Number(form.elements.budget.value),
                status: form.elements.status.value,
                notes: form.elements.notes.value.trim(),
                transport: state.selectedTransport
            };

            const errors = validateTripPlan(payload);
            state.formErrors = errors;

            if (Object.keys(errors).length) {
                showWorkspaceToast("Please fix the highlighted fields.", "error");
                render();
                hydrateForm(payload);
                return;
            }

            const nextPlans = [...plans];

            if (state.editingPlanId) {
                const index = nextPlans.findIndex((plan) => plan.id === state.editingPlanId);
                if (index === -1) {
                    showWorkspaceToast("The selected plan could not be updated.", "error");
                    return;
                }

                nextPlans[index] = { ...nextPlans[index], ...payload };
                showWorkspaceToast("Trip plan updated.");
            } else {
                nextPlans.unshift({
                    id: `plan-${Date.now()}`,
                    ...payload
                });
                showWorkspaceToast("Trip plan added.");
            }

            saveTravelerPlans(nextPlans);
            state.editingPlanId = null;
            state.formErrors = {};
            render();
        });

        container.querySelectorAll("[data-edit-plan]").forEach((button) => {
            button.addEventListener("click", () => {
                const plan = plans.find((item) => item.id === button.dataset.editPlan);

                if (!plan) {
                    showWorkspaceToast("That plan could not be found.", "error");
                    return;
                }

                state.editingPlanId = plan.id;
                state.selectedTransport = plan.transport;
                state.formErrors = {};
                render();
                hydrateForm(plan);
            });
        });

        container.querySelectorAll("[data-delete-plan]").forEach((button) => {
            button.addEventListener("click", () => {
                const planId = button.dataset.deletePlan;
                const nextPlans = plans.filter((item) => item.id !== planId);

                if (nextPlans.length === plans.length) {
                    showWorkspaceToast("The selected plan was already removed.", "error");
                    return;
                }

                saveTravelerPlans(nextPlans);
                showWorkspaceToast("Trip plan deleted.");
                render();
            });
        });

        container.querySelectorAll("[data-view-plan]").forEach((button) => {
            button.addEventListener("click", () => {
                const plan = plans.find((item) => item.id === button.dataset.viewPlan);
                const panel = container.querySelector("#plan-view-panel");

                if (!plan || !panel) {
                    showWorkspaceToast("Unable to open that plan.", "error");
                    return;
                }

                panel.innerHTML = `
                    <div class="traveler-inline-detail">
                        <h3>${plan.origin} to ${plan.destination}</h3>
                        <p>${formatDate(plan.departure)} • ${plan.duration} days • ${plan.transport} • ${formatCurrency(plan.budget)}</p>
                        <p>${plan.notes || "No additional notes were saved for this plan."}</p>
                    </div>
                `;
            });
        });
    }

    render();
}
