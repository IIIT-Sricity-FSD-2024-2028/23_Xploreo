export function cloneData(data) {
    return JSON.parse(JSON.stringify(data));
}

export function readStorage(key, fallback) {
    const value = localStorage.getItem(key);

    if (!value) {
        return cloneData(fallback);
    }

    try {
        return JSON.parse(value);
    } catch (error) {
        console.error(`Failed to parse ${key}`, error);
        return cloneData(fallback);
    }
}

export function writeStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

export function setElementText(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

export function formatCurrency(value) {
    return `$${Number(value || 0).toLocaleString("en-US")}`;
}

export function clearFieldErrors(scope = document) {
    scope.querySelectorAll(".field-error").forEach((element) => {
        element.textContent = "";
    });
}

export function setFieldError(fieldId, message, scope = document) {
    const element = scope.querySelector(`[data-error-for="${fieldId}"]`);
    if (element) {
        element.textContent = message;
    }
}

export function setFormMessage(id, message = "", variant = "error") {
    const element = document.getElementById(id);
    if (!element) return;

    element.textContent = message;
    element.className = `form-message ${message ? `form-message-${variant}` : ""}`;
}

export function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = "flex";
    }
}

export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = "none";
    }
}

export function attachModalDismissals() {
    document.querySelectorAll("[data-close-modal]").forEach((button) => {
        button.onclick = () => closeModal(button.dataset.closeModal);
    });

    document.querySelectorAll(".modal").forEach((modal) => {
        modal.onclick = (event) => {
            if (event.target === modal) {
                closeModal(modal.id);
            }
        };
    });
}

export function sanitizeValue(value) {
    return String(value ?? "").trim();
}

export function getBookingStatusMeta(status) {
    if (status === "checked") {
        return { label: "Checked-In", className: "checked" };
    }

    if (status === "confirmed") {
        return { label: "Confirmed", className: "confirmed" };
    }

    return { label: "Cancelled", className: "cancelled" };
}
export function calculateDashboardStats(catalog, bookings) {
    const todayStr = new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
    });

    const stats = {
        today: 0,
        upcoming: 0,
        total: 0,
        rating: 4.8 // Default or average if not in data
    };

    // Calculate Today's Guests
    bookings.forEach(b => {
        if (b.date === todayStr || b.day === todayStr) {
            stats.today += (b.seats || b.guests || 0);
        }
    });

    // Calculate Upcoming Sessions (slots with availability or future dates)
    const allSlots = catalog.flatMap(exp => exp.slots || []);
    const todayRaw = new Date().toISOString().split("T")[0];
    
    stats.upcoming = allSlots.filter(slot => slot.date >= todayRaw && slot.available).length;
    
    // Total Bookings across all time
    stats.total = bookings.reduce((sum, b) => sum + (b.seats || b.guests || 0), 0);

    return stats;
}
