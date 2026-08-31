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

export function renderSchedulePage(containerId, currentUser = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="crud-page">
            <header class="crud-page-header">
                <div>
                    <h1>Schedule</h1>
                    <p>Manage guide availability, booked slots, and blocked dates.</p>
                </div>
            </header>
            <section class="crud-panel">
                <h2 id="formTitle">Add Schedule Item</h2>
                <div id="crudMessage" class="crud-message" hidden></div>
                <form id="scheduleForm" class="crud-form">
                    <input type="hidden" id="scheduleId">
                    <label>Guide ID<input id="guideId" required></label>
                    <label>Title<input id="title" required></label>
                    <label>Date<input id="date" type="date" required></label>
                    <label>Start time<input id="startTime" type="time" required></label>
                    <label>End time<input id="endTime" type="time" required></label>
                    <label>Status<select id="status"><option value="available">Available</option><option value="booked">Booked</option><option value="blocked">Blocked</option></select></label>
                    <label>Location<input id="location" required></label>
                    <label>Capacity<input id="capacity" type="number" min="1" value="1"></label>
                    <label class="crud-full">Notes<textarea id="notes"></textarea></label>
                    <div class="crud-actions crud-full">
                        <button type="submit" class="crud-btn crud-primary">Save Schedule</button>
                        <button type="button" id="resetBtn" class="crud-btn">Clear</button>
                    </div>
                </form>
            </section>
            <section class="crud-panel">
                <div class="crud-toolbar">
                    <h2>All Schedule Items</h2>
                    <input id="guideFilter" placeholder="Filter by guide ID">
                </div>
                <div id="scheduleList" class="crud-grid"></div>
            </section>
        </div>
    `;

    const form = document.getElementById("scheduleForm");
    const list = document.getElementById("scheduleList");
    const message = document.getElementById("crudMessage");
    const formTitle = document.getElementById("formTitle");
    const guideFilter = document.getElementById("guideFilter");
    let scheduleItems = [];

    const getPayload = () => ({
        guideId: document.getElementById("guideId").value.trim(),
        title: document.getElementById("title").value.trim(),
        date: document.getElementById("date").value,
        startTime: document.getElementById("startTime").value,
        endTime: document.getElementById("endTime").value,
        status: document.getElementById("status").value,
        location: document.getElementById("location").value.trim(),
        capacity: Number(document.getElementById("capacity").value || 1),
        notes: document.getElementById("notes").value.trim()
    });

    const resetForm = () => {
        form.reset();
        document.getElementById("scheduleId").value = "";
        document.getElementById("capacity").value = 1;
        document.getElementById("guideId").value = currentUser?.id || currentUser?.userId || "";
        formTitle.textContent = "Add Schedule Item";
        clearMessage(message);
    };

    const fillForm = (item) => {
        document.getElementById("scheduleId").value = item.id;
        document.getElementById("guideId").value = item.guideId || "";
        document.getElementById("title").value = item.title || "";
        document.getElementById("date").value = item.date || "";
        document.getElementById("startTime").value = item.startTime || "";
        document.getElementById("endTime").value = item.endTime || "";
        document.getElementById("status").value = item.status || "available";
        document.getElementById("location").value = item.location || "";
        document.getElementById("capacity").value = item.capacity || 1;
        document.getElementById("notes").value = item.notes || "";
        formTitle.textContent = `Edit Schedule ${item.id}`;
    };

    const renderSchedule = () => {
        list.innerHTML = scheduleItems.length ? scheduleItems.map((item) => `
            <article class="crud-card">
                <h3>${item.title || "-"}</h3>
                <div class="crud-meta">
                    <strong>ID:</strong> ${item.id}<br>
                    <strong>Guide ID:</strong> ${item.guideId || "-"}<br>
                    <strong>Date:</strong> ${item.date || "-"}<br>
                    <strong>Time:</strong> ${item.startTime || "-"} to ${item.endTime || "-"}<br>
                    <strong>Status:</strong> ${item.status || "-"}<br>
                    <strong>Location:</strong> ${item.location || "-"}<br>
                    <strong>Capacity:</strong> ${item.capacity ?? "-"}
                </div>
                <p class="crud-meta">${item.notes || ""}</p>
                <div class="crud-card-actions">
                    <button class="crud-btn" data-action="edit" data-id="${item.id}">Edit</button>
                    <button class="crud-btn crud-danger" data-action="delete" data-id="${item.id}">Delete</button>
                </div>
            </article>
        `).join("") : '<p class="crud-meta">No schedule items found.</p>';
    };

    const loadSchedule = async () => {
        try {
            clearMessage(message);
            const guideId = guideFilter.value.trim();
            const endpoint = guideId ? `/schedule?guideId=${encodeURIComponent(guideId)}` : "/schedule";
            scheduleItems = await apiGet(endpoint);
            renderSchedule();
        } catch (error) {
            showMessage(message, error.message);
            list.innerHTML = '<p class="crud-meta">Unable to load schedule.</p>';
        }
    };

    form.onsubmit = async (event) => {
        event.preventDefault();
        const id = document.getElementById("scheduleId").value;
        try {
            if (id) await apiPatch(`/schedule/${encodeURIComponent(id)}`, getPayload());
            else await apiPost("/schedule", getPayload());
            showMessage(message, "Schedule saved successfully.", true);
            resetForm();
            await loadSchedule();
        } catch (error) {
            showMessage(message, error.message);
        }
    };

    list.onclick = async (event) => {
        const button = event.target.closest("button");
        if (!button) return;
        const id = button.dataset.id;
        const item = scheduleItems.find((entry) => String(entry.id) === String(id));
        if (button.dataset.action === "edit" && item) fillForm(item);
        if (button.dataset.action === "delete") {
            try {
                await apiDelete(`/schedule/${encodeURIComponent(id)}`);
                showMessage(message, "Schedule deleted successfully.", true);
                await loadSchedule();
            } catch (error) {
                showMessage(message, error.message);
            }
        }
    };

    guideFilter.oninput = () => {
        window.clearTimeout(guideFilter._timer);
        guideFilter._timer = window.setTimeout(loadSchedule, 250);
    };

    document.getElementById("resetBtn").onclick = resetForm;
    resetForm();
    void loadSchedule();
}
