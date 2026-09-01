export function getStatsHTML(allBookings = []) {
    const totalBookings = allBookings.length;
    let completed = 0;
    
    allBookings.forEach(b => {
        if (b.status === "COMPLETED" || b.status === "CONFIRMED") {
            completed++;
        }
    });

    const currentStats = [
        {
            label: "TOTAL ANNUAL BOOKINGS",
            value: totalBookings.toLocaleString(),
            subtext: "↗ Real-time volume",
            color: "blue",
            icon: "../components/ui/operations.png"
        },
        {
            label: "ONGOING EXPERIENCES",
            value: "0",
            subtext: "Live sessions right now",
            color: "green",
            icon: "../components/ui/finance.png"
        },
        {
            label: "SUCCESSFUL COMPLETIONS",
            value: completed.toLocaleString(),
            subtext: totalBookings > 0 ? Math.round((completed / totalBookings) * 100) + "% Success Rate" : "0% Success Rate",
            color: "violet",
            icon: "../components/ui/ops-success.png"
        },
        {
            label: "ATTRITION & REFUNDS",
            value: "0",
            subtext: "Tracked via SLAs",
            color: "orange",
            icon: "../components/ui/ops-refund.png"
        }
    ];

    return `
        <div id="ops-stats" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px;">
            ${currentStats.map(stat => `
                <div class="stat-card ${stat.color}">
                    <div class="card-icon">
                        <img src="${stat.icon}" alt="icon">
                    </div>
                    <p class="stat-label">${stat.label}</p>
                    <h2 class="stat-value">${stat.value}</h2>
                    <p class="stat-subtext ${stat.subClass || ""}">${stat.subtext}</p>
                </div>
            `).join('')}
        </div>
    `;
}
