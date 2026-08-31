export function renderActivity(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const activities = [
        {
            type: "booking",
            title: "Booking Confirmed",
            desc: 'User <span class="text-blue">@marcus_dev</span> confirmed stay.',
            time: "Just now",
            iconClass: "icon-blue",
            // Simple Check Icon SVG
            icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
        },
        {
            type: "payout",
            title: "Payout Disbursed",
            desc: "₹12,400.00 released to Marriott.",
            time: "42 mins ago",
            iconClass: "icon-green",
            // Simple Cash/Bill Icon SVG
            icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path></svg>'
        }
    ];

    let html = `
        <div class="activity-card">
            <h2>Ecosystem Activity</h2>
            <div class="timeline">
    `;

    activities.forEach(act => {
        html += `
            <div class="timeline-item">
                <div class="timeline-icon ${act.iconClass}">
                    ${act.icon}
                </div>
                <div class="timeline-content">
                    <h4>${act.title}</h4>
                    <p>${act.desc}</p>
                    <span class="timeline-time">${act.time}</span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}