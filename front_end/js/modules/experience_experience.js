const experienceCatalog = (() => { try { return JSON.parse(localStorage.getItem("experiences") || "[]"); } catch { return []; } })();
import {
    attachModalDismissals,
    clearFieldErrors,
    cloneData,
    closeModal,
    formatCurrency,
    openModal,
    readStorage,
    sanitizeValue,
    setFieldError,
    setFormMessage,
    writeStorage
} from "./experience_shared.js";

export function renderExperienceCatalogPage() {
    let experiences = readStorage("experienceCatalog", experienceCatalog);
    const container = document.getElementById("experienceList");
    const addExperienceButton = document.getElementById("openAddExperienceBtn");
    const addExperienceForm = document.getElementById("addExperienceForm");
    const editExperienceForm = document.getElementById("editExperienceForm");
    const slotsForm = document.getElementById("slotsForm");
    const catalogHeader = document.getElementById("catalogHeader");
    const slotsManagerView = document.getElementById("slotsManagerView");
    const slotsManagerTitle = document.getElementById("slotsManagerTitle");
    const slotsManagerSubtitle = document.getElementById("slotsManagerSubtitle");
    const slotsDateFilter = document.getElementById("slotsDateFilter");
    const slotsScheduleList = document.getElementById("slotsScheduleList");
    const openAddSlotBtn = document.getElementById("openAddSlotBtn");
    const slotsModalTitle = document.getElementById("slotsModalTitle");
    const slotsSubmitBtn = document.getElementById("slotsSubmitBtn");
    const imageInput = document.getElementById("expImage");
    const imagePreviewGrid = document.getElementById("imagePreviewGrid");
    const thumbnailHint = document.getElementById("thumbnailHint");
    let currentEditId = null;
    let currentManagedExperienceId = null;
    let currentSlotId = null;
    let slotModalMode = "add";
    let selectedThumbnailIndex = 0;
    let uploadedImageUrls = [];

    if (!container) return;

    function persistExperiences() {
        writeStorage("experienceCatalog", experiences);
    }

    function slotDateLabel(date) {
        return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric"
        });
    }

    function ensureExperienceSlots() {
        let changed = false;
        const catalogDefaults = new Map(
            experienceCatalog.map((item) => [item.id, cloneData(item.slots || [])])
        );

        experiences = experiences.map((exp) => {
            if (Array.isArray(exp.slots) && exp.slots.length) {
                return exp;
            }

            changed = true;
            const importedSlots = catalogDefaults.get(exp.id) || [];

            return {
                ...exp,
                slots: importedSlots.length
                    ? importedSlots
                    : [
                        {
                            id: `${exp.id}-1`,
                            date: "2026-03-27",
                            time: exp.nextSlot || "10:00 AM",
                            booked: exp.booked || 0,
                            capacity: exp.capacity,
                            available: true
                        }
                    ]
            };
        });

        if (changed) {
            persistExperiences();
        }
    }

    function getStatusClass(status) {
        return status === "active" ? "confirmed" : "cancelled";
    }

    function getManagedExperience() {
        return experiences.find((item) => item.id === currentManagedExperienceId) || null;
    }

    function resetCatalogMessages() {
        clearFieldErrors(document);
        setFormMessage("addExperienceMessage");
        setFormMessage("editExperienceMessage");
        setFormMessage("slotsMessage");
    }

    function validateExperiencePayload(prefix) {
        let isValid = true;
        const name = sanitizeValue(document.getElementById(`${prefix}Name`).value);
        const price = Number(document.getElementById(`${prefix}Price`).value);
        const duration = sanitizeValue(document.getElementById(`${prefix}Duration`).value);
        const capacity = Number(document.getElementById(`${prefix}Capacity`).value);

        if (!name || name.length < 3) {
            setFieldError(`${prefix}Name`, "Enter a name with at least 3 characters.");
            isValid = false;
        }

        if (!Number.isFinite(price) || price <= 0) {
            setFieldError(`${prefix}Price`, "Enter a valid price greater than 0.");
            isValid = false;
        }

        if (!duration) {
            setFieldError(`${prefix}Duration`, "Duration is required.");
            isValid = false;
        }

        if (!Number.isInteger(capacity) || capacity <= 0) {
            setFieldError(`${prefix}Capacity`, "Capacity must be a whole number above 0.");
            isValid = false;
        }

        return { isValid, name, price, duration, capacity };
    }

    function validateAddImage() {
        const files = Array.from(imageInput?.files || []);

        if (!files.length) {
            setFieldError("expImage", "Please upload an experience image.");
            return false;
        }

        if (files.some((file) => !file.type.startsWith("image/"))) {
            setFieldError("expImage", "Only image files are allowed.");
            return false;
        }

        return true;
    }

    function validateSlotPayload() {
        let isValid = true;
        const date = sanitizeValue(document.getElementById("slotDate").value);
        const time = sanitizeValue(document.getElementById("slotTime").value);
        const capacity = Number(document.getElementById("slotCapacity").value);

        if (!date) {
            setFieldError("slotDate", "A slot date is required.");
            isValid = false;
        }

        if (!time) {
            setFieldError("slotTime", "Session time is required.");
            isValid = false;
        }

        if (!Number.isInteger(capacity) || capacity <= 0) {
            setFieldError("slotCapacity", "Capacity must be a whole number above 0.");
            isValid = false;
        }

        return { isValid, date, time, capacity };
    }

    function renderImagePreviewGrid() {
        if (!imagePreviewGrid) return;

        if (!uploadedImageUrls.length) {
            imagePreviewGrid.innerHTML = "";
            imagePreviewGrid.classList.add("hidden");
            thumbnailHint?.classList.add("hidden");
            return;
        }

        imagePreviewGrid.innerHTML = uploadedImageUrls.map((url, index) => `
            <button
                type="button"
                class="experience-thumbnail-card ${index === selectedThumbnailIndex ? "is-selected" : ""}"
                data-thumbnail-index="${index}"
                aria-pressed="${index === selectedThumbnailIndex}"
            >
                <img src="${url}" alt="Experience preview ${index + 1}">
                <span class="experience-thumbnail-label">${index === selectedThumbnailIndex ? "Thumbnail" : `Image ${index + 1}`}</span>
            </button>
        `).join("");

        imagePreviewGrid.classList.remove("hidden");
        thumbnailHint?.classList.remove("hidden");
    }

    function refreshImagePreview() {
        const files = Array.from(imageInput?.files || []);
        selectedThumbnailIndex = 0;
        uploadedImageUrls = files.map((file) => URL.createObjectURL(file));
        renderImagePreviewGrid();
    }

    function timeToMinutes(value) {
        const match = String(value).trim().match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
        if (!match) return Number.MAX_SAFE_INTEGER;
        let hour = Number(match[1]) % 12;
        const minute = Number(match[2]);
        const period = match[3].toUpperCase();
        if (period === "PM") hour += 12;
        return hour * 60 + minute;
    }

    function sortSlots(slots) {
        return [...slots].sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return timeToMinutes(a.time) - timeToMinutes(b.time);
        });
    }

    function getSlotMeta(slot) {
        const percent = slot.capacity ? Math.min(100, (slot.booked / slot.capacity) * 100) : 0;

        if (percent >= 100) {
            return { label: "Full", className: "full", progressClass: "red" };
        }

        if (percent >= 85) {
            return { label: "Nearly Full", className: "nearly-full", progressClass: "warning" };
        }

        return { label: "Available", className: "available", progressClass: "green" };
    }

    function toggleCatalogView(showManager) {
        if (catalogHeader) catalogHeader.classList.toggle("hidden", showManager);
        container.classList.toggle("hidden", showManager);
        if (slotsManagerView) slotsManagerView.classList.toggle("hidden", !showManager);
    }

    function populateSlotDateFilter(exp) {
        if (!slotsDateFilter || !exp) return;

        const dates = [...new Set(sortSlots(exp.slots).map((slot) => slot.date))];
        const currentValue = slotsDateFilter.value || "all";

        slotsDateFilter.innerHTML = `
            <option value="all">All Dates</option>
            ${dates.map((date) => `<option value="${date}">${slotDateLabel(date)}</option>`).join("")}
        `;

        slotsDateFilter.value = dates.includes(currentValue) ? currentValue : "all";
    }

    function renderSlotsManager() {
        const exp = getManagedExperience();
        if (!exp || !slotsScheduleList) return;

        toggleCatalogView(true);
        if (slotsManagerTitle) slotsManagerTitle.textContent = exp.title;
        if (slotsManagerSubtitle) slotsManagerSubtitle.textContent = "Manage time slots and availability";
        populateSlotDateFilter(exp);

        const selectedDate = slotsDateFilter?.value || "all";
        const filteredSlots = sortSlots(exp.slots).filter((slot) => selectedDate === "all" || slot.date === selectedDate);
        const groupedSlots = filteredSlots.reduce((acc, slot) => {
            acc[slot.date] = acc[slot.date] || [];
            acc[slot.date].push(slot);
            return acc;
        }, {});

        slotsScheduleList.innerHTML = Object.keys(groupedSlots).length
            ? Object.entries(groupedSlots).map(([date, slots]) => `
                <section class="slots-day-group">
                    <h2 class="slots-day-heading">${slotDateLabel(date)}</h2>
                    <div class="slots-card-grid">
                        ${slots.map((slot) => {
                            const slotMeta = getSlotMeta(slot);
                            const percent = slot.capacity ? Math.min(100, (slot.booked / slot.capacity) * 100) : 0;

                            return `
                                <article class="slot-card" data-slot-id="${slot.id}">
                                    <div class="slot-card-top">
                                        <h3>${slot.time}</h3>
                                        <span class="status-pill ${slotMeta.className}">${slotMeta.label}</span>
                                    </div>
                                    <div class="slot-duration-row">
                                        <span>Duration</span>
                                        <strong>${exp.duration}</strong>
                                    </div>
                                    <div class="slot-bookings-row">
                                        <span>Seats booked</span>
                                        <strong>${slot.booked} / ${slot.capacity}</strong>
                                    </div>
                                    <div class="progress-bar slot-progress">
                                        <div class="progress-fill ${slotMeta.progressClass}" style="width:${percent}%"></div>
                                    </div>
                                    <div class="slot-card-actions">
                                        <button type="button" data-slot-action="edit" data-slot-id="${slot.id}">Edit Slot</button>
                                        <button type="button" class="danger-ghost-btn" data-slot-action="delete" data-slot-id="${slot.id}">Delete</button>
                                    </div>
                                    <div class="slot-card-divider"></div>
                                    <div class="slot-control-row">
                                        <span>Capacity</span>
                                        <div class="capacity-stepper">
                                            <button type="button" data-slot-action="decrease" data-slot-id="${slot.id}">-</button>
                                            <strong>${slot.capacity}</strong>
                                            <button type="button" data-slot-action="increase" data-slot-id="${slot.id}">+</button>
                                        </div>
                                    </div>
                                    <div class="slot-control-row">
                                        <span>Availability</span>
                                        <button type="button" class="availability-toggle ${slot.available ? "is-on" : ""}" data-slot-action="toggle" data-slot-id="${slot.id}" aria-pressed="${slot.available}">
                                            <span></span>
                                        </button>
                                    </div>
                                </article>
                            `;
                        }).join("")}
                    </div>
                </section>
            `).join("")
            : `<div class="empty-state"><h3>No slots for this date</h3><p>Try another date or add a new slot.</p></div>`;
    }

    function openSlotEditor(mode, expId, slotId = null) {
        const exp = experiences.find((item) => item.id === expId);
        if (!exp) return;

        currentManagedExperienceId = expId;
        currentSlotId = slotId;
        slotModalMode = mode;

        const slot = exp.slots.find((item) => item.id === slotId);
        if (slotsModalTitle) slotsModalTitle.textContent = mode === "edit" ? "Edit Slot" : "Add New Slot";
        if (slotsSubmitBtn) {
            slotsSubmitBtn.textContent = mode === "edit" ? "Save Changes" : "Add Slot";
        }
        resetCatalogMessages();

        document.getElementById("slotDate").value = slot?.date || exp.slots[0]?.date || "2026-03-27";
        document.getElementById("slotTime").value = slot?.time || exp.nextSlot || "10:00 AM";
        document.getElementById("slotCapacity").value = slot?.capacity || exp.capacity;

        openModal("slotsModal");
    }

    function openSlotsFromQuery() {
        const params = new URLSearchParams(window.location.search);
        const manageTitle = params.get("manage");
        if (!manageTitle) return;

        const selectedExperience = experiences.find((item) => item.title === manageTitle);
        if (!selectedExperience) return;

        currentManagedExperienceId = selectedExperience.id;
        renderSlotsManager();

        params.delete("manage");
        const nextQuery = params.toString();
        const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
        window.history.replaceState({}, "", nextUrl);
    }

    function renderCatalog() {
        container.innerHTML = experiences.map((exp) => `
            <article class="card experience-catalog-card">
                <div class="experience-card-row">
                    <img src="${exp.image}" class="exp-img" alt="${exp.title}" onerror="this.src='https://via.placeholder.com/180x120'" />
                    <div class="exp-content">
                        <div class="experience-card-header-line catalog-card-header">
                            <div class="catalog-title-block">
                                <h2>${exp.title}</h2>
                                <span class="status ${getStatusClass(exp.status)}">${exp.status}</span>
                            </div>
                        </div>
                        <div class="exp-details">
                            <div class="exp-detail-item">
                                <p>Price per person</p>
                                <h3>${formatCurrency(exp.price)}</h3>
                            </div>
                            <div class="exp-detail-item">
                                <p>Duration</p>
                                <h3><span class="detail-icon">◷</span>${exp.duration}</h3>
                            </div>
                            <div class="exp-detail-item">
                                <p>Capacity per session</p>
                                <h3><span class="detail-icon">◌</span>${exp.capacity} guests</h3>
                            </div>
                        </div>
                        <div class="slot-bar">
                            <span>Next session: ${exp.nextSlot} • ${exp.booked}/${exp.capacity} seats booked</span>
                        </div>
                        <div class="actions catalog-actions">
                            <button class="primary-btn" type="button" data-action="open-slots" data-id="${exp.id}">Manage Slots</button>
                            <button type="button" data-action="edit-experience" data-id="${exp.id}">Edit</button>
                            <button type="button" class="danger-ghost-btn" data-action="delete-experience" data-id="${exp.id}">Delete</button>
                            <button type="button" data-action="view-bookings">View Bookings</button>
                        </div>
                    </div>
                </div>
            </article>
        `).join("");
    }

    ensureExperienceSlots();

    container.onclick = (event) => {
        const actionButton = event.target.closest("[data-action]");
        if (!actionButton) return;

        const expId = Number(actionButton.dataset.id);
        const selectedExperience = experiences.find((item) => item.id === expId);

        if (actionButton.dataset.action === "view-bookings") {
            const params = new URLSearchParams();
            if (selectedExperience) params.set("experience", selectedExperience.title);
            window.location.href = `./experience_bookings.html${params.toString() ? `?${params.toString()}` : ""}`;
            return;
        }

        if (!selectedExperience) return;

        if (actionButton.dataset.action === "edit-experience") {
            currentEditId = expId;
            document.getElementById("editName").value = selectedExperience.title;
            document.getElementById("editPrice").value = selectedExperience.price;
            document.getElementById("editDuration").value = selectedExperience.duration;
            document.getElementById("editCapacity").value = selectedExperience.capacity;
            resetCatalogMessages();
            openModal("editModal");
        }

        if (actionButton.dataset.action === "delete-experience") {
            experiences = experiences.filter((item) => item.id !== expId);

            if (currentManagedExperienceId === expId) {
                currentManagedExperienceId = null;
                toggleCatalogView(false);
            }

            persistExperiences();
            renderCatalog();
            return;
        }

        if (actionButton.dataset.action === "open-slots") {
            currentManagedExperienceId = expId;
            if (slotsDateFilter) slotsDateFilter.value = "all";
            renderSlotsManager();
        }
    };

    if (slotsScheduleList) {
        slotsScheduleList.onclick = (event) => {
            const actionButton = event.target.closest("[data-slot-action]");
            if (!actionButton) return;

            const exp = getManagedExperience();
            if (!exp) return;

            const slotId = actionButton.dataset.slotId;
            const slot = exp.slots.find((item) => item.id === slotId);
            if (!slot) return;

            if (actionButton.dataset.slotAction === "edit") {
                openSlotEditor("edit", exp.id, slot.id);
                return;
            }

            if (actionButton.dataset.slotAction === "delete") {
                exp.slots = exp.slots.filter((item) => item.id !== slot.id);
                persistExperiences();
                renderCatalog();
                renderSlotsManager();
                return;
            }

            if (actionButton.dataset.slotAction === "decrease") {
                if (slot.capacity > Math.max(1, slot.booked)) {
                    slot.capacity -= 1;
                }
            }

            if (actionButton.dataset.slotAction === "increase") {
                slot.capacity += 1;
            }

            if (actionButton.dataset.slotAction === "toggle") {
                slot.available = !slot.available;
            }

            persistExperiences();
            renderCatalog();
            renderSlotsManager();
        };
    }

    if (slotsDateFilter) {
        slotsDateFilter.onchange = () => renderSlotsManager();
    }

    if (addExperienceButton) {
        addExperienceButton.onclick = () => {
            addExperienceForm.reset();
            resetCatalogMessages();
            uploadedImageUrls = [];
            selectedThumbnailIndex = 0;
            refreshImagePreview();
            openModal("addModal");
        };
    }

    if (imageInput) {
        imageInput.onchange = refreshImagePreview;
    }

    if (imagePreviewGrid) {
        imagePreviewGrid.onclick = (event) => {
            const button = event.target.closest("[data-thumbnail-index]");
            if (!button) return;

            event.preventDefault();
            event.stopPropagation();
            selectedThumbnailIndex = Number(button.dataset.thumbnailIndex) || 0;
            renderImagePreviewGrid();
        };
    }

    if (openAddSlotBtn) {
        openAddSlotBtn.onclick = () => {
            const exp = getManagedExperience();
            if (!exp) return;
            openSlotEditor("add", exp.id);
        };
    }

    addExperienceForm.onsubmit = (event) => {
        event.preventDefault();
        resetCatalogMessages();
        const payload = validateExperiencePayload("exp");
        const imageIsValid = validateAddImage();

        if (!payload.isValid || !imageIsValid) {
            setFormMessage("addExperienceMessage", "Please fix the highlighted fields before saving.");
            return;
        }

        const newExperienceId = Date.now();
        experiences.push({
            id: newExperienceId,
            title: payload.name,
            price: payload.price,
            duration: payload.duration,
            capacity: payload.capacity,
            status: "active",
            image: uploadedImageUrls[selectedThumbnailIndex] || uploadedImageUrls[0],
            images: [...uploadedImageUrls],
            nextSlot: "10:00 AM",
            booked: 0,
            slots: [
                {
                    id: `${newExperienceId}-1`,
                    date: "2026-03-27",
                    time: "10:00 AM",
                    booked: 0,
                    capacity: payload.capacity,
                    available: true
                }
            ]
        });

        persistExperiences();
        closeModal("addModal");
        renderCatalog();
        setFormMessage("addExperienceMessage", "Experience added successfully.", "success");
    };

    editExperienceForm.onsubmit = (event) => {
        event.preventDefault();
        resetCatalogMessages();
        const payload = validateExperiencePayload("edit");

        if (!payload.isValid) {
            setFormMessage("editExperienceMessage", "Please fix the highlighted fields before saving.");
            return;
        }

        const exp = experiences.find((item) => item.id === currentEditId);
        if (!exp) return;

        exp.title = payload.name;
        exp.price = payload.price;
        exp.duration = payload.duration;
        exp.capacity = payload.capacity;
        exp.slots = exp.slots.map((slot) => ({
            ...slot,
            capacity: Math.max(slot.booked, payload.capacity)
        }));

        persistExperiences();
        closeModal("editModal");
        renderCatalog();

        if (currentManagedExperienceId === exp.id) {
            renderSlotsManager();
        }

        setFormMessage("editExperienceMessage", "Experience updated successfully.", "success");
    };

    slotsForm.onsubmit = (event) => {
        event.preventDefault();
        resetCatalogMessages();
        const payload = validateSlotPayload();

        if (!payload.isValid) {
            setFormMessage("slotsMessage", "Please fix the highlighted fields before saving.");
            return;
        }

        const exp = getManagedExperience();
        if (!exp) return;

        if (slotModalMode === "edit") {
            const slot = exp.slots.find((item) => item.id === currentSlotId);
            if (!slot) return;
            slot.date = payload.date;
            slot.time = payload.time;
            slot.capacity = Math.max(slot.booked, payload.capacity);
        } else {
            exp.slots.push({
                id: `${exp.id}-${Date.now()}`,
                date: payload.date,
                time: payload.time,
                booked: 0,
                capacity: payload.capacity,
                available: true
            });

            if (slotsDateFilter) {
                slotsDateFilter.value = payload.date;
            }
        }

        exp.slots = sortSlots(exp.slots);
        const nextOpenSlot = exp.slots.find((slot) => slot.available) || exp.slots[0];
        if (nextOpenSlot) {
            exp.nextSlot = nextOpenSlot.time;
            exp.booked = nextOpenSlot.booked;
            exp.capacity = nextOpenSlot.capacity;
        }

        persistExperiences();
        closeModal("slotsModal");
        renderCatalog();
        renderSlotsManager();
        setFormMessage("slotsMessage", slotModalMode === "edit" ? "Session details updated." : "Slot added successfully.", "success");
    };

    attachModalDismissals();
    renderCatalog();
    openSlotsFromQuery();
}
