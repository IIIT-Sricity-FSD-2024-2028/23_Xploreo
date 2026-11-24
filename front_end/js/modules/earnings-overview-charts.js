import { earningsByMonth } from "../utils/earningsByMonth.js";
import { formatCurrency } from "../utils/formatCurrency.js";

export function renderOverviewCharts(myTrips, completedTrips) {
    const { months } = earningsByMonth(myTrips);
    const last6 = months.slice(-6);

    const maxEarning = Math.max(...last6.map(m => m.amount), 1);
    const chartW = 400, chartH = 180, padX = 40, padY = 20;
    const usableW = chartW - padX * 2;
    const usableH = chartH - padY * 2;

    const points = last6.map((m, i) => {
        const x = padX + (i / (last6.length - 1 || 1)) * usableW;
        const y = padY + usableH - (m.amount / maxEarning) * usableH;
        return { x, y, ...m };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const areaPath = `${linePath} L${points[points.length - 1].x},${chartH - padY} L${points[0].x},${chartH - padY} Z`;

    const yLabels = [0, Math.round(maxEarning / 2), maxEarning].map((val, i) => {
        const y = padY + usableH - (val / maxEarning) * usableH;
        return `<text x="${padX - 5}" y="${y + 4}" text-anchor="end" fill="#9CA3AF" font-size="11">${formatCurrency(val)}</text>
                <line x1="${padX}" y1="${y}" x2="${chartW - padX}" y2="${y}" stroke="#F3F4F6" stroke-width="1"/>`;
    }).join('');

    const chartSVG = `
        <svg viewBox="0 0 ${chartW} ${chartH + 20}" class="earn-line-chart">
            ${yLabels}
            <path d="${areaPath}" fill="url(#chartGrad)" opacity="0.15"/>
            <path d="${linePath}" fill="none" stroke="#3B82F6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            ${points.map(p => `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#3B82F6" stroke="white" stroke-width="2"/>`).join('')}
            ${points.map(p => `<text x="${p.x}" y="${chartH - padY + 16}" text-anchor="middle" fill="#9CA3AF" font-size="11">${p.label}</text>`).join('')}
            <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#3B82F6"/>
                    <stop offset="100%" stop-color="#3B82F6" stop-opacity="0"/>
                </linearGradient>
            </defs>
        </svg>
    `;

    const tourTypes = {};
    completedTrips.forEach(t => {
        const dest = t.destination || t.location || "Other";
        let type = "Other Tours";
        const d = dest.toLowerCase();
        if (d.includes("museum") || d.includes("palace") || d.includes("chapelle") || d.includes("notre")) type = "Museum Tours";
        else if (d.includes("food") || d.includes("quarter")) type = "Food Tours";
        else if (d.includes("cruise") || d.includes("river") || d.includes("seine")) type = "Day Trips";
        else type = "City Tours";
        tourTypes[type] = (tourTypes[type] || 0) + (t.amount || 0);
    });

    const typeEntries = Object.entries(tourTypes).sort((a, b) => b[1] - a[1]);
    const typeTotal = typeEntries.reduce((s, [, v]) => s + v, 0) || 1;
    const typeColors = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6"];

    let cumulativeAngle = 0;
    const doughnutSegments = typeEntries.map(([name, val], i) => {
        const pct = val / typeTotal;
        const startAngle = cumulativeAngle;
        const endAngle = cumulativeAngle + pct * 360;
        cumulativeAngle = endAngle;
        const r = 70, cx = 90, cy = 90, inner = 45;
        const startRad = (startAngle - 90) * Math.PI / 180;
        const endRad = (endAngle - 90) * Math.PI / 180;
        const largeArc = pct > 0.5 ? 1 : 0;
        const x1 = cx + r * Math.cos(startRad), y1 = cy + r * Math.sin(startRad);
        const x2 = cx + r * Math.cos(endRad), y2 = cy + r * Math.sin(endRad);
        const ix1 = cx + inner * Math.cos(endRad), iy1 = cy + inner * Math.sin(endRad);
        const ix2 = cx + inner * Math.cos(startRad), iy2 = cy + inner * Math.sin(startRad);
        return `<path d="M${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${x2},${y2} L${ix1},${iy1} A${inner},${inner} 0 ${largeArc} 0 ${ix2},${iy2} Z" fill="${typeColors[i % typeColors.length]}"/>`;
    }).join('');

    const legendItems = typeEntries.map(([name, val], i) =>
        `<div class="earn-legend-item"><span class="earn-legend-dot" style="background:${typeColors[i % typeColors.length]};"></span>${name}<span class="earn-legend-pct">${Math.round((val / typeTotal) * 100)}%</span></div>`
    ).join('');

    return `
        <!-- Charts Row -->
        <div class="earn-charts-row">
            <div class="earn-chart-card earn-chart-line">
                <div class="earn-chart-header">
                    <div>
                        <h3 class="earn-chart-title">Monthly Earnings</h3>
                        <p class="earn-chart-sub">Last 6 months performance</p>
                    </div>
                </div>
                ${chartSVG}
            </div>
            <div class="earn-chart-card earn-chart-donut">
                <div class="earn-chart-header">
                    <div>
                        <h3 class="earn-chart-title">Revenue by Tour Type</h3>
                        <p class="earn-chart-sub">This month</p>
                    </div>
                </div>
                <div class="earn-donut-wrapper">
                    <svg viewBox="0 0 180 180" class="earn-donut-svg">
                        ${doughnutSegments || '<circle cx="90" cy="90" r="70" fill="#F3F4F6"/><circle cx="90" cy="90" r="45" fill="white"/>'}
                    </svg>
                    <div class="earn-legend">${legendItems}</div>
                </div>
            </div>
        </div>
    `;
}
