/**
 * checkoutUtils.js
 * Pure utility functions for traveller checkout formatting, validation, and display calculation.
 * 
 * Rules:
 * - Does not dictate authoritative pricing (displays input prices passed by caller).
 * - RFC 5322 compliant email regex check.
 * - Phone number validation for common global/Indian formats.
 */

/**
 * Format a numeric amount to Indian Rupee (INR) currency string or specified currency.
 * @param {number|string} amount
 * @param {string} [currency='INR']
 * @returns {string} Formatted currency string (e.g., "₹4,999")
 */
export function formatCurrency(amount, currency = 'INR') {
  const numeric = typeof amount === 'number' ? amount : parseFloat(amount);
  if (isNaN(numeric)) {
    return '₹0';
  }

  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 2,
      minimumFractionDigits: Number.isInteger(numeric) ? 0 : 2,
    }).format(numeric);
  } catch {
    return `₹${numeric.toLocaleString('en-IN')}`;
  }
}

/**
 * Validate standard email format.
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  // Standard robust email pattern
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(trimmed);
}

/**
 * Validate phone number format (supports 10-digit, +91, with or without spaces/hyphens).
 * @param {string} phone
 * @returns {boolean}
 */
export function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.replace(/[\s\-()]/g, '');
  // Accepts 10 digits or 10-14 digits with optional leading '+'
  const phoneRegex = /^(\+?\d{1,4})?\d{10}$/;
  return phoneRegex.test(cleaned);
}

/**
 * Validate Traveller details form data.
 * @param {Object} formData
 * @param {string} formData.firstName
 * @param {string} formData.lastName
 * @param {string} formData.email
 * @param {string} formData.phone
 * @returns {Object} { isValid: boolean, errors: Record<string, string> }
 */
export function validateTravellerForm(formData = {}) {
  const errors = {};

  if (!formData.firstName || !formData.firstName.trim()) {
    errors.firstName = 'First name is required';
  } else if (formData.firstName.trim().length < 2) {
    errors.firstName = 'First name must be at least 2 characters';
  }

  if (!formData.lastName || !formData.lastName.trim()) {
    errors.lastName = 'Last name is required';
  } else if (formData.lastName.trim().length < 1) {
    errors.lastName = 'Last name must be at least 1 character';
  }

  if (!formData.email || !formData.email.trim()) {
    errors.email = 'Email address is required';
  } else if (!isValidEmail(formData.email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!formData.phone || !formData.phone.trim()) {
    errors.phone = 'Phone number is required';
  } else if (!isValidPhone(formData.phone)) {
    errors.phone = 'Please enter a valid 10-digit phone number';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Format date display string safely.
 * @param {string|Date} dateInput
 * @returns {string} Formatted date (e.g. "Sat, 24 Oct 2026")
 */
export function formatDate(dateInput) {
  if (!dateInput) return 'Date not specified';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return String(dateInput);

  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Helper to compute display-only item totals from caller-supplied unit breakdown.
 * Note: Purely for presentational summary preview in the client UI.
 * Authoritative pricing is always verified and returned by backend upon order creation.
 * @param {Object} pricing
 * @returns {Object}
 */
export function calculateDisplayPricing(pricing = {}) {
  const basePrice = Number(pricing.basePrice) || 0;
  const guestCount = Number(pricing.guestCount) || 1;
  const subtotal = Number(pricing.subtotal ?? (basePrice * guestCount));
  const taxesAndFees = Number(pricing.taxesAndFees ?? 0);
  const discount = Number(pricing.discount ?? 0);
  const total = Number(pricing.total ?? Math.max(0, subtotal + taxesAndFees - discount));

  return {
    basePrice,
    guestCount,
    subtotal,
    taxesAndFees,
    discount,
    total,
  };
}
