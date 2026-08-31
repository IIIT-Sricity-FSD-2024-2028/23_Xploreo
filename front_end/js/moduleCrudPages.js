import { apiDelete, apiGet, apiPatch, apiPost } from "./api/http.js";

function showMessage(messageEl, text, isSuccess = false) {
    messageEl.textContent = text;
    messageEl.hidden = false;
    messageEl.classList.toggle("success", isSuccess);
}

function clearMessage(messageEl) {
    messageEl.textContent = "";
    messageEl.hidden = true;
}

function splitList(value) {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function parseItinerary(value) {
    return value.split("\n").map((line, index) => {
        const [day, title, detail] = line.split("|").map((part) => part.trim());
        return {
            day: day || `Day ${index + 1}`,
            title: title || "Activity",
            detail: detail || title || day || "Details pending"
        };
    }).filter((item) => item.day || item.title || item.detail);
}

function formatItinerary(items) {
    return (items || []).map((item) => `${item.day} | ${item.title} | ${item.detail}`).join("\n");
}

function parseJson(value, fallback, label) {
    if (!value.trim()) return fallback;
    try {
        return JSON.parse(value);
    } catch {
        throw new Error(`${label} must be valid JSON.`);
    }
}

function renderShell(container, title, subtitle, formHtml, listTitle, toolbarHtml = "") {
    container.innerHTML = `
        <div class="crud-page">
            <header class="crud-page-header">
                <div>
                    <h1>${title}</h1>
                    <p>${subtitle}</p>
                </div>
            </header>
            <section class="crud-panel">
                <h2 id="formTitle">Add ${title.slice(0, -1) || title}</h2>
                <div id="crudMessage" class="crud-message" hidden></div>
                ${formHtml}
            </section>
            <section class="crud-panel">
                <div class="crud-toolbar">
                    <h2>${listTitle}</h2>
                    ${toolbarHtml}
                </div>
                <div id="crudList" class="crud-grid"></div>
            </section>
        </div>
    `;
}

export function renderGuideCrudPage(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    renderShell(container, "Guides", "Create, update, and manage guide profiles.", `
        <form id="crudForm" class="crud-form">
            <input type="hidden" id="guideId">
            <label>First name<input id="fname" required></label>
            <label>Last name<input id="lname" required></label>
            <label>Email<input id="email" type="email" required></label>
            <label>Phone<input id="phone" type="number" required></label>
            <label>Location<input id="location" required></label>
            <label>Professional title<input id="prof_title" required></label>
            <label>Years experience<input id="years_exp" type="number" min="0" required></label>
            <label>Languages<input id="lang_spoken" placeholder="English, Hindi" required></label>
            <label>Certifications<input id="certifications" placeholder="First Aid, Mountain Rescue"></label>
            <label class="crud-full">Bio<textarea id="bio" required></textarea></label>
            <label>Bank name<input id="bank_name"></label>
            <label>Bank account ending<input id="bank_acc_num_end" type="number"></label>
            <label>IBAN<input id="iban"></label>
            <div class="crud-actions crud-full">
                <button type="submit" class="crud-btn crud-primary">Save Guide</button>
                <button type="button" id="resetBtn" class="crud-btn">Clear</button>
            </div>
        </form>
    `, "All Guides");

    const form = document.getElementById("crudForm");
    const list = document.getElementById("crudList");
    const message = document.getElementById("crudMessage");
    const formTitle = document.getElementById("formTitle");
    let guides = [];

    const guideIdOf = (guide) => guide.userId || guide.id;
    const payload = () => ({
        fname: document.getElementById("fname").value.trim(),
        lname: document.getElementById("lname").value.trim(),
        email: document.getElementById("email").value.trim(),
        phone: Number(document.getElementById("phone").value),
        location: document.getElementById("location").value.trim(),
        prof_title: document.getElementById("prof_title").value.trim(),
        years_exp: Number(document.getElementById("years_exp").value),
        bio: document.getElementById("bio").value.trim(),
        lang_spoken: splitList(document.getElementById("lang_spoken").value),
        certifications: splitList(document.getElementById("certifications").value),
        bank_name: document.getElementById("bank_name").value.trim(),
        bank_acc_num_end: Number(document.getElementById("bank_acc_num_end").value || 0),
        iban: document.getElementById("iban").value.trim()
    });

    const reset = () => {
        form.reset();
        document.getElementById("guideId").value = "";
        formTitle.textContent = "Add Guide";
        clearMessage(message);
    };

    const fill = (guide) => {
        document.getElementById("guideId").value = guideIdOf(guide);
        document.getElementById("fname").value = guide.fname || "";
        document.getElementById("lname").value = guide.lname || "";
        document.getElementById("email").value = guide.email || "";
        document.getElementById("phone").value = guide.phone || "";
        document.getElementById("location").value = guide.location || "";
        document.getElementById("prof_title").value = guide.prof_title || "";
        document.getElementById("years_exp").value = guide.years_exp || 0;
        document.getElementById("bio").value = guide.bio || "";
        document.getElementById("lang_spoken").value = (guide.lang_spoken || []).join(", ");
        document.getElementById("certifications").value = (guide.certifications || []).join(", ");
        document.getElementById("bank_name").value = guide.bank_name || "";
        document.getElementById("bank_acc_num_end").value = guide.bank_acc_num_end || "";
        document.getElementById("iban").value = guide.iban || "";
        formTitle.textContent = `Edit Guide ${guideIdOf(guide)}`;
    };

    const render = () => {
        list.innerHTML = guides.length ? guides.map((guide) => `
            <article class="crud-card">
                <h3>${guide.fname || ""} ${guide.lname || ""}</h3>
                <div class="crud-meta">
                    <strong>ID:</strong> ${guideIdOf(guide)}<br>
                    <strong>Title:</strong> ${guide.prof_title || "-"}<br>
                    <strong>Email:</strong> ${guide.email || "-"}<br>
                    <strong>Location:</strong> ${guide.location || "-"}<br>
                    <strong>Experience:</strong> ${guide.years_exp ?? 0} years
                </div>
                <div class="crud-card-actions">
                    <button class="crud-btn" data-action="edit" data-id="${guideIdOf(guide)}">Edit</button>
                    <button class="crud-btn crud-danger" data-action="delete" data-id="${guideIdOf(guide)}">Delete</button>
                </div>
            </article>
        `).join("") : '<p class="crud-meta">No guides found.</p>';
    };

    const load = async () => {
        try {
            clearMessage(message);
            guides = await apiGet("/guide");
            render();
        } catch (error) {
            showMessage(message, error.message);
            list.innerHTML = '<p class="crud-meta">Unable to load guides.</p>';
        }
    };

    form.onsubmit = async (event) => {
        event.preventDefault();
        const id = document.getElementById("guideId").value;
        try {
            if (id) await apiPatch(`/guide/${encodeURIComponent(id)}`, payload());
            else await apiPost("/guide", payload());
            showMessage(message, id ? "Guide updated successfully." : "Guide created successfully.", true);
            reset();
            await load();
        } catch (error) {
            showMessage(message, error.message);
        }
    };

    list.onclick = async (event) => {
        const button = event.target.closest("button");
        if (!button) return;
        const id = button.dataset.id;
        const guide = guides.find((item) => String(guideIdOf(item)) === String(id));
        if (button.dataset.action === "edit" && guide) fill(guide);
        if (button.dataset.action === "delete") {
            try {
                await apiDelete(`/guide/${encodeURIComponent(id)}`);
                showMessage(message, "Guide deleted successfully.", true);
                await load();
            } catch (error) {
                showMessage(message, error.message);
            }
        }
    };

    document.getElementById("resetBtn").onclick = reset;
    void load();
}

export function renderPlansCrudPage(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    renderShell(container, "Plans", "Create packages and manage trip plan data.", `
        <form id="crudForm" class="crud-form">
            <label>ID<input id="planId" placeholder="plan-kerala-escape" required></label>
            <label>Title<input id="title" required></label>
            <label>Origin city<input id="originCity" required></label>
            <label>Destination<input id="destination" required></label>
            <label>Nights<input id="durationNights" type="number" min="1" required></label>
            <label>Price per person<input id="pricePerPerson" type="number" min="0" required></label>
            <label>Hotel stars<input id="hotelStars" type="number" min="1" max="5" required></label>
            <label>Image URL<input id="image"></label>
            <label>Tags<input id="tags" placeholder="Culture, Luxury, Guided" required></label>
            <label>Includes flight<select id="includesFlight"><option value="true">Yes</option><option value="false">No</option></select></label>
            <label class="crud-full">Description<textarea id="description" required></textarea></label>
            <label class="crud-full">Itinerary<textarea id="itinerary" placeholder="Day 1 | Arrival | Check in"></textarea></label>
            <div class="crud-actions crud-full">
                <button type="submit" class="crud-btn crud-primary">Save Plan</button>
                <button type="button" id="resetBtn" class="crud-btn">Clear</button>
            </div>
        </form>
    `, "All Plans");

    const form = document.getElementById("crudForm");
    const list = document.getElementById("crudList");
    const message = document.getElementById("crudMessage");
    const formTitle = document.getElementById("formTitle");
    let plans = [];

    const payload = () => ({
        id: document.getElementById("planId").value.trim(),
        title: document.getElementById("title").value.trim(),
        description: document.getElementById("description").value.trim(),
        originCity: document.getElementById("originCity").value.trim(),
        destination: document.getElementById("destination").value.trim(),
        durationNights: Number(document.getElementById("durationNights").value),
        pricePerPerson: Number(document.getElementById("pricePerPerson").value),
        hotelStars: Number(document.getElementById("hotelStars").value),
        includesFlight: document.getElementById("includesFlight").value === "true",
        image: document.getElementById("image").value.trim(),
        tags: splitList(document.getElementById("tags").value),
        itinerary: parseItinerary(document.getElementById("itinerary").value)
    });

    const reset = () => {
        form.reset();
        document.getElementById("planId").disabled = false;
        formTitle.textContent = "Add Plan";
        clearMessage(message);
    };

    const fill = (plan) => {
        document.getElementById("planId").value = plan.id || "";
        document.getElementById("planId").disabled = true;
        document.getElementById("title").value = plan.title || "";
        document.getElementById("description").value = plan.description || "";
        document.getElementById("originCity").value = plan.originCity || "";
        document.getElementById("destination").value = plan.destination || "";
        document.getElementById("durationNights").value = plan.durationNights || 1;
        document.getElementById("pricePerPerson").value = plan.pricePerPerson || 0;
        document.getElementById("hotelStars").value = plan.hotelStars || 1;
        document.getElementById("includesFlight").value = String(Boolean(plan.includesFlight));
        document.getElementById("image").value = plan.image || "";
        document.getElementById("tags").value = (plan.tags || []).join(", ");
        document.getElementById("itinerary").value = formatItinerary(plan.itinerary);
        formTitle.textContent = `Edit Plan ${plan.id}`;
    };

    const render = () => {
        list.innerHTML = plans.length ? plans.map((plan) => `
            <article class="crud-card">
                <h3>${plan.title || "-"}</h3>
                <div class="crud-meta">
                    <strong>ID:</strong> ${plan.id}<br>
                    <strong>From:</strong> ${plan.originCity || "-"}<br>
                    <strong>Destination:</strong> ${plan.destination || "-"}<br>
                    <strong>Nights:</strong> ${plan.durationNights ?? "-"}<br>
                    <strong>Price:</strong> ${plan.pricePerPerson ?? "-"}
                </div>
                <div class="crud-card-actions">
                    <button class="crud-btn" data-action="edit" data-id="${plan.id}">Edit</button>
                    <button class="crud-btn crud-danger" data-action="delete" data-id="${plan.id}">Delete</button>
                </div>
            </article>
        `).join("") : '<p class="crud-meta">No plans found.</p>';
    };

    const load = async () => {
        try {
            clearMessage(message);
            const result = await apiGet("/plans");
            plans = Array.isArray(result) ? result : result?.data || [];
            render();
        } catch (error) {
            showMessage(message, error.message);
            list.innerHTML = '<p class="crud-meta">Unable to load plans.</p>';
        }
    };

    form.onsubmit = async (event) => {
        event.preventDefault();
        const id = document.getElementById("planId").value;
        const body = payload();
        try {
            if (document.getElementById("planId").disabled) {
                delete body.id;
                await apiPatch(`/plans/${encodeURIComponent(id)}`, body);
            } else {
                await apiPost("/plans", body);
            }
            showMessage(message, "Plan saved successfully.", true);
            reset();
            await load();
        } catch (error) {
            showMessage(message, error.message);
        }
    };

    list.onclick = async (event) => {
        const button = event.target.closest("button");
        if (!button) return;
        const id = button.dataset.id;
        const plan = plans.find((item) => String(item.id) === String(id));
        if (button.dataset.action === "edit" && plan) fill(plan);
        if (button.dataset.action === "delete") {
            try {
                await apiDelete(`/plans/${encodeURIComponent(id)}`);
                showMessage(message, "Plan deleted successfully.", true);
                await load();
            } catch (error) {
                showMessage(message, error.message);
            }
        }
    };

    document.getElementById("resetBtn").onclick = reset;
    void load();
}

export function renderTripsCrudPage(containerId, currentUser = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    renderShell(container, "Trips", "Book and manage traveller trips.", `
        <form id="crudForm" class="crud-form">
            <label>ID<input id="tripId" placeholder="trip-kerala-2026" required></label>
            <label>Traveller ID<input id="travellerId" required></label>
            <label>Guide ID<input id="guideId" required></label>
            <label>Plan ID<input id="planId" required></label>
            <label>Title<input id="title" required></label>
            <label>Destination<input id="destination" required></label>
            <label>Location<input id="location" required></label>
            <label>Start date<input id="startDate" type="date" required></label>
            <label>End date<input id="endDate" type="date" required></label>
            <label>Status<select id="status"><option value="upcoming">Upcoming</option><option value="ongoing">Ongoing</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label>
            <label>Type<select id="type"><option value="package">Package</option><option value="hotel">Hotel</option><option value="experience">Experience</option><option value="flight">Flight</option></select></label>
            <label>Amount<input id="amount" type="number" min="0" required></label>
            <label>Guests<input id="guests" type="number" min="1" required></label>
            <label>Duration label<input id="durationLabel" required></label>
            <label>Current location<input id="currentLocation"></label>
            <label class="crud-full">Itinerary<textarea id="itinerary" placeholder="Day 1 | Arrival | Check in"></textarea></label>
            <label class="crud-full">Payment breakdown<textarea id="paymentBreakdown"></textarea></label>
            <label class="crud-full">Documents<textarea id="documents"></textarea></label>
            <div class="crud-actions crud-full">
                <button type="submit" class="crud-btn crud-primary">Save Trip</button>
                <button type="button" id="resetBtn" class="crud-btn">Clear</button>
            </div>
        </form>
    `, "All Trips");

    const form = document.getElementById("crudForm");
    const list = document.getElementById("crudList");
    const message = document.getElementById("crudMessage");
    const formTitle = document.getElementById("formTitle");
    let trips = [];

    const payload = () => ({
        id: document.getElementById("tripId").value.trim(),
        travellerId: document.getElementById("travellerId").value.trim(),
        guideId: document.getElementById("guideId").value.trim(),
        planId: document.getElementById("planId").value.trim(),
        title: document.getElementById("title").value.trim(),
        destination: document.getElementById("destination").value.trim(),
        location: document.getElementById("location").value.trim(),
        startDate: document.getElementById("startDate").value,
        endDate: document.getElementById("endDate").value,
        status: document.getElementById("status").value,
        amount: Number(document.getElementById("amount").value),
        guests: Number(document.getElementById("guests").value),
        durationLabel: document.getElementById("durationLabel").value.trim(),
        type: document.getElementById("type").value,
        itinerary: parseItinerary(document.getElementById("itinerary").value),
        currentLocation: document.getElementById("currentLocation").value.trim() || undefined,
        paymentBreakdown: parseJson(document.getElementById("paymentBreakdown").value, { flights: 0, stay: 0, activities: 0, guide: 0 }, "Payment breakdown"),
        documents: parseJson(document.getElementById("documents").value, [], "Documents")
    });

    const reset = () => {
        form.reset();
        document.getElementById("tripId").disabled = false;
        document.getElementById("paymentBreakdown").value = '{"flights":0,"stay":0,"activities":0,"guide":0}';
        document.getElementById("documents").value = "[]";
        if (currentUser?.id || currentUser?.userId) document.getElementById("travellerId").value = String(currentUser.id || currentUser.userId);
        formTitle.textContent = "Add Trip";
        clearMessage(message);
    };

    const fill = (trip) => {
        document.getElementById("tripId").value = trip.id || "";
        document.getElementById("tripId").disabled = true;
        document.getElementById("travellerId").value = trip.travellerId || "";
        document.getElementById("guideId").value = trip.guideId || "";
        document.getElementById("planId").value = trip.planId || "";
        document.getElementById("title").value = trip.title || "";
        document.getElementById("destination").value = trip.destination || "";
        document.getElementById("location").value = trip.location || "";
        document.getElementById("startDate").value = trip.startDate || "";
        document.getElementById("endDate").value = trip.endDate || "";
        document.getElementById("status").value = trip.status || "upcoming";
        document.getElementById("type").value = trip.type || "package";
        document.getElementById("amount").value = trip.amount || 0;
        document.getElementById("guests").value = trip.guests || 1;
        document.getElementById("durationLabel").value = trip.durationLabel || "";
        document.getElementById("currentLocation").value = trip.currentLocation || "";
        document.getElementById("itinerary").value = formatItinerary(trip.itinerary);
        document.getElementById("paymentBreakdown").value = JSON.stringify(trip.paymentBreakdown || { flights: 0, stay: 0, activities: 0, guide: 0 });
        document.getElementById("documents").value = JSON.stringify(trip.documents || []);
        formTitle.textContent = `Edit Trip ${trip.id}`;
    };

    const render = () => {
        list.innerHTML = trips.length ? trips.map((trip) => `
            <article class="crud-card">
                <h3>${trip.title || "-"}</h3>
                <div class="crud-meta">
                    <strong>ID:</strong> ${trip.id}<br>
                    <strong>Traveller:</strong> ${trip.travellerId || "-"}<br>
                    <strong>Guide:</strong> ${trip.guideId || "-"}<br>
                    <strong>Destination:</strong> ${trip.destination || "-"}<br>
                    <strong>Dates:</strong> ${trip.startDate || "-"} to ${trip.endDate || "-"}<br>
                    <strong>Status:</strong> ${trip.status || "-"}<br>
                    <strong>Amount:</strong> ${trip.amount ?? "-"}
                </div>
                <div class="crud-card-actions">
                    <button class="crud-btn" data-action="edit" data-id="${trip.id}">Edit</button>
                    <button class="crud-btn crud-danger" data-action="delete" data-id="${trip.id}">Delete</button>
                </div>
            </article>
        `).join("") : '<p class="crud-meta">No trips found.</p>';
    };

    const load = async () => {
        try {
            clearMessage(message);
            trips = await apiGet("/trips");
            render();
        } catch (error) {
            showMessage(message, error.message);
            list.innerHTML = '<p class="crud-meta">Unable to load trips.</p>';
        }
    };

    form.onsubmit = async (event) => {
        event.preventDefault();
        const id = document.getElementById("tripId").value;
        const body = payload();
        try {
            if (document.getElementById("tripId").disabled) {
                delete body.id;
                await apiPatch(`/trips/${encodeURIComponent(id)}`, body);
            } else {
                await apiPost("/trips", body);
            }
            showMessage(message, "Trip saved successfully.", true);
            reset();
            await load();
        } catch (error) {
            showMessage(message, error.message);
        }
    };

    list.onclick = async (event) => {
        const button = event.target.closest("button");
        if (!button) return;
        const id = button.dataset.id;
        const trip = trips.find((item) => String(item.id) === String(id));
        if (button.dataset.action === "edit" && trip) fill(trip);
        if (button.dataset.action === "delete") {
            try {
                await apiDelete(`/trips/${encodeURIComponent(id)}`);
                showMessage(message, "Trip deleted successfully.", true);
                await load();
            } catch (error) {
                showMessage(message, error.message);
            }
        }
    };

    document.getElementById("resetBtn").onclick = reset;
    reset();
    void load();
}
