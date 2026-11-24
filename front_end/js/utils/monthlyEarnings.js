/**
 * Calculates total earnings for completed tours in a given month/year.
 * @param {Array} tours - Array of tour objects
 * @param {number} month - Month (0-11)
 * @param {number} year - Full year (e.g. 2026)
 * @returns {number} Total earnings for that month
 */
export function monthlyEarnings(tours, month, year) {
    return tours
        .filter(t => {
            if (t.status !== "completed" || !t.dateTime) return false;
            const dateStr = t.dateTime.split(" | ")[0];
            const d = new Date(dateStr);
            return d.getMonth() === month && d.getFullYear() === year;
        })
        .reduce((sum, t) => sum + (t.amount || 0), 0);
}
