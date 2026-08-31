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
        document.body.style.overflow = "hidden";
    }
}

export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = "none";
        document.body.style.overflow = "";
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
    if (status === "checked" || status === "checked_in" || status === "CHECKED_IN") {
        return { label: "Checked-In", className: "checked" };
    }

    if (status === "end_requested" || status === "END_REQUESTED") {
        return { label: "Pending Confirm", className: "pending" };
    }

    if (status === "completed" || status === "COMPLETED") {
        return { label: "Completed", className: "completed" };
    }

    if (status === "confirmed" || status === "CONFIRMED") {
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

export function showAppAlert(message, title = "Notification") {
    const existing = document.getElementById("custom-app-alert");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "custom-app-alert";
    Object.assign(overlay.style, {
        position: "fixed",
        inset: "0",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(4px)",
        zIndex: "9999",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: "0",
        transition: "opacity 0.2s ease"
    });

    const modal = document.createElement("div");
    Object.assign(modal.style, {
        background: "white",
        borderRadius: "12px",
        padding: "24px",
        width: "90%",
        maxWidth: "400px",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        transform: "scale(0.95)",
        transition: "transform 0.2s ease",
        fontFamily: "'Inter', sans-serif"
    });

    modal.innerHTML = `
        <h3 style="margin: 0 0 12px 0; font-size: 18px; color: #1e293b; font-weight: 600;">${title}</h3>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.5;">${message}</p>
        <div style="display: flex; justify-content: flex-end;">
            <button id="custom-alert-ok" style="background-color: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 500; font-size: 14px; cursor: pointer; transition: background-color 0.2s;">OK</button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
        overlay.style.opacity = "1";
        modal.style.transform = "scale(1)";
    });

    const closeBtn = modal.querySelector("#custom-alert-ok");
    closeBtn.focus();
    
    closeBtn.onmouseover = () => closeBtn.style.backgroundColor = "#2563eb";
    closeBtn.onmouseout = () => closeBtn.style.backgroundColor = "#3b82f6";
    
    closeBtn.onclick = () => {
        overlay.style.opacity = "0";
        modal.style.transform = "scale(0.95)";
        setTimeout(() => overlay.remove(), 200);
    };
}
