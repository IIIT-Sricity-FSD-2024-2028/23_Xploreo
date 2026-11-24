import { formatCurrency } from "../utils/formatCurrency.js";
import { monthlyEarnings } from "../utils/monthlyEarnings.js";
import { earningsByMonth } from "../utils/earningsByMonth.js";

export function renderOverviewStats(myTrips, completedTrips, currentMonth, currentYear) {
    const thisMonthEarnings = monthlyEarnings(myTrips, currentMonth, currentYear);
    const { total: totalEarnings6Mo } = earningsByMonth(myTrips);
    
    const toursThisMonth = completedTrips.filter(t => {
        const d = new Date(t.dateTime.split(" | ")[0]);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;
    
    const avgPerTour = completedTrips.length > 0
        ? Math.round(completedTrips.reduce((s, t) => s + (t.amount || 0), 0) / completedTrips.length)
        : 0;
        
    const lastMonthEarnings = monthlyEarnings(myTrips, currentMonth === 0 ? 11 : currentMonth - 1, currentMonth === 0 ? currentYear - 1 : currentYear);
    const growthPct = lastMonthEarnings > 0
        ? Math.round(((thisMonthEarnings - lastMonthEarnings) / lastMonthEarnings) * 100)
        : (thisMonthEarnings > 0 ? 100 : 0);
    const totalGrowth = 8; // Assuming 8% as placeholder as in original

    return `
        <!-- Stats Row -->
        <div class="earn-stats-row">
            <div class="earn-stat-card earn-stat-blue">
                <div class="earn-stat-icon" style="background:#EFF6FF; color:#3B82F6;">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z"/></svg>
                </div>
                ${growthPct !== 0 ? `<span class="earn-stat-badge earn-badge-green">+${growthPct}%</span>` : ''}
                <h2 class="earn-stat-value">${formatCurrency(thisMonthEarnings)}</h2>
                <span class="earn-stat-label">This Month</span>
            </div>
            <div class="earn-stat-card earn-stat-green">
                <div class="earn-stat-icon" style="background:#ECFDF5; color:#10B981;">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path d="M2 10l6 6L18 4"/></svg>
                </div>
                <span class="earn-stat-badge earn-badge-green">+${totalGrowth}%</span>
                <h2 class="earn-stat-value">${formatCurrency(totalEarnings6Mo)}</h2>
                <span class="earn-stat-label">Total Earnings (6 mo)</span>
            </div>
            <div class="earn-stat-card earn-stat-orange">
                <div class="earn-stat-icon" style="background:#FFFBEB; color:#F59E0B;">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1z"/></svg>
                </div>
                <h2 class="earn-stat-value">${toursThisMonth}</h2>
                <span class="earn-stat-label">Tours This Month</span>
            </div>
            <div class="earn-stat-card earn-stat-purple">
                <div class="earn-stat-icon" style="background:#F5F3FF; color:#8B5CF6;">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 8.586V5z"/></svg>
                </div>
                <h2 class="earn-stat-value">${formatCurrency(avgPerTour)}</h2>
                <span class="earn-stat-label">Avg. per Tour</span>
            </div>
        </div>
    `;
}
