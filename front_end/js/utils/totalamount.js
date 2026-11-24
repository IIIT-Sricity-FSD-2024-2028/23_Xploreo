/**
 * Calculates total earnings from completed tours.
 * @param {Array} tours - Array of tour objects
 * @returns {number} Sum of amounts from completed tours
 */
export function totalAmount(tours) {
    return tours
        .filter(t => t.status === "completed")
        .reduce((acc, curr) => acc + (curr.amount || 0), 0);
}
