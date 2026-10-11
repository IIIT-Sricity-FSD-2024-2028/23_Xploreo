import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCurrency,
  isValidEmail,
  isValidPhone,
  validateTravellerForm,
  formatDate,
  calculateDisplayPricing,
} from '../src/utils/checkoutUtils.js';

describe('checkoutUtils unit tests', () => {
  describe('formatCurrency', () => {
    it('formats positive integers to Indian Rupee representation', () => {
      const formatted = formatCurrency(4999);
      assert.ok(formatted.includes('4,999') || formatted.includes('4999'));
      assert.ok(formatted.includes('₹'));
    });

    it('formats decimals correctly', () => {
      const formatted = formatCurrency(4999.50);
      assert.ok(formatted.includes('4,999.5') || formatted.includes('4,999.50'));
    });

    it('handles zero and invalid amounts gracefully', () => {
      assert.strictEqual(formatCurrency(0), '₹0');
      assert.strictEqual(formatCurrency('invalid'), '₹0');
      assert.strictEqual(formatCurrency(null), '₹0');
    });
  });

  describe('isValidEmail', () => {
    it('accepts valid email addresses', () => {
      assert.strictEqual(isValidEmail('traveler@example.com'), true);
      assert.strictEqual(isValidEmail('user.name+tag@sub.domain.co'), true);
      assert.strictEqual(isValidEmail('rahul.sharma@xploreo.in'), true);
    });

    it('rejects invalid email formats', () => {
      assert.strictEqual(isValidEmail(''), false);
      assert.strictEqual(isValidEmail('plainaddress'), false);
      assert.strictEqual(isValidEmail('@missingusername.com'), false);
      assert.strictEqual(isValidEmail('username@.com'), false);
      assert.strictEqual(isValidEmail(null), false);
      assert.strictEqual(isValidEmail(undefined), false);
    });
  });

  describe('isValidPhone', () => {
    it('accepts standard 10-digit Indian mobile numbers', () => {
      assert.strictEqual(isValidPhone('9876543210'), true);
      assert.strictEqual(isValidPhone('+919876543210'), true);
      assert.strictEqual(isValidPhone('+91 98765 43210'), true);
      assert.strictEqual(isValidPhone('98765-43210'), true);
    });

    it('rejects incomplete or non-numeric numbers', () => {
      assert.strictEqual(isValidPhone('12345'), false);
      assert.strictEqual(isValidPhone('abcdefghij'), false);
      assert.strictEqual(isValidPhone(''), false);
      assert.strictEqual(isValidPhone(null), false);
    });
  });

  describe('validateTravellerForm', () => {
    it('validates a complete, accurate form payload', () => {
      const validPayload = {
        firstName: 'Rahul',
        lastName: 'Sharma',
        email: 'rahul.sharma@example.com',
        phone: '9876543210',
        specialRequests: 'Window seat if available',
      };

      const result = validateTravellerForm(validPayload);
      assert.strictEqual(result.isValid, true);
      assert.deepStrictEqual(result.errors, {});
    });

    it('returns descriptive errors for empty required fields', () => {
      const emptyPayload = {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
      };

      const result = validateTravellerForm(emptyPayload);
      assert.strictEqual(result.isValid, false);
      assert.strictEqual(result.errors.firstName, 'First name is required');
      assert.strictEqual(result.errors.lastName, 'Last name is required');
      assert.strictEqual(result.errors.email, 'Email address is required');
      assert.strictEqual(result.errors.phone, 'Phone number is required');
    });

    it('returns error when firstName is less than 2 characters', () => {
      const result = validateTravellerForm({
        firstName: 'R',
        lastName: 'Sharma',
        email: 'r@example.com',
        phone: '9876543210',
      });
      assert.strictEqual(result.isValid, false);
      assert.strictEqual(result.errors.firstName, 'First name must be at least 2 characters');
    });

    it('returns error for malformed email or phone', () => {
      const result = validateTravellerForm({
        firstName: 'Rahul',
        lastName: 'Sharma',
        email: 'invalid-email',
        phone: '123',
      });
      assert.strictEqual(result.isValid, false);
      assert.strictEqual(result.errors.email, 'Please enter a valid email address');
      assert.strictEqual(result.errors.phone, 'Please enter a valid 10-digit phone number');
    });
  });

  describe('formatDate', () => {
    it('formats a date string accurately', () => {
      const formatted = formatDate('2026-10-24T10:00:00Z');
      assert.ok(formatted.includes('2026'));
      assert.ok(formatted.includes('Oct'));
    });

    it('returns fallback for null or missing dates', () => {
      assert.strictEqual(formatDate(null), 'Date not specified');
      assert.strictEqual(formatDate(''), 'Date not specified');
    });
  });

  describe('calculateDisplayPricing', () => {
    it('calculates display subtotal and total accurately from input props', () => {
      const input = {
        basePrice: 1500,
        guestCount: 2,
        taxesAndFees: 300,
        discount: 100,
      };

      const result = calculateDisplayPricing(input);
      assert.strictEqual(result.basePrice, 1500);
      assert.strictEqual(result.guestCount, 2);
      assert.strictEqual(result.subtotal, 3000);
      assert.strictEqual(result.taxesAndFees, 300);
      assert.strictEqual(result.discount, 100);
      assert.strictEqual(result.total, 3200);
    });

    it('honors explicitly supplied caller subtotal and total', () => {
      const input = {
        basePrice: 1500,
        guestCount: 2,
        subtotal: 2800, // caller override or coupon
        taxesAndFees: 200,
        total: 3000,
      };

      const result = calculateDisplayPricing(input);
      assert.strictEqual(result.subtotal, 2800);
      assert.strictEqual(result.total, 3000);
    });
  });
});
