export function renderTravelerRoleGate(container, user) {
    container.innerHTML = `
        <section class="traveler-guard">
            <h1>Traveller access only</h1>
            <p>This page is reserved for traveller workflows. The current session is using the <strong>${user?.role || "unknown"}</strong> role.</p>
        </section>
    `;
}

export function showWorkspaceToast(message, variant = "success") {
    let toast = document.getElementById("traveler-workspace-toast");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "traveler-workspace-toast";
        toast.className = "traveler-workspace-toast";
        document.body.appendChild(toast);
    }

    toast.className = `traveler-workspace-toast show ${variant}`;
    toast.textContent = message;

    if (toast.timeoutId) {
        clearTimeout(toast.timeoutId);
    }

    toast.timeoutId = setTimeout(() => {
        toast.className = "traveler-workspace-toast";
    }, 2800);
}

export function createEmptyState(title, description, actionLabel = "") {
    return `
        <div class="traveler-empty-state">
            <h3>${title}</h3>
            <p>${description}</p>
            ${actionLabel ? `<span class="traveler-empty-chip">${actionLabel}</span>` : ""}
        </div>
    `;
}

export function formatCurrency(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
    }).format(amount || 0);
}

export function formatDate(dateString) {
    if (!dateString) {
        return "--";
    }

    return new Date(dateString).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

export function calculateTripLength(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return 0;
    }

    const diff = end.getTime() - start.getTime();
    return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
}

export function renderFieldError(errors, key) {
    return errors[key] ? `<span class="field-error">${errors[key]}</span>` : "";
}
