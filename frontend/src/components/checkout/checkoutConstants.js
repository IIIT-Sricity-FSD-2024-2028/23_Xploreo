/**
 * checkoutConstants.js
 * Shared constants for checkout stepper and payment method selections.
 * Kept separate from components to comply with react-refresh guidelines.
 */

export const DEFAULT_CHECKOUT_STEPS = [
  { id: 'review', label: 'Review Booking' },
  { id: 'details', label: 'Traveller Details' },
  { id: 'payment', label: 'Payment' },
  { id: 'confirmation', label: 'Confirmation' },
];

export const DEFAULT_PAYMENT_METHODS = [
  {
    id: 'upi',
    name: 'UPI (Google Pay, PhonePe, Paytm)',
    description: 'Instant zero-fee transfer via any UPI application or QR code',
    badge: 'Recommended',
  },
  {
    id: 'card',
    name: 'Credit / Debit Card',
    description: 'Visa, MasterCard, RuPay, American Express',
  },
  {
    id: 'netbanking',
    name: 'Net Banking',
    description: 'All major Indian banks supported',
  },
];
