/**
 * Filters an array of items (tours, reviews, etc.) to only those
 * belonging to a specific guide.
 * @param {Array} items - Array of objects with a guideId field
 * @param {string} guideId - The guide's ID to filter by
 * @returns {Array} Filtered items
 */
export function filterByGuide(items, guideId) {
    return items.filter(item =>
        String(item.guideId).trim() === String(guideId).trim()
    );
}
