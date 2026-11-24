const N = (v) => (v == null || isNaN(Number(v))) ? -1 : Number(v);
const S = (v) => (v == null || v === "") ? "#" : String(v);

export function getUserStatsHTML(users = [], partners = []) {
    const totalUsers           = users.length ?? -1;
    const pendingVerifications = users.filter(u => u.status === "Pending").length ?? -1;

    // Average Partner Rating
    const avgRating = partners.length > 0
        ? (partners.reduce((acc, p) => acc + N(p.rating), 0) / partners.length).toFixed(1)
        : -1;

    const satisfactionPct = avgRating === -1
        ? "-1"
        : `${((avgRating / 5) * 100).toFixed(0)}%`;

    const dynamicStats = [
        { label: "Total Users",        value: totalUsers === -1           ? -1  : totalUsers.toLocaleString(),          color: "blue",        icon: "../../components/ui/users.png",      subtext: "registered accounts" },
        { label: "Pending Verify",     value: pendingVerifications === -1 ? -1  : pendingVerifications,                 color: "orange",      icon: "../../components/ui/operations.png", subtext: "awaiting verification" },
        { label: "Avg Response Time",  value: "#",                                                                       color: "light-green", icon: "../../components/ui/support.svg",    subtext: "static — backend TBD" },
        { label: "Partner Satisfaction", value: satisfactionPct,                                                         color: "violet",      icon: "../../components/ui/avgrating.svg",  subtext: "based on ratings" }
    ];

    return `
        <div id="ops-stats" style="display:grid;grid-template-columns:repeat(4,1fr);gap:24px;margin-bottom:32px;">
            ${dynamicStats.map(stat => `
                <div class="stat-card ${stat.color}">
                    <div style="margin-bottom:12px;">
                        <img src="${stat.icon}" style="width:26px;opacity:0.6;filter:grayscale(100%);">
                    </div>
                    <p class="stat-label" style="font-weight:600;color:#6c757d;margin-bottom:8px;font-size:0.85rem;">
                        ${S(stat.label).toUpperCase()}
                    </p>
                    <h2 class="stat-value" style="font-size:1.8rem;margin-bottom:8px;font-weight:bold;color:#212529;">
                        ${stat.value}
                    </h2>
                    <p class="stat-subtext" style="font-size:0.85rem;color:#a0aab2;margin:0;">
                        ${stat.trend ? `<span style="color:#28a745;">↗ ${stat.trend}</span> ` : ""}
                        ${stat.subtext || ""}
                    </p>
                </div>
            `).join("")}
        </div>
    `;
}
