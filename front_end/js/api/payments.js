/**
 * payments.js — Razorpay integration helpers for Xploreo frontend.
 *
 * Security model:
 *  - RAZORPAY_KEY_SECRET is NEVER present here. It stays on the NestJS backend.
 *  - keyId (the public key) comes from the server's create-order response.
 *  - Signature verification is done server-side in POST /payments/verify.
 */

import { API_ENDPOINTS } from "./contracts.js";
import { apiPost } from "./http.js";

/**
 * Asks the backend to create a Razorpay order for the given INR amount.
 *
 * @param {number} amountInr - Total in Indian Rupees (e.g. 15000)
 * @param {object} [metadata] - Optional metadata { bookingType: string, bookingId: string, notes: object }
 * @returns {Promise<{ orderId: string, amount: number, currency: string, keyId: string }>}
 */
export function createRazorpayOrder(amountInr, metadata = {}) {
    const payload = typeof metadata === "object" && metadata !== null
        ? { amount: amountInr, ...metadata }
        : { amount: amountInr };
    return apiPost(API_ENDPOINTS.paymentsCreateOrder, payload);
}

/**
 * Sends the Razorpay payment response to the backend for HMAC-SHA256 verification.
 * The backend will throw 400 if the signature is invalid.
 *
 * @param {{ razorpay_order_id: string, razorpay_payment_id: string, razorpay_signature: string }} payload
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export function verifyRazorpayPayment(payload) {
    return apiPost(API_ENDPOINTS.paymentsVerify, payload);
}

/**
 * Opens the Razorpay Checkout modal.
 *
 * Requires the Razorpay checkout script to be loaded on the page:
 *   <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
 *
 * @param {{ orderId: string, amount: number, currency: string, keyId: string }} orderData
 *   - Comes from createRazorpayOrder(). keyId is the public Razorpay key.
 * @param {string} description - Short description shown in the checkout modal.
 * @param {(paymentResponse: object) => void} onSuccess
 *   - Called with the raw Razorpay response when payment succeeds.
 *     Caller MUST call verifyRazorpayPayment() before trusting success.
 * @param {(error: string) => void} onFailure
 *   - Called with an error message string on failure or cancellation.
 */
export function openRazorpayCheckout(orderData, description, onSuccess, onFailure) {
    if (typeof window.Razorpay === "undefined") {
        onFailure("Razorpay checkout could not be loaded. Please check your internet connection and try again.");
        return;
    }

    const options = {
        key: orderData.keyId,           // Public key from server — safe to use here
        amount: orderData.amount,       // In paise (already converted by backend)
        currency: orderData.currency,
        name: "Xploreo",
        description: description || "Holiday Package Booking",
        image: "",                      // Optional: add logo URL here
        order_id: orderData.orderId,
        theme: {
            color: "#6C63FF",
        },
        handler: function (response) {
            // response contains: razorpay_order_id, razorpay_payment_id, razorpay_signature
            // Do NOT trust this alone — always verify server-side.
            onSuccess(response);
        },
        modal: {
            ondismiss: function () {
                onFailure("Payment was cancelled. You can try again.");
            },
            escape: true,
            animation: true,
        },
    };

    const rzp = new window.Razorpay(options);

    rzp.on("payment.failed", function (response) {
        const reason =
            response?.error?.description ||
            response?.error?.reason ||
            "Payment failed. Please try again with a different payment method.";
        onFailure(reason);
    });

    rzp.open();
}
