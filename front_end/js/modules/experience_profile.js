import { bookingsData, experiences as experienceCatalog, profileData as experienceProfile } from "../api/legacyData.js";
import { validateEmail, validatePhone } from "../utils/validation.js";
import {
    clearFieldErrors,
    readStorage,
    sanitizeValue,
    setElementText,
    setFieldError,
    setFormMessage,
    writeStorage
} from "./experience_shared.js";

export function renderExperienceProfilePage() {
    const data = readStorage("experienceProfile", experienceProfile);
    const catalog = readStorage("experienceCatalog", experienceCatalog);
    const bookings = readStorage("experienceBookings", bookingsData);
    const saveButton = document.getElementById("saveBtn");
    const editButton = document.getElementById("editBtn");
    const addSlotButton = document.getElementById("addSlot");
    const slotInput = document.getElementById("profileSlotInput");
    let isEditing = false;

    function get(id) {
        return document.getElementById(id);
    }

    function toggleEditState(nextState) {
        isEditing = nextState;
        document.querySelectorAll(".experience-profile-page input, .experience-profile-page textarea").forEach((element) => {
            if (element.id === "companyName" || element.id === "location") return;
            element.disabled = !nextState;
        });

        if (slotInput) slotInput.disabled = !nextState;
        if (addSlotButton) addSlotButton.disabled = !nextState;
        if (editButton) editButton.classList.toggle("hidden", nextState);
        if (saveButton) saveButton.classList.toggle("hidden", !nextState);
    }

    function renderDays() {
        const daysEl = get("days");
        if (!daysEl) return;

        daysEl.innerHTML = "";
        data.days.forEach((day) => {
            const span = document.createElement("span");
            span.textContent = day;
            span.className = data.activeDays.includes(day) ? "is-active" : "";

            span.onclick = () => {
                if (!isEditing) return;

                if (data.activeDays.includes(day)) {
                    data.activeDays = data.activeDays.filter((item) => item !== day);
                } else {
                    data.activeDays.push(day);
                }

                writeStorage("experienceProfile", data);
                renderDays();
            };

            daysEl.appendChild(span);
        });
    }

    function renderSlots() {
        const slotsEl = get("slots");
        if (!slotsEl) return;

        slotsEl.innerHTML = "";
        data.slots.forEach((slot, index) => {
            const span = document.createElement("span");
            span.textContent = slot;
            span.className = `slot-pill ${isEditing ? "slot-pill-editable" : ""}`;

            span.onclick = () => {
                if (!isEditing) return;
                data.slots.splice(index, 1);
                writeStorage("experienceProfile", data);
                renderSlots();
            };

            slotsEl.appendChild(span);
        });
    }

    setElementText("companyName", data.company || "No Name");
    setElementText("location", data.location || "No Location");

    ["title", "region", "description", "category", "duration", "groupSize", "phone", "email", "gst", "bank"].forEach((field) => {
        const element = get(field);
        if (element) {
            element.value = data[field] || "";
        }
    });

    const instant = get("instant");
    if (instant) {
        instant.checked = data.instant;
    }

    const totalBookings = bookings.reduce((sum, item) => sum + item.users.reduce((userSum, user) => userSum + user.seats, 0), 0);
    setElementText("profileExperienceCount", `Total Experiences: ${catalog.length}`);
    setElementText("profileBookingCount", `Active Bookings: ${totalBookings}`);

    renderDays();
    renderSlots();
    toggleEditState(false);

    if (editButton) {
        editButton.onclick = () => {
            clearFieldErrors(document);
            setFormMessage("profileFormMessage");
            toggleEditState(true);
        };
    }

    if (saveButton) {
        saveButton.onclick = () => {
            clearFieldErrors(document);
            setFormMessage("profileFormMessage");
            let isValid = true;

            ["title", "region", "description", "category", "duration", "groupSize", "phone", "email", "gst", "bank"].forEach((field) => {
                data[field] = sanitizeValue(get(field).value);
                if (!data[field]) {
                    setFieldError(field, "This field is required.");
                    isValid = false;
                }
            });

            if (data.phone && !validatePhone(data.phone.replace(/\D/g, ""))) {
                setFieldError("phone", "Enter a valid phone number.");
                isValid = false;
            }

            if (data.email && !validateEmail(data.email)) {
                setFieldError("email", "Enter a valid email address.");
                isValid = false;
            }

            if (!data.activeDays.length) {
                setFieldError("days", "Select at least one active day.");
                isValid = false;
            }

            if (!data.slots.length) {
                setFieldError("slots", "Add at least one session slot.");
                isValid = false;
            }

            data.instant = !!get("instant")?.checked;

            if (!isValid) {
                setFormMessage("profileFormMessage", "Please complete all required profile details before saving.");
                return;
            }

            writeStorage("experienceProfile", data);
            
            // Sync with Current User for Navbar and App-wide consistency
            let currentUser = JSON.parse(localStorage.getItem("currentUser"));
            if (currentUser) {
                currentUser.name = data.title; // Assign title as name
                localStorage.setItem("currentUser", JSON.stringify(currentUser));
            }

            toggleEditState(false);
            setElementText("companyName", data.company || data.title);
            setElementText("location", data.location || data.region);
            setFormMessage("profileFormMessage", "Profile updated successfully.", "success");
            
            // Trigger Navbar re-render if it exists
            setTimeout(() => {
                location.reload(); // Quickest way to sync all components
            }, 1000);
        };
    }

    if (addSlotButton) {
        addSlotButton.onclick = () => {
            if (!isEditing || !slotInput) return;

            clearFieldErrors(document);
            const value = sanitizeValue(slotInput.value);
            const slotPattern = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i;

            if (!value) {
                setFieldError("profileSlotInput", "Enter a slot time before adding.");
                return;
            }

            if (!slotPattern.test(value)) {
                setFieldError("profileSlotInput", "Use a valid time like 2:00 PM.");
                return;
            }

            data.slots.push(value.toUpperCase());
            writeStorage("experienceProfile", data);
            slotInput.value = "";
            renderSlots();
        };
    }
}
