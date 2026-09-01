/**
 * Formats a number as a currency string with commas.
 * @param {number} amount - The numeric amount
 * @param {string} prefix - Currency symbol (default "₹")
 * @returns {string} Formatted string e.g. "₹1,420"
 */
export function formatCurrency(amount, prefix = "₹ ") {
    return `${prefix}${amount.toLocaleString("en-US")}`;
}
