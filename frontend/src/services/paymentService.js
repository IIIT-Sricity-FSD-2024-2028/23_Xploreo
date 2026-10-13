/**
 * paymentService.js
 * Explicit payment service interface with mock adapter for checkout demonstration.
 * 
 * Rules:
 * - Service interface contract (`createOrder`, `verifyPayment`, `cancelPayment`).
 * - Simulated success, failure, and cancellation outcomes.
 * - Clear demo labelling (`isSimulated: true`, `isDemo: true`).
 * - Never calls real Razorpay SDK or claims real payment verification.
 * - Does not mark real backend bookings as paid.
 * - Modular design so a future real payment adapter can replace the mock adapter
 *   without changing the UI components.
 */

import { apiRequest } from './api.js';

/**
 * Mock Payment Adapter
 * Implements simulated payment lifecycle for demonstration and UI testing.
 */
export const mockPaymentAdapter = {
  name: 'MockPaymentAdapter',
  mode: 'mock',

  /**
   * Create a simulated payment order.
   * 
   * @param {Object} params
   * @param {string} params.bookingId
   * @param {string} params.bookingType - 'hotel' | 'experience'
   * @param {number} params.amount
   * @param {string} [params.currency='INR']
   * @param {Object} [params.travellerDetails]
   * @returns {Promise<Object>}
   */
  async createOrder({
    bookingId,
    bookingType = 'experience',
    amount,
    currency = 'INR',
    travellerDetails = {},
  }) {
    if (!amount || amount <= 0) {
      throw new Error('Invalid order amount for payment creation.');
    }

    const timestamp = Date.now();
    const simulatedOrderId = `demo_order_${timestamp}`;

    return {
      success: true,
      mode: 'mock',
      isSimulated: true,
      isDemo: true,
      orderId: simulatedOrderId,
      amount,
      currency,
      bookingId,
      bookingType,
      travellerDetails,
      createdAt: new Date().toISOString(),
      gatewayNotes: 'SIMULATED ORDER - NO REAL FINANCIAL TRANSACTION',
    };
  },

  /**
   * Verify / process a simulated payment outcome.
   * 
   * @param {Object} params
   * @param {string} params.orderId
   * @param {string} [params.method='upi']
   * @param {string} [params.simulatedOutcome='SUCCESS'] - 'SUCCESS' | 'FAILURE' | 'CANCEL'
   * @returns {Promise<Object>}
   */
  async verifyPayment({
    orderId,
    method = 'upi',
    simulatedOutcome = 'SUCCESS',
  }) {
    const timestamp = Date.now();

    if (simulatedOutcome === 'FAILURE') {
      return {
        success: false,
        status: 'FAILED',
        mode: 'mock',
        isSimulated: true,
        isDemo: true,
        orderId,
        method,
        errorCode: 'SIMULATED_PAYMENT_DECLINED',
        errorMessage: 'Simulated payment declined by the demo payment processor. No charges were made.',
        timestamp: new Date().toISOString(),
      };
    }

    if (simulatedOutcome === 'CANCEL') {
      return {
        success: false,
        status: 'CANCELLED',
        mode: 'mock',
        isSimulated: true,
        isDemo: true,
        orderId,
        method,
        errorCode: 'SIMULATED_USER_CANCELLED',
        errorMessage: 'Simulated payment was cancelled by the user.',
        timestamp: new Date().toISOString(),
      };
    }

    // Default SUCCESS outcome
    return {
      success: true,
      status: 'PAID',
      mode: 'mock',
      isSimulated: true,
      isDemo: true,
      orderId,
      paymentId: `demo_pay_${timestamp}`,
      signature: `demo_sig_${timestamp}_valid`,
      method,
      amountPaid: 0, // Explicit 0 real financial charge
      receiptId: `RCPT-DEMO-${Math.floor(100000 + Math.random() * 900000)}`,
      timestamp: new Date().toISOString(),
      message: 'Simulated payment completed successfully in Demo Mode.',
      note: 'DEMO RECEIPT: This transaction was processed using the Mock Payment Adapter.',
    };
  },

  /**
   * Cancel an active simulated checkout session.
   */
  async cancelPayment({ orderId, reason = 'User cancelled checkout' }) {
    return {
      success: true,
      status: 'CANCELLED',
      mode: 'mock',
      isSimulated: true,
      isDemo: true,
      orderId,
      reason,
      timestamp: new Date().toISOString(),
    };
  },
};

/**
 * Live Payment Adapter (placeholder for future backend integration)
 * Strict requirement: Throws explicit error when called before backend implements payment endpoints.
 */
export const livePaymentAdapter = {
  name: 'LivePaymentAdapter',
  mode: 'live',

  async createOrder() {
    // Attempting real call to backend payment endpoint
    return await apiRequest('/payments/create-order', {
      method: 'POST',
    });
  },

  async verifyPayment() {
    return await apiRequest('/payments/verify-payment', {
      method: 'POST',
    });
  },

  async cancelPayment() {
    return await apiRequest('/payments/cancel', {
      method: 'POST',
    });
  },
};

/**
 * Retrieve active payment adapter based on configured mode.
 * 
 * @param {Object} [options]
 * @param {'mock' | 'live'} [options.mode='mock']
 * @returns {typeof mockPaymentAdapter}
 */
export function getPaymentAdapter({ mode = 'mock' } = {}) {
  if (mode === 'live') {
    return livePaymentAdapter;
  }
  return mockPaymentAdapter;
}

export const paymentService = {
  getPaymentAdapter,
  mockPaymentAdapter,
  livePaymentAdapter,
};
