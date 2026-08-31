import { opsData } from '../api/legacyData.js';

export function getUserStatsHTML(users = [], partners = []) {
    // 1. Calculate Real-Time Metrics
    const totalUsers = users.length;
    const pendingVerifications = users.filter(u => u.status === 'Pending').length;
    
    // Calculate Average Partner Rating
    const avgRating = partners.length > 0 
        ? (partners.reduce((acc, p) => acc + parseFloat(p.rating), 0) / partners.length).toFixed(1)
        : "0.0";

    // 2. Map metrics to the UI structure
    // We override the hardcoded 'value' from opsData with our live calculations
    const dynamicStats = [
        { ...opsData[0], value: totalUsers.toLocaleString() },         // Total Users
        { ...opsData[1], value: pendingVerifications },                // Pending Users
        { ...opsData[2], value: opsData[2].value },                    // Response Time (Keep static for now)
        { ...opsData[3], value: `${(avgRating / 5 * 100).toFixed(0)}%` } // Partner Satisfaction %
    ];

    return `
        <div id="ops-stats" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-bottom: 32px;">
            ${dynamicStats.map(stat => `
                <div class="stat-card ${stat.color}">
                    <div style="margin-bottom: 12px;">
                        <img src="${stat.icon}" style="width: 26px; opacity: 0.6; filter: grayscale(100%);">
                    </div>
                    
                    <p class="stat-label" style="font-weight: 600; color: #6c757d; margin-bottom: 8px; font-size: 0.85rem;">
                        ${stat.label.toUpperCase()}
                    </p>
                    
                    <h2 class="stat-value" style="font-size: 1.8rem; margin-bottom: 8px; font-weight: bold; color: #212529;">
                        ${stat.value}
                    </h2>
                    
                    <p class="stat-subtext" style="font-size: 0.85rem; color: #a0aab2; margin: 0;">
                        ${stat.trend ? `<span style="color: #28a745;">↗ ${stat.trend}</span> ` : ""}
                        ${stat.subtext}
                    </p>
                </div>
            `).join('')}
        </div>
    `;
}
