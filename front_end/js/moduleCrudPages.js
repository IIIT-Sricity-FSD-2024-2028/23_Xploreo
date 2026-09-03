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
            <header class="crud-page-header" style="margin-bottom: 24px;">
                <div>
                    <h1 style="margin: 0; font-size: 28px; color: #1a202c;">${title}</h1>
                    <p style="margin: 5px 0 0; color: #718096; font-size: 14px;">${subtitle}</p>
                </div>
            </header>
            
            <section class="crud-panel" style="background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #edf2f7;">
                <div class="crud-toolbar" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #edf2f7;">
                    <h2 style="margin: 0; font-size: 18px; color: #2d3748;">${listTitle}</h2>
                    <div style="display: flex; gap: 12px; align-items: center;">
                        ${toolbarHtml}
                        <button id="openAddModalBtn" style="background: #3182ce; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: background 0.2s; white-space: nowrap;" onmouseover="this.style.background='#2b6cb0'" onmouseout="this.style.background='#3182ce'">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            Add ${title.slice(0, -1) || title}
                        </button>
                    </div>
                </div>
                <div id="crudMessage" class="crud-message" hidden style="margin-bottom: 16px;"></div>
                <div id="crudList" class="crud-grid"></div>
            </section>
        </div>

        <!-- Modal Overlay -->
        <div id="crudModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; justify-content: center; align-items: center; backdrop-filter: blur(2px);">
            <div style="background: #fff; width: 90%; max-width: 650px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); max-height: 90vh; overflow-y: auto; display: flex; flex-direction: column;">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 24px; border-bottom: 1px solid #edf2f7; position: sticky; top: 0; background: #fff; z-index: 10;">
                    <h2 id="formTitle" style="margin: 0; font-size: 20px; color: #1a202c;">Add ${title.slice(0, -1) || title}</h2>
                    <button id="closeModalBtn" style="background: none; border: none; font-size: 28px; cursor: pointer; color: #a0aec0; line-height: 1; padding: 0;">&times;</button>
                </div>
                <div style="padding: 24px;">
                    ${formHtml}
                </div>
            </div>
        </div>
    `;

    const modal = document.getElementById("crudModal");
    const openBtn = document.getElementById("openAddModalBtn");
    const closeBtn = document.getElementById("closeModalBtn");

    if (openBtn && modal && closeBtn) {
        openBtn.onclick = () => {
            const formTitle = document.getElementById("formTitle");
            if(formTitle) formTitle.textContent = "Add " + (title.slice(0, -1) || title);
            const resetBtn = document.getElementById("resetBtn");
            if(resetBtn) resetBtn.click(); // clear form when opening for "Add"
            modal.style.display = "flex";
        };
        closeBtn.onclick = () => {
            modal.style.display = "none";
        };
        window.addEventListener("click", (event) => {
            if (event.target === modal) {
                modal.style.display = "none";
            }
        });
    }
}

export function renderGuideCrudPage(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    renderShell(container, "Guides", "Create, update, and manage guide profiles.", `
        <form id="crudForm" class="crud-form">
            <input type="hidden" id="guideId">
            <label>Username<input id="username" required minlength="3" title="Unique username for login"></label>
            <label id="passwordLabel">Password<input type="password" id="password" minlength="6" required title="Password for login"></label>
            <label>First name<input id="fname" required minlength="2" pattern="[a-zA-Z ]+" title="First name should only contain letters"></label>
            <label>Last name<input id="lname" required minlength="1" pattern="[a-zA-Z ]+" title="Last name should only contain letters"></label>
            <label>Email<input id="email" type="email" required></label>
            <label>Phone
                <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
                    <span style="font-weight: 600; color: #4B5563; padding-left: 8px;">+91</span>
                    <input id="phone" type="tel" pattern="[6-9][0-9]{9}" maxlength="10" title="Please enter a valid 10-digit Indian mobile number starting with 6-9" oninput="this.value = this.value.replace(/[^0-9]/g, '')" required style="flex: 1; margin-top: 0;">
                </div>
            </label>
            <label>Location<input id="location" required minlength="2"></label>
            <label>Years experience<input id="years_exp" type="number" min="0" step="1" required title="Please enter a whole number" oninput="this.value = this.value.replace(/[^0-9]/g, '')"></label>
            <label>Languages<input id="lang_spoken" placeholder="English, Hindi" required minlength="2"></label>
            <label class="crud-full">Bio<textarea id="bio" required minlength="10"></textarea></label>
            <div class="crud-actions crud-full">
                <button type="submit" class="crud-btn crud-primary">Save Guide</button>
                <button type="button" id="resetBtn" class="crud-btn">Clear</button>
            </div>
        </form>
    `, "All Guides", `
        <input type="text" id="guideSearchInput" placeholder="Search guides..." style="padding: 10px 16px; border: 1px solid #dbe2ef; border-radius: 8px; font-size: 14px; width: 100%; max-width: 300px; margin-left: auto; outline: none; transition: border-color 0.2s; box-sizing: border-box; height: 40px;">
    `);

    const form = document.getElementById("crudForm");
    const list = document.getElementById("crudList");
    const message = document.getElementById("crudMessage");
    const formTitle = document.getElementById("formTitle");
    const searchInput = document.getElementById("guideSearchInput");
    let guides = [];

    const guideIdOf = (guide) => guide.userId || guide.id;
    const payload = () => ({
        userId: document.getElementById("username").value.trim(),
        fname: document.getElementById("fname").value.trim(),
        lname: document.getElementById("lname").value.trim(),
        email: document.getElementById("email").value.trim(),
        phone: Number(document.getElementById("phone").value.trim()),
        location: document.getElementById("location").value.trim(),
        years_exp: Number(document.getElementById("years_exp").value),
        bio: document.getElementById("bio").value.trim(),
        lang_spoken: splitList(document.getElementById("lang_spoken").value)
    });

    const reset = () => {
        form.reset();
        document.getElementById("guideId").value = "";
        document.getElementById("username").disabled = false;
        document.getElementById("passwordLabel").hidden = false;
        document.getElementById("password").required = true;
        document.getElementById("password").value = "";
        formTitle.textContent = "Add Guide";
        clearMessage(message);
    };

    const fill = (guide) => {
        document.getElementById("guideId").value = guideIdOf(guide);
        document.getElementById("username").value = guide.userId || "";
        document.getElementById("username").disabled = true;
        document.getElementById("passwordLabel").hidden = true;
        document.getElementById("password").required = false;
        document.getElementById("fname").value = guide.fname || "";
        document.getElementById("lname").value = guide.lname || "";
        document.getElementById("email").value = guide.email || "";
        document.getElementById("phone").value = (guide.phone || "").toString().replace(/^\+91\s*/, "");
        document.getElementById("location").value = guide.location || "";
        document.getElementById("years_exp").value = guide.years_exp || 0;
        document.getElementById("bio").value = guide.bio || "";
        document.getElementById("lang_spoken").value = (guide.lang_spoken || []).join(", ");
        formTitle.textContent = `Edit Guide ${guideIdOf(guide)}`;
    };

    const render = () => {
        const searchTerm = (searchInput ? searchInput.value.toLowerCase().trim() : "");
        const filteredGuides = guides.filter(g => {
            if (!searchTerm) return true;
            return (g.fname || "").toLowerCase().includes(searchTerm) ||
                   (g.lname || "").toLowerCase().includes(searchTerm) ||
                   (g.email || "").toLowerCase().includes(searchTerm) ||
                   (g.location || "").toLowerCase().includes(searchTerm);
        });

        const activeGuides = filteredGuides.filter(g => g.status !== 'restricted' && !g.isDeleted);
        const restrictedGuides = filteredGuides.filter(g => g.status === 'restricted' || g.isDeleted);

        const renderCards = (list) => list.length ? list.map((guide) => `
            <article class="crud-card ${guide.status === 'restricted' ? 'restricted-card' : ''}" style="${guide.status === 'restricted' ? 'opacity: 0.7; background: #fff1f2; border-color: #fecdd3;' : ''}">
                <h3>${guide.fname || ""} ${guide.lname || ""} ${guide.status === 'restricted' ? '<span style="color:red;font-size:12px;">(Restricted)</span>' : ''}</h3>
                <div class="crud-meta">
                    <strong>ID:</strong> ${guideIdOf(guide)}<br>
                    <strong>Email:</strong> ${guide.email || "-"}<br>
                    <strong>Location:</strong> ${guide.location || "-"}<br>
                    <strong>Languages:</strong> ${(guide.lang_spoken || []).join(", ") || "-"}
                </div>
                <div class="crud-card-actions">
                    <button class="crud-btn" data-action="edit" data-id="${guideIdOf(guide)}">Edit</button>
                    ${guide.status === 'restricted' 
                        ? `<button class="crud-btn" style="background:#22c55e;color:white;" data-action="restore" data-id="${guideIdOf(guide)}">Restore</button>` 
                        : `<button class="crud-btn crud-danger" data-action="delete" data-id="${guideIdOf(guide)}">Restrict</button>`
                    }
                </div>
            </article>
        `).join("") : '<p class="crud-meta" style="grid-column: 1 / -1;">No guides found in this section.</p>';

        list.classList.remove("crud-grid"); // Remove parent grid to allow sections to span full width
        
        list.innerHTML = `
            <div class="active-guides-section" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px;">
                ${renderCards(activeGuides)}
            </div>
            ${restrictedGuides.length > 0 ? `
                <div class="restricted-guides-section" style="margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                    <h3 style="color: #ef4444; margin-bottom: 16px;">Restricted Guides</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px;">
                        ${renderCards(restrictedGuides)}
                    </div>
                </div>
            ` : ''}
        `;
    };

    if (searchInput) {
        searchInput.addEventListener("input", render);
    }

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
            if (id) {
                await apiPatch(`/guide/${encodeURIComponent(id)}`, payload());
            } else {
                const username = document.getElementById("username").value.trim();
                const password = document.getElementById("password").value;
                const email = document.getElementById("email").value.trim();
                const fname = document.getElementById("fname").value.trim();
                const lname = document.getElementById("lname").value.trim();
                const location = document.getElementById("location").value.trim();
                const phone = document.getElementById("phone").value.trim();
                
                await apiPost("/auth/register", {
                    username: username,
                    password: password,
                    email: email,
                    role: "guide",
                    name: fname + " " + lname,
                    location: location,
                    phone: phone
                });
                await apiPost("/guide", payload());
            }
            showMessage(message, id ? "Guide updated successfully." : "Guide created successfully.", true);
            reset();
            document.getElementById("crudModal").style.display = "none";
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
        if (button.dataset.action === "edit" && guide) {
            fill(guide);
            document.getElementById("crudModal").style.display = "flex";
        }
        if (button.dataset.action === "delete") {
            if (confirm("Restrict this guide? They will be unable to access their account.")) {
                try {
                    await apiPatch(`/guide/${encodeURIComponent(id)}`, { status: "restricted" });
                    
                    // Fallback for localStorage if API doesn't persist
                    const users = JSON.parse(localStorage.getItem("users")) || [];
                    const userIndex = users.findIndex(u => u.id === id);
                    if (userIndex > -1) {
                        users[userIndex].status = "restricted";
                        localStorage.setItem("users", JSON.stringify(users));
                    }
                    
                    showMessage(message, "Guide restricted successfully.", true);
                    await load();
                } catch (error) {
                    showMessage(message, error.message);
                }
            }
        }
        if (button.dataset.action === "restore") {
            if (confirm("Restore this guide to active status?")) {
                try {
                    await apiPatch(`/guide/${encodeURIComponent(id)}`, { status: "active" });
                    
                    const users = JSON.parse(localStorage.getItem("users")) || [];
                    const userIndex = users.findIndex(u => u.id === id);
                    if (userIndex > -1) {
                        users[userIndex].status = "active";
                        localStorage.setItem("users", JSON.stringify(users));
                    }

                    showMessage(message, "Guide restored successfully.", true);
                    await load();
                } catch (error) {
                    showMessage(message, error.message);
                }
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
            document.getElementById("crudModal").style.display = "none";
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
        if (button.dataset.action === "edit" && plan) {
            fill(plan);
            document.getElementById("crudModal").style.display = "flex";
        }
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
            document.getElementById("crudModal").style.display = "none";
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
        if (button.dataset.action === "edit" && trip) {
            fill(trip);
            document.getElementById("crudModal").style.display = "flex";
        }
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

export function renderTravellerCrudPage(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    renderShell(container, "Travellers", "Create, update, and manage traveller profiles.", `
        <form id="crudForm" class="crud-form">
            <input type="hidden" id="travellerId">
            <label>Username<input id="username" required minlength="3" title="Unique username for login"></label>
            <label id="passwordLabel">Password<input type="password" id="password" minlength="6" required title="Password for login"></label>
            <label>First name<input id="fname" required minlength="2" pattern="[a-zA-Z ]+" title="First name should only contain letters"></label>
            <label>Last name<input id="lname" required minlength="1" pattern="[a-zA-Z ]+" title="Last name should only contain letters"></label>
            <label>Email<input id="email" type="email" required></label>
            <label>Phone
                <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
                    <span style="font-weight: 600; color: #4B5563; padding-left: 8px;">+91</span>
                    <input id="phone" type="tel" pattern="[6-9][0-9]{9}" maxlength="10" title="Please enter a valid 10-digit Indian mobile number starting with 6-9" oninput="this.value = this.value.replace(/[^0-9]/g, '')" required style="flex: 1; margin-top: 0;">
                </div>
            </label>
            <label>Gender
                <select id="gender">
                    <option value="">Select...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                </select>
            </label>
            <label>DOB<input id="dob" type="date"></label>
            <label>Languages<input id="lang_spoken" placeholder="English, Hindi"></label>
            <label class="crud-full">Bio<textarea id="bio"></textarea></label>
            <div class="crud-actions crud-full">
                <button type="submit" class="crud-btn crud-primary">Save Traveller</button>
                <button type="button" id="resetBtn" class="crud-btn">Clear</button>
            </div>
        </form>
    `, "All Travellers", `
        <input type="text" id="travellerSearchInput" placeholder="Search travellers..." style="padding: 10px 16px; border: 1px solid #dbe2ef; border-radius: 8px; font-size: 14px; width: 100%; max-width: 300px; margin-left: auto; outline: none; transition: border-color 0.2s; box-sizing: border-box; height: 40px;">
    `);

    const form = document.getElementById("crudForm");
    const list = document.getElementById("crudList");
    const message = document.getElementById("crudMessage");
    const formTitle = document.getElementById("formTitle");
    const searchInput = document.getElementById("travellerSearchInput");
    let travellers = [];

    const travellerIdOf = (traveller) => traveller.userId || traveller.id;
    const payload = () => ({
        userId: document.getElementById("username").value.trim(),
        fname: document.getElementById("fname").value.trim(),
        lname: document.getElementById("lname").value.trim(),
        email: document.getElementById("email").value.trim(),
        phno: Number(document.getElementById("phone").value.trim()),
        plang: splitList(document.getElementById("lang_spoken").value),
        gender: document.getElementById("gender").value,
        dob: document.getElementById("dob").value,
        bio: document.getElementById("bio").value.trim()
    });

    const reset = () => {
        form.reset();
        document.getElementById("travellerId").value = "";
        document.getElementById("username").disabled = false;
        document.getElementById("passwordLabel").hidden = false;
        document.getElementById("password").required = true;
        document.getElementById("password").value = "";
        formTitle.textContent = "Add Traveller";
        clearMessage(message);
    };

    const fill = (traveller) => {
        document.getElementById("travellerId").value = travellerIdOf(traveller);
        document.getElementById("username").value = traveller.userId || "";
        document.getElementById("username").disabled = true;
        document.getElementById("passwordLabel").hidden = true;
        document.getElementById("password").required = false;
        document.getElementById("fname").value = traveller.fname || "";
        document.getElementById("lname").value = traveller.lname || "";
        document.getElementById("email").value = traveller.email || "";
        document.getElementById("phone").value = (traveller.phno || "").toString().replace(/^\+91\s*/, "");
        document.getElementById("gender").value = traveller.gender || "";
        document.getElementById("dob").value = traveller.dob || "";
        document.getElementById("lang_spoken").value = (traveller.plang || []).join(", ");
        document.getElementById("bio").value = traveller.bio || "";
        formTitle.textContent = `Edit Traveller ${travellerIdOf(traveller)}`;
    };

    const render = () => {
        const searchTerm = (searchInput ? searchInput.value.toLowerCase().trim() : "");
        const filtered = travellers.filter(t => {
            if (!searchTerm) return true;
            return (t.fname || "").toLowerCase().includes(searchTerm) ||
                   (t.lname || "").toLowerCase().includes(searchTerm) ||
                   (t.email || "").toLowerCase().includes(searchTerm);
        });

        const activeTravellers = filtered.filter(t => t.status !== 'restricted' && !t.isDeleted);
        const restrictedTravellers = filtered.filter(t => t.status === 'restricted' || t.isDeleted);

        const renderCards = (items) => items.length ? items.map((t) => `
            <article class="crud-card ${t.status === 'restricted' ? 'restricted-card' : ''}" style="${t.status === 'restricted' ? 'opacity: 0.7; background: #fff1f2; border-color: #fecdd3;' : ''}">
                <h3>${t.fname || ""} ${t.lname || ""} ${t.status === 'restricted' ? '<span style="color:red;font-size:12px;">(Restricted)</span>' : ''}</h3>
                <div class="crud-meta">
                    <strong>ID:</strong> ${travellerIdOf(t)}<br>
                    <strong>Email:</strong> ${t.email || "-"}<br>
                    <strong>Phone:</strong> ${t.phno || "-"}<br>
                    <strong>Languages:</strong> ${(t.plang || []).join(", ") || "-"}
                </div>
                <div class="crud-card-actions">
                    <button class="crud-btn" data-action="edit" data-id="${travellerIdOf(t)}">Edit</button>
                    ${t.status === 'restricted' 
                        ? `<button class="crud-btn" style="background:#22c55e;color:white;" data-action="restore" data-id="${travellerIdOf(t)}">Restore</button>` 
                        : `<button class="crud-btn crud-danger" data-action="delete" data-id="${travellerIdOf(t)}">Restrict</button>`
                    }
                </div>
            </article>
        `).join("") : '<p class="crud-meta" style="grid-column: 1 / -1;">No travellers found in this section.</p>';

        list.classList.remove("crud-grid");
        
        list.innerHTML = `
            <div class="active-guides-section" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px;">
                ${renderCards(activeTravellers)}
            </div>
            ${restrictedTravellers.length > 0 ? `
                <div class="restricted-guides-section" style="margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                    <h3 style="color: #ef4444; margin-bottom: 16px;">Restricted Travellers</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px;">
                        ${renderCards(restrictedTravellers)}
                    </div>
                </div>
            ` : ''}
        `;
    };

    if (searchInput) {
        searchInput.addEventListener("input", render);
    }

    const load = async () => {
        try {
            clearMessage(message);
            travellers = await apiGet("/traveller");
            render();
        } catch (error) {
            showMessage(message, error.message);
            list.innerHTML = '<p class="crud-meta">Unable to load travellers.</p>';
        }
    };

    form.onsubmit = async (event) => {
        event.preventDefault();
        const id = document.getElementById("travellerId").value;
        try {
            if (id) {
                await apiPatch(`/traveller/${encodeURIComponent(id)}`, payload());
            } else {
                const username = document.getElementById("username").value.trim();
                const password = document.getElementById("password").value;
                const email = document.getElementById("email").value.trim();
                const fname = document.getElementById("fname").value.trim();
                const lname = document.getElementById("lname").value.trim();
                const phone = document.getElementById("phone").value.trim();
                
                await apiPost("/auth/register", {
                    username: username,
                    password: password,
                    email: email,
                    role: "traveller",
                    name: fname + " " + lname,
                    phone: phone
                });
                await apiPost("/traveller", payload());
            }
            showMessage(message, id ? "Traveller updated successfully." : "Traveller created successfully.", true);
            reset();
            document.getElementById("crudModal").style.display = "none";
            await load();
        } catch (error) {
            showMessage(message, error.message);
        }
    };

    list.onclick = async (event) => {
        const button = event.target.closest("button");
        if (!button) return;
        const id = button.dataset.id;
        const traveller = travellers.find((item) => String(travellerIdOf(item)) === String(id));
        if (button.dataset.action === "edit" && traveller) {
            fill(traveller);
            document.getElementById("crudModal").style.display = "flex";
        }
        if (button.dataset.action === "delete") {
            if (confirm("Restrict this traveller? They will be unable to access their account.")) {
                try {
                    await apiPatch(`/traveller/${encodeURIComponent(id)}`, { status: "restricted" });
                    showMessage(message, "Traveller restricted successfully.", true);
                    await load();
                } catch (error) {
                    showMessage(message, error.message);
                }
            }
        }
        if (button.dataset.action === "restore") {
            if (confirm("Restore this traveller? They will regain access to their account.")) {
                try {
                    await apiPatch(`/traveller/${encodeURIComponent(id)}`, { status: "active" });
                    showMessage(message, "Traveller restored successfully.", true);
                    await load();
                } catch (error) {
                    showMessage(message, error.message);
                }
            }
        }
    };

    document.getElementById("resetBtn").onclick = reset;
    void load();
}

export function renderHotelCrudPage(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    renderShell(container, "Hotel Partners", "Create, update, and manage hotel partners and their properties.", `
        <form id="crudForm" class="crud-form">
            <input type="hidden" id="hotelId">
            <label>Username (Partner ID)<input id="username" required minlength="3" title="Unique username for login"></label>
            <label id="passwordLabel">Password<input type="password" id="password" minlength="6" required title="Password for login"></label>
            <label>Partner Name<input id="partnerName" required minlength="2" title="Name of the person managing this account"></label>
            <label>Email<input id="email" type="email" required></label>
            <label>Phone
                <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
                    <span style="font-weight: 600; color: #4B5563; padding-left: 8px;">+91</span>
                    <input id="phone" type="tel" pattern="[6-9][0-9]{9}" maxlength="10" title="Please enter a valid 10-digit Indian mobile number starting with 6-9" oninput="this.value = this.value.replace(/[^0-9]/g, '')" required style="flex: 1; margin-top: 0;">
                </div>
            </label>
            <hr style="grid-column: 1 / -1; margin: 10px 0; border: none; border-top: 1px solid #e5e7eb;">
            <label style="grid-column: 1 / -1; font-weight: bold; color: #374151;">Hotel Property Details</label>
            <label>Hotel Name<input id="hotelName" required minlength="2"></label>
            <label>City<input id="city" required></label>
            <label>Location<input id="location" required></label>
            <label>Stars<input id="stars" type="number" min="1" max="5" required></label>
            <label>Price per Night (₹)<input id="pricePerNight" type="number" min="0" required></label>
            <label>Total Rooms<input id="totalRooms" type="number" min="1" required></label>
            <label class="crud-full">Amenities (comma separated)<input id="amenities" placeholder="Pool, WiFi, Breakfast"></label>
            <label class="crud-full">Description<textarea id="description" required></textarea></label>
            <div class="crud-actions crud-full">
                <button type="submit" class="crud-btn crud-primary">Save Hotel Partner</button>
                <button type="button" id="resetBtn" class="crud-btn">Clear</button>
            </div>
        </form>
    `, "All Hotels", `
        <input type="text" id="hotelSearchInput" placeholder="Search hotels..." style="padding: 10px 16px; border: 1px solid #dbe2ef; border-radius: 8px; font-size: 14px; width: 100%; max-width: 300px; margin-left: auto; outline: none; transition: border-color 0.2s; box-sizing: border-box; height: 40px;">
    `);

    const form = document.getElementById("crudForm");
    const list = document.getElementById("crudList");
    const message = document.getElementById("crudMessage");
    const formTitle = document.getElementById("formTitle");
    const searchInput = document.getElementById("hotelSearchInput");
    let items = [];

    const payload = () => ({
        partnerId: document.getElementById("username").value.trim(),
        name: document.getElementById("hotelName").value.trim(),
        city: document.getElementById("city").value.trim(),
        location: document.getElementById("location").value.trim(),
        stars: Number(document.getElementById("stars").value),
        pricePerNight: Number(document.getElementById("pricePerNight").value),
        totalRooms: Number(document.getElementById("totalRooms").value),
        amenities: splitList(document.getElementById("amenities").value),
        description: document.getElementById("description").value.trim()
    });

    const reset = () => {
        form.reset();
        document.getElementById("hotelId").value = "";
        document.getElementById("username").disabled = false;
        document.getElementById("passwordLabel").hidden = false;
        document.getElementById("password").required = true;
        document.getElementById("password").value = "";
        formTitle.textContent = "Add Hotel Partner";
        clearMessage(message);
    };

    const fill = (hotel) => {
        document.getElementById("hotelId").value = hotel.id;
        document.getElementById("username").value = hotel.partnerId || "";
        document.getElementById("username").disabled = true;
        document.getElementById("passwordLabel").hidden = true;
        document.getElementById("password").required = false;
        document.getElementById("partnerName").value = "Partner (Cannot edit name here)";
        document.getElementById("partnerName").disabled = true;
        document.getElementById("email").value = "hidden@example.com";
        document.getElementById("email").disabled = true;
        document.getElementById("phone").value = "0000000000";
        document.getElementById("phone").disabled = true;
        
        document.getElementById("hotelName").value = hotel.name || "";
        document.getElementById("city").value = hotel.city || "";
        document.getElementById("location").value = hotel.location || "";
        document.getElementById("stars").value = hotel.stars || 1;
        document.getElementById("pricePerNight").value = hotel.pricePerNight || 0;
        document.getElementById("totalRooms").value = hotel.totalRooms || 1;
        document.getElementById("amenities").value = (hotel.amenities || []).join(", ");
        document.getElementById("description").value = hotel.description || "";
        
        formTitle.textContent = `Edit Hotel ${hotel.name}`;
    };

    const render = () => {
        const searchTerm = (searchInput ? searchInput.value.toLowerCase().trim() : "");
        const filtered = items.filter(h => {
            if (!searchTerm) return true;
            return (h.name || "").toLowerCase().includes(searchTerm) ||
                   (h.city || "").toLowerCase().includes(searchTerm) ||
                   (h.location || "").toLowerCase().includes(searchTerm);
        });

        const activeHotels = filtered.filter(h => h.status !== 'restricted' && !h.isDeleted);
        const restrictedHotels = filtered.filter(h => h.status === 'restricted' || h.isDeleted);

        const renderCards = (list) => list.length ? list.map((h) => `
            <article class="crud-card ${h.status === 'restricted' ? 'restricted-card' : ''}" style="${h.status === 'restricted' ? 'opacity: 0.7; background: #fff1f2; border-color: #fecdd3;' : ''}">
                <h3>${h.name || ""} ${h.status === 'restricted' ? '<span style="color:red;font-size:12px;">(Restricted)</span>' : ''}</h3>
                <div class="crud-meta">
                    <strong>Hotel ID:</strong> ${h.id}<br>
                    <strong>Partner ID:</strong> ${h.partnerId || "-"}<br>
                    <strong>City:</strong> ${h.city || "-"}<br>
                    <strong>Amenities:</strong> ${(h.amenities || []).slice(0,3).join(", ") || "-"}
                </div>
                <div class="crud-card-actions">
                    <button class="crud-btn" data-action="edit" data-id="${h.id}">Edit</button>
                    ${h.status === 'restricted' 
                        ? `<button class="crud-btn" style="background:#22c55e;color:white;" data-action="restore" data-id="${h.id}">Restore</button>` 
                        : `<button class="crud-btn crud-danger" data-action="delete" data-id="${h.id}">Restrict</button>`
                    }
                </div>
            </article>
        `).join("") : '<p class="crud-meta" style="grid-column: 1 / -1;">No hotels found in this section.</p>';

        list.classList.remove("crud-grid");
        
        list.innerHTML = `
            <div class="active-guides-section" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px;">
                ${renderCards(activeHotels)}
            </div>
            ${restrictedHotels.length > 0 ? `
                <div class="restricted-guides-section" style="margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                    <h3 style="color: #ef4444; margin-bottom: 16px;">Restricted Hotels</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px;">
                        ${renderCards(restrictedHotels)}
                    </div>
                </div>
            ` : ''}
        `;
    };

    if (searchInput) {
        searchInput.addEventListener("input", render);
    }

    const load = async () => {
        try {
            clearMessage(message);
            items = await apiGet("/hotels");
            render();
        } catch (error) {
            showMessage(message, error.message);
            list.innerHTML = '<p class="crud-meta">Unable to load hotels.</p>';
        }
    };

    form.onsubmit = async (event) => {
        event.preventDefault();
        const id = document.getElementById("hotelId").value;
        try {
            if (id) {
                await apiPatch(`/hotels/${encodeURIComponent(id)}`, payload());
            } else {
                const username = document.getElementById("username").value.trim();
                const password = document.getElementById("password").value;
                const email = document.getElementById("email").value.trim();
                const partnerName = document.getElementById("partnerName").value.trim();
                const phone = document.getElementById("phone").value.trim();
                const location = document.getElementById("city").value.trim();
                
                await apiPost("/auth/register", {
                    username: username,
                    password: password,
                    email: email,
                    role: "hotel",
                    name: partnerName,
                    location: location,
                    phone: phone
                });
                await apiPost("/hotels", payload());
            }
            showMessage(message, id ? "Hotel updated successfully." : "Hotel Partner created successfully.", true);
            reset();
            document.getElementById("crudModal").style.display = "none";
            await load();
        } catch (error) {
            showMessage(message, error.message);
        }
    };

    list.onclick = async (event) => {
        const button = event.target.closest("button");
        if (!button) return;
        const id = button.dataset.id;
        const hotel = items.find((item) => String(item.id) === String(id));
        if (button.dataset.action === "edit" && hotel) {
            fill(hotel);
            document.getElementById("crudModal").style.display = "flex";
        }
        if (button.dataset.action === "delete") {
            if (confirm("Restrict this hotel partner?")) {
                try {
                    await apiPatch(`/hotels/${encodeURIComponent(id)}`, { status: "restricted" });
                    showMessage(message, "Hotel restricted successfully.", true);
                    await load();
                } catch (error) {
                    showMessage(message, error.message);
                }
            }
        }
        if (button.dataset.action === "restore") {
            if (confirm("Restore this hotel partner?")) {
                try {
                    await apiPatch(`/hotels/${encodeURIComponent(id)}`, { status: "active" });
                    showMessage(message, "Hotel restored successfully.", true);
                    await load();
                } catch (error) {
                    showMessage(message, error.message);
                }
            }
        }
    };

    document.getElementById("resetBtn").onclick = reset;
    void load();
}

export function renderExperienceCrudPage(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    renderShell(container, "Experience Partners", "Create, update, and manage experience partners and their offerings.", `
        <form id="crudForm" class="crud-form">
            <input type="hidden" id="expId">
            <label>Username (Partner ID)<input id="username" required minlength="3" title="Unique username for login"></label>
            <label id="passwordLabel">Password<input type="password" id="password" minlength="6" required title="Password for login"></label>
            <label>Partner Name<input id="partnerName" required minlength="2" title="Name of the person managing this account"></label>
            <label>Email<input id="email" type="email" required></label>
            <label>Phone
                <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
                    <span style="font-weight: 600; color: #4B5563; padding-left: 8px;">+91</span>
                    <input id="phone" type="tel" pattern="[6-9][0-9]{9}" maxlength="10" title="Please enter a valid 10-digit Indian mobile number starting with 6-9" oninput="this.value = this.value.replace(/[^0-9]/g, '')" required style="flex: 1; margin-top: 0;">
                </div>
            </label>
            <hr style="grid-column: 1 / -1; margin: 10px 0; border: none; border-top: 1px solid #e5e7eb;">
            <label style="grid-column: 1 / -1; font-weight: bold; color: #374151;">Experience Details</label>
            <label>Experience Title<input id="expTitle" required minlength="2"></label>
            <label>Destination<input id="destination" required></label>
            <label>Category
                <select id="category" required>
                    <option value="">Select...</option>
                    <option value="adventure">Adventure</option>
                    <option value="culture">Culture</option>
                    <option value="culinary">Culinary</option>
                    <option value="wellness">Wellness</option>
                    <option value="wildlife">Wildlife</option>
                    <option value="photography">Photography</option>
                    <option value="tours">Tours</option>
                    <option value="water sports">Water Sports</option>
                </select>
            </label>
            <label>Price (₹)<input id="price" type="number" min="0" required></label>
            <label>Duration (Hours)<input id="durationHours" type="number" min="1" required></label>
            <label>Capacity<input id="capacity" type="number" min="1" required></label>
            <label class="crud-full">Description<textarea id="description" required></textarea></label>
            <div class="crud-actions crud-full">
                <button type="submit" class="crud-btn crud-primary">Save Experience Partner</button>
                <button type="button" id="resetBtn" class="crud-btn">Clear</button>
            </div>
        </form>
    `, "All Experiences", `
        <input type="text" id="expSearchInput" placeholder="Search experiences..." style="padding: 10px 16px; border: 1px solid #dbe2ef; border-radius: 8px; font-size: 14px; width: 100%; max-width: 300px; margin-left: auto; outline: none; transition: border-color 0.2s; box-sizing: border-box; height: 40px;">
    `);

    const form = document.getElementById("crudForm");
    const list = document.getElementById("crudList");
    const message = document.getElementById("crudMessage");
    const formTitle = document.getElementById("formTitle");
    const searchInput = document.getElementById("expSearchInput");
    let items = [];

    const payload = () => ({
        partnerId: document.getElementById("username").value.trim(),
        title: document.getElementById("expTitle").value.trim(),
        destination: document.getElementById("destination").value.trim(),
        category: document.getElementById("category").value,
        price: Number(document.getElementById("price").value),
        durationHours: Number(document.getElementById("durationHours").value),
        capacity: Number(document.getElementById("capacity").value),
        description: document.getElementById("description").value.trim()
    });

    const reset = () => {
        form.reset();
        document.getElementById("expId").value = "";
        document.getElementById("username").disabled = false;
        document.getElementById("passwordLabel").hidden = false;
        document.getElementById("password").required = true;
        document.getElementById("password").value = "";
        formTitle.textContent = "Add Experience Partner";
        clearMessage(message);
    };

    const fill = (exp) => {
        document.getElementById("expId").value = exp.id;
        document.getElementById("username").value = exp.partnerId || "";
        document.getElementById("username").disabled = true;
        document.getElementById("passwordLabel").hidden = true;
        document.getElementById("password").required = false;
        document.getElementById("partnerName").value = "Partner (Cannot edit name here)";
        document.getElementById("partnerName").disabled = true;
        document.getElementById("email").value = "hidden@example.com";
        document.getElementById("email").disabled = true;
        document.getElementById("phone").value = "0000000000";
        document.getElementById("phone").disabled = true;
        
        document.getElementById("expTitle").value = exp.title || "";
        document.getElementById("destination").value = exp.destination || "";
        document.getElementById("category").value = exp.category || "";
        document.getElementById("price").value = exp.price || 0;
        document.getElementById("durationHours").value = exp.durationHours || 1;
        document.getElementById("capacity").value = exp.capacity || 1;
        document.getElementById("description").value = exp.description || "";
        
        formTitle.textContent = `Edit Experience ${exp.title}`;
    };

    const render = () => {
        const searchTerm = (searchInput ? searchInput.value.toLowerCase().trim() : "");
        const filtered = items.filter(e => {
            if (!searchTerm) return true;
            return (e.title || "").toLowerCase().includes(searchTerm) ||
                   (e.destination || "").toLowerCase().includes(searchTerm) ||
                   (e.category || "").toLowerCase().includes(searchTerm);
        });

        const activeExps = filtered.filter(e => e.status !== 'restricted' && !e.isDeleted);
        const restrictedExps = filtered.filter(e => e.status === 'restricted' || e.isDeleted);

        const renderCards = (list) => list.length ? list.map((e) => `
            <article class="crud-card ${e.status === 'restricted' ? 'restricted-card' : ''}" style="${e.status === 'restricted' ? 'opacity: 0.7; background: #fff1f2; border-color: #fecdd3;' : ''}">
                <h3>${e.title || ""} ${e.status === 'restricted' ? '<span style="color:red;font-size:12px;">(Restricted)</span>' : ''}</h3>
                <div class="crud-meta">
                    <strong>Exp ID:</strong> ${e.id}<br>
                    <strong>Partner ID:</strong> ${e.partnerId || "-"}<br>
                    <strong>Destination:</strong> ${e.destination || "-"}<br>
                    <strong>Category:</strong> ${e.category || "-"}
                </div>
                <div class="crud-card-actions">
                    <button class="crud-btn" data-action="edit" data-id="${e.id}">Edit</button>
                    ${e.status === 'restricted' 
                        ? `<button class="crud-btn" style="background:#22c55e;color:white;" data-action="restore" data-id="${e.id}">Restore</button>` 
                        : `<button class="crud-btn crud-danger" data-action="delete" data-id="${e.id}">Restrict</button>`
                    }
                </div>
            </article>
        `).join("") : '<p class="crud-meta" style="grid-column: 1 / -1;">No experiences found in this section.</p>';

        list.classList.remove("crud-grid");
        
        list.innerHTML = `
            <div class="active-guides-section" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px;">
                ${renderCards(activeExps)}
            </div>
            ${restrictedExps.length > 0 ? `
                <div class="restricted-guides-section" style="margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                    <h3 style="color: #ef4444; margin-bottom: 16px;">Restricted Experiences</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px;">
                        ${renderCards(restrictedExps)}
                    </div>
                </div>
            ` : ''}
        `;
    };

    if (searchInput) {
        searchInput.addEventListener("input", render);
    }

    const load = async () => {
        try {
            clearMessage(message);
            items = await apiGet("/experiences");
            render();
        } catch (error) {
            showMessage(message, error.message);
            list.innerHTML = '<p class="crud-meta">Unable to load experiences.</p>';
        }
    };

    form.onsubmit = async (event) => {
        event.preventDefault();
        const id = document.getElementById("expId").value;
        try {
            if (id) {
                await apiPatch(`/experiences/${encodeURIComponent(id)}`, payload());
            } else {
                const username = document.getElementById("username").value.trim();
                const password = document.getElementById("password").value;
                const email = document.getElementById("email").value.trim();
                const partnerName = document.getElementById("partnerName").value.trim();
                const phone = document.getElementById("phone").value.trim();
                const location = document.getElementById("destination").value.trim();
                
                await apiPost("/auth/register", {
                    username: username,
                    password: password,
                    email: email,
                    role: "experience",
                    name: partnerName,
                    location: location,
                    phone: phone
                });
                await apiPost("/experiences", payload());
            }
            showMessage(message, id ? "Experience updated successfully." : "Experience Partner created successfully.", true);
            reset();
            document.getElementById("crudModal").style.display = "none";
            await load();
        } catch (error) {
            showMessage(message, error.message);
        }
    };

    list.onclick = async (event) => {
        const button = event.target.closest("button");
        if (!button) return;
        const id = button.dataset.id;
        const exp = items.find((item) => String(item.id) === String(id));
        if (button.dataset.action === "edit" && exp) {
            fill(exp);
            document.getElementById("crudModal").style.display = "flex";
        }
        if (button.dataset.action === "delete") {
            if (confirm("Restrict this experience partner?")) {
                try {
                    await apiPatch(`/experiences/${encodeURIComponent(id)}`, { status: "restricted" });
                    showMessage(message, "Experience restricted successfully.", true);
                    await load();
                } catch (error) {
                    showMessage(message, error.message);
                }
            }
        }
        if (button.dataset.action === "restore") {
            if (confirm("Restore this experience partner?")) {
                try {
                    await apiPatch(`/experiences/${encodeURIComponent(id)}`, { status: "active" });
                    showMessage(message, "Experience restored successfully.", true);
                    await load();
                } catch (error) {
                    showMessage(message, error.message);
                }
            }
        }
    };

    document.getElementById("resetBtn").onclick = reset;
    void load();
}


