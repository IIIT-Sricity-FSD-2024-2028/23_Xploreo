import { monthlyEarnings } from "./monthlyEarnings.js";

/**
 * Generates earnings data for the last 12 months, ending at the current month.
 * Returns an array of { label, amount } objects and the grand total.
 *
 * @param {Array} tours - Array of completed tour objects (already filtered by guide)
 * @returns {{ months: Array<{label: string, amount: number}>, total: number }}
 */
export function earningsByMonth(tours) {
    const now = new Date();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const months = [];
    let total = 0;

    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const amount = monthlyEarnings(tours, d.getMonth(), d.getFullYear());
        months.push({
            label: monthNames[d.getMonth()],
            amount
        });
        total += amount;
    }

    return { months, total };
}
