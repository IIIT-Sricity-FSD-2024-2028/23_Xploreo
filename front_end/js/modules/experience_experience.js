import { experiences as experienceCatalog } from "../api/legacyData.js";
import { getCurrentUser, getApiSession } from "../api/session.js";
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
import { createExperience, updateExperience, deleteExperience, fetchExperiences } from "../api/services.js";

export async function renderExperienceCatalogPage() {
    let experiences = [];
    try {
        const backendExps = await fetchExperiences();
        experiences = backendExps.map(exp => ({
            id: exp.id || String(Date.now()),
            title: exp.title,
            description: exp.description || exp.title,
            price: exp.price,
            duration: `${exp.durationHours} hours`,
            capacity: exp.capacity,
            category: exp.category || "adventure",
            status: "active",
            image: exp.image || "",
            images: exp.images || (exp.image ? [exp.image] : []),
            booked: exp.booked || 0,
            slots: exp.slots || []
        }));
        writeStorage("experienceCatalog", experiences);
    } catch (error) {
        console.warn("Failed to fetch experiences from backend", error);
        experiences = readStorage("experienceCatalog", experienceCatalog);
    }
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

    const actorLocation = getCurrentUser()?.location || getApiSession()?.user?.location || "Goa";
    if (catalogHeader) {
        const pTags = catalogHeader.querySelectorAll("p");
        if (pTags.length >= 2) {
            pTags[1].innerHTML = `Assigned Region: <span style="display:inline-block; padding:2px 10px; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; border-radius:9999px; font-weight:600; font-size:12px;">${actorLocation}</span> · Manage your experience offerings`;
        }
    }

    function persistExperiences() {
        writeStorage("experienceCatalog", experiences);
    }

    function syncExperienceSlots(exp) {
        updateExperience(String(exp.id), {
            title: exp.title,
            description: exp.description || exp.title,
            destination: exp.destination || exp.title,
            category: exp.category || "adventure",
            price: Number(exp.price),
            durationHours: parseInt(exp.duration) || 2,
            capacity: Number(exp.capacity),
            booked: Number(exp.booked || 0),
            nextSlot: exp.nextSlot || "",
            slots: (exp.slots || []).map(s => ({
                id: String(s.id),
                date: s.date,
                time: s.time,
                booked: Number(s.booked || 0),
                capacity: Number(s.capacity),
                available: Boolean(s.available)
            }))
        }).catch(e => console.warn("Failed to sync experience slots", e));
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
                slots: importedSlots
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
        return experiences.find((item) => String(item.id) === String(currentManagedExperienceId)) || null;
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
        const description = sanitizeValue(document.getElementById(`${prefix}Description`).value);
        const price = Number(document.getElementById(`${prefix}Price`).value);
        const duration = Number(document.getElementById(`${prefix}Duration`).value);
        const category = document.getElementById(`${prefix}Category`).value;
        const actorLocation = getCurrentUser()?.location || getApiSession()?.user?.location || "Goa";
        const location = actorLocation;
        if (document.getElementById(`${prefix}Location`)) {
            document.getElementById(`${prefix}Location`).value = actorLocation;
        }

        if (!name || name.length < 3) {
            setFieldError(`${prefix}Name`, "Enter a name with at least 3 characters.");
            isValid = false;
        }

        if (!description || description.length < 10) {
            setFieldError(`${prefix}Description`, "Enter a description with at least 10 characters.");
            isValid = false;
        }

        if (!Number.isFinite(price) || price <= 0) {
            setFieldError(`${prefix}Price`, "Enter a valid price greater than 0.");
            isValid = false;
        }

        if (!Number.isInteger(duration) || duration <= 0) {
            setFieldError(`${prefix}Duration`, "Enter a valid duration in hours greater than 0.");
            isValid = false;
        }

        return { isValid, name, description, price, duration, category, location };
    }

    function validateAddImage() {
        const files = Array.from(imageInput?.files || []);

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
        } else {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const slotDateObj = new Date(date);
            slotDateObj.setHours(0, 0, 0, 0);

            if (slotDateObj <= today) {
                setFieldError("slotDate", "Slots can only be created for tomorrow or later.");
                isValid = false;
            }
        }

        if (!time) {
            setFieldError("slotTime", "Session time is required.");
            isValid = false;
        }

        if (!Number.isInteger(capacity) || capacity <= 0) {
            setFieldError("slotCapacity", "Capacity must be a positive integer.");
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
        uploadedImageUrls = [];

        if (!files.length) {
            renderImagePreviewGrid();
            return;
        }

        let loaded = 0;
        files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                uploadedImageUrls[index] = e.target.result;
                loaded++;
                if (loaded === files.length) {
                    renderImagePreviewGrid();
                }
            };
            reader.readAsDataURL(file);
        });
    }

    function timeToMinutes(value) {
        const str = String(value).trim();

        const match24 = str.match(/^(\d{1,2}):(\d{2})$/);
        if (match24) {
            return Number(match24[1]) * 60 + Number(match24[2]);
        }

        const match12 = str.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
        if (!match12) return Number.MAX_SAFE_INTEGER;
        let hour = Number(match12[1]) % 12;
        const minute = Number(match12[2]);
        const period = match12[3].toUpperCase();
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
        const exp = experiences.find((item) => String(item.id) === String(expId));
        if (!exp) return;

        currentManagedExperienceId = expId;
        currentSlotId = slotId;
        slotModalMode = mode;

        const slot = exp.slots.find((item) => String(item.id) === String(slotId));
        if (slotsModalTitle) slotsModalTitle.textContent = mode === "edit" ? "Edit Slot" : "Add New Slot";
        if (slotsSubmitBtn) {
            slotsSubmitBtn.textContent = mode === "edit" ? "Save Changes" : "Add Slot";
        }
        resetCatalogMessages();

        const dateInput = document.getElementById("slotDate");
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split("T")[0];
        dateInput.value = slot?.date || exp.slots[0]?.date || tomorrowStr;
        dateInput.min = tomorrowStr;

        document.getElementById("slotTime").value = slot?.time || "10:00";
        document.getElementById("slotCapacity").value = slot?.capacity || exp.capacity || 10;

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
        if (!experiences || experiences.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #617084; background: #ffffff; border-radius: 12px; border: 1px dashed #d9e0ea;">
                    <svg style="width: 48px; height: 48px; margin-bottom: 16px; color: #a9b7c8;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <h3 style="margin: 0 0 8px; font-size: 18px; color: #273248;">No experiences right now</h3>
                    <p style="margin: 0; font-size: 14px;">You haven't added any experiences yet.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = experiences.map((exp) => {
            const sortedSlots = Array.isArray(exp.slots) ? sortSlots(exp.slots) : [];
            const nextSlotObj = sortedSlots.find(s => s.available) || sortedSlots[0] || null;


            const nextSessionDisplay = nextSlotObj
                ? `Next session: ${nextSlotObj.date} at ${nextSlotObj.time} • ${nextSlotObj.booked}/${nextSlotObj.capacity} seats booked`
                : exp.slots && exp.slots.length === 0
                    ? `No slots created yet`
                    : `No upcoming sessions`;

            return `
            <article class="card experience-catalog-card">
                <div class="experience-card-row">
                    ${exp.image ? `<img src="${exp.image}" class="exp-img" alt="${exp.title}" onerror="this.onerror=null;this.src='../components/ui/exploreIcon.jpg';" />` : `<div class="exp-img" style="display:flex; align-items:center; justify-content:center; background:#f5f5f5; color:#999; border-radius:8px; font-size:12px;">No Image</div>`}
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
                                <h3><span class="detail-icon">◌</span>${nextSlotObj ? `${nextSlotObj.capacity} guests` : (exp.capacity ? `${exp.capacity} guests` : "Set in slots")}</h3>
                            </div>
                        </div>
                        <div class="slot-bar">
                            <span>${nextSessionDisplay}</span>
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
        `;
        }).join("");
    }

    ensureExperienceSlots();

    container.onclick = (event) => {
        const actionButton = event.target.closest("[data-action]");
        if (!actionButton) return;

        const expId = actionButton.dataset.id;
        const selectedExperience = experiences.find((item) => String(item.id) === String(expId));

        if (actionButton.dataset.action === "view-bookings") {
            const params = new URLSearchParams();
            if (selectedExperience) params.set("experience", selectedExperience.title);
            window.location.href = `../pages/experience_bookings.html${params.toString() ? `?${params.toString()}` : ""}`;
            return;
        }

        if (!selectedExperience) return;

        if (actionButton.dataset.action === "edit-experience") {
            currentEditId = expId;
            document.getElementById("editName").value = selectedExperience.title;
            document.getElementById("editDescription").value = selectedExperience.description || selectedExperience.title;
            document.getElementById("editPrice").value = selectedExperience.price;
            document.getElementById("editDuration").value = parseInt(selectedExperience.duration) || 2;
            document.getElementById("editCategory").value = selectedExperience.category || "adventure";
            if (document.getElementById("editLocation")) {
                document.getElementById("editLocation").value = selectedExperience.destination || selectedExperience.location || "Goa";
            }
            resetCatalogMessages();
            const expLoc = document.getElementById("editLocation");
        if (expLoc) expLoc.value = getCurrentUser()?.location || getApiSession()?.user?.location || "Goa";
        
        // Populate dropzone for edit
        const urlInput = document.getElementById("editImageUrl");
        const preview = document.getElementById("editImagePreview");
        const content = document.getElementById("editDropzoneContent");
        const changeBtn = document.getElementById("editChangeImageBtn");
        
        if (urlInput) urlInput.value = exp.image || "";
        if (preview && exp.image) {
            preview.src = exp.image;
            preview.style.display = "block";
            if (content) content.style.opacity = "0";
            if (changeBtn) changeBtn.style.display = "block";
        } else {
            if (preview) preview.style.display = "none";
            if (content) content.style.opacity = "1";
            if (changeBtn) changeBtn.style.display = "none";
        }

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

            // Sync to backend
            deleteExperience(expId).catch(e => console.warn("Failed to sync experience deletion", e));
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
            const slot = exp.slots.find((item) => String(item.id) === String(slotId));
            if (!slot) return;

            if (actionButton.dataset.slotAction === "edit") {
                openSlotEditor("edit", exp.id, slot.id);
                return;
            }

            if (actionButton.dataset.slotAction === "delete") {
                exp.slots = exp.slots.filter((item) => item.id !== slot.id);
                persistExperiences();
                syncExperienceSlots(exp);
                renderCatalog();
                renderSlotsManager();
                return;
            }

            if (actionButton.dataset.slotAction === "decrease") {
                if (slot.capacity > Math.max(1, slot.booked)) {
                    slot.capacity -= 1;
                    slot.available = slot.booked < slot.capacity;
                }
            }

            if (actionButton.dataset.slotAction === "increase") {
                slot.capacity += 1;
                slot.available = slot.booked < slot.capacity;
            }

            if (actionButton.dataset.slotAction === "toggle") {
                slot.available = !slot.available;
            }

            exp.slots = sortSlots(exp.slots);
            const nextOpenSlot = exp.slots.find((s) => s.available) || exp.slots[0];
            if (nextOpenSlot) {
                exp.nextSlot = nextOpenSlot.time;
                exp.booked = nextOpenSlot.booked;
                exp.capacity = nextOpenSlot.capacity;
            }

            persistExperiences();
            syncExperienceSlots(exp);
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
            const expLoc = document.getElementById("expLocation");
            if (expLoc) expLoc.value = getCurrentUser()?.location || getApiSession()?.user?.location || "Goa";
            
            // Reset dropzone
            const urlInput = document.getElementById("expImageUrl");
            const preview = document.getElementById("expImagePreview");
            const content = document.getElementById("expDropzoneContent");
            const changeBtn = document.getElementById("expChangeImageBtn");
            if (urlInput) urlInput.value = "";
            if (preview) preview.style.display = "none";
            if (content) content.style.opacity = "1";
            if (changeBtn) changeBtn.style.display = "none";
            
            refreshImagePreview();
            openModal("addModal");
        };
    }

    function bindImageDropzone(inputId, urlId, previewId, dropzoneContentId, changeBtnId, dropzoneId) {
        const input = document.getElementById(inputId);
        const urlInput = document.getElementById(urlId);
        const preview = document.getElementById(previewId);
        const content = document.getElementById(dropzoneContentId);
        const changeBtn = document.getElementById(changeBtnId);
        const dropzone = document.getElementById(dropzoneId);

        const handleFile = (file) => {
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const base64Str = ev.target.result;
                    if(urlInput) urlInput.value = base64Str;
                    if(preview) {
                        preview.src = base64Str;
                        preview.style.display = "block";
                    }
                    if(content) content.style.opacity = "0";
                    if(changeBtn) changeBtn.style.display = "block";
                };
                reader.readAsDataURL(file);
            }
        };

        if(input) {
            input.addEventListener("change", (e) => {
                handleFile(e.target.files[0]);
            });
        }

        if(dropzone) {
            dropzone.addEventListener("dragover", (e) => {
                e.preventDefault();
                dropzone.classList.add("dragover");
            });

            dropzone.addEventListener("dragleave", (e) => {
                e.preventDefault();
                dropzone.classList.remove("dragover");
            });

            dropzone.addEventListener("drop", (e) => {
                e.preventDefault();
                dropzone.classList.remove("dragover");
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleFile(e.dataTransfer.files[0]);
                    if(input) input.files = e.dataTransfer.files;
                }
            });
        }
    }

    bindImageDropzone("expImage", "expImageUrl", "expImagePreview", "expDropzoneContent", "expChangeImageBtn", "expImageDropzone");
    bindImageDropzone("editImage", "editImageUrl", "editImagePreview", "editDropzoneContent", "editChangeImageBtn", "editImageDropzone");

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
        const expPayload = {
            id: newExperienceId,
            title: payload.name,
            description: payload.description,
            price: payload.price,
            duration: `${payload.duration} hours`,
            capacity: 0,
            category: payload.category,
            destination: payload.location,
            location: payload.location,
            status: "active",
            image: document.getElementById("expImageUrl")?.value || "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&q=80&w=900",
            images: document.getElementById("expImageUrl")?.value ? [document.getElementById("expImageUrl").value] : [],
            booked: 0,
            slots: []
        };
        experiences.push(expPayload);

        persistExperiences();

        // Sync to backend
        createExperience({
            id: String(newExperienceId),
            title: payload.name,
            description: payload.description,
            destination: payload.location,
            category: payload.category,
            price: Number(payload.price),
            durationHours: parseInt(payload.duration) || 2,
            capacity: 0,
            image: expPayload.image
        }).catch(e => console.warn("Failed to sync experience creation", e));

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

        const exp = experiences.find((item) => String(item.id) === String(currentEditId));
        if (!exp) return;

        exp.title = payload.name;
        exp.description = payload.description;
        exp.price = payload.price;
        exp.duration = `${payload.duration} hours`;
        exp.category = payload.category;
        exp.destination = payload.location;
        exp.location = payload.location;
        
        const newImg = document.getElementById("editImageUrl")?.value;
        if (newImg) {
            exp.image = newImg;
            exp.images = [newImg];
        }

        persistExperiences();

        // Sync to backend
        updateExperience(String(currentEditId), {
            title: payload.name,
            description: payload.description,
            destination: payload.location,
            category: payload.category,
            price: Number(payload.price),
            durationHours: parseInt(payload.duration) || 2,
            capacity: exp.capacity || 0,
            image: exp.image
        }).catch(e => console.warn("Failed to sync experience update", e));

        closeModal("editModal");
        renderCatalog();

        if (currentManagedExperienceId === exp.id) {
            renderSlotsManager();
        }

        setFormMessage("editExperienceMessage", "Experience updated successfully.", "success");
    };

    if (slotsForm) {
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

            const isDuplicate = exp.slots.some(
                (item) => item.date === payload.date &&
                    item.time === payload.time &&
                    (slotModalMode === "add" || String(item.id) !== String(currentSlotId))
            );

            if (isDuplicate) {
                setFieldError("slotTime", "A session already exists for this date and time.");
                setFormMessage("slotsMessage", "Please fix the highlighted fields before saving.");
                return;
            }

            if (slotModalMode === "edit") {
                const slot = exp.slots.find((item) => String(item.id) === String(currentSlotId));
                if (!slot) return;
                slot.date = payload.date;
                slot.time = payload.time;
                slot.capacity = Math.max(slot.booked, payload.capacity);
                slot.available = slot.booked < slot.capacity;
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
            syncExperienceSlots(exp);
            closeModal("slotsModal");
            renderCatalog();
            renderSlotsManager();
            setFormMessage("slotsMessage", slotModalMode === "edit" ? "Session details updated." : "Slot added successfully.", "success");
        };
    }


    attachModalDismissals();
    renderCatalog();
    openSlotsFromQuery();
}
