import { apiGetAndSync } from "../utils/api.js";

const N = (v) => (v == null || isNaN(Number(v))) ? -1 : Number(v);
const S = (v) => (v == null || v === "") ? "#" : String(v);

// Called by operations.js before rendering
export async function prefetchOpsStats() {
    const data = await apiGetAndSync("/finance/stats", "opsData", []);
    return Array.isArray(data) ? data : [];
}

export function getStatsHTML(opsStats = []) {
    if (!Array.isArray(opsStats) || opsStats.length === 0) {
        try { opsStats = JSON.parse(localStorage.getItem("opsData") || "[]"); } catch { opsStats = []; }
    }

    return `
        <div id="ops-stats" style="display:grid;grid-template-columns:repeat(4,1fr);gap:24px;">
            ${opsStats.map(stat => `
                <div class="stat-card ${S(stat.color)}">
                    <div class="card-icon">
                        <img src="${S(stat.icon)}" alt="icon">
                    </div>
                    <p class="stat-label">${S(stat.label)}</p>
                    <h2 class="stat-value">${stat.value == null ? -1 : stat.value}</h2>
                    <p class="stat-subtext ${S(stat.subClass)}">${S(stat.subtext)}</p>
                </div>
            `).join("")}
        </div>
    `;
}
