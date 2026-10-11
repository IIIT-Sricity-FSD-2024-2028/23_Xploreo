import { DEFAULT_PAYMENT_METHODS } from './checkoutConstants.js';
import './checkout.css';

/**
 * PaymentMethodSelector
 * Accessible radio-group style selector for checkout payment options.
 * Presentation-only; actual gateway invocation is deferred to subsequent stages.
 */
export default function PaymentMethodSelector({
  selectedMethod = 'upi',
  onSelectMethod,
  disabled = false,
  methods = DEFAULT_PAYMENT_METHODS,
}) {
  return (
    <div className="trav-payment-selector" data-testid="payment-method-selector">
      <h3 className="trav-payment-title">Payment Method</h3>
      <p className="trav-payment-description">
        Choose your preferred payment method. Transactions are encrypted and secure.
      </p>

      <div
        className="trav-methods-grid"
        role="radiogroup"
        aria-label="Payment method choices"
      >
        {methods.map((method) => {
          const isSelected = selectedMethod === method.id;

          return (
            <label
              key={method.id}
              htmlFor={`payment-method-${method.id}`}
              className={`trav-method-option ${isSelected ? 'is-selected' : ''}`}
            >
              <input
                id={`payment-method-${method.id}`}
                type="radio"
                name="paymentMethod"
                value={method.id}
                checked={isSelected}
                disabled={disabled}
                onChange={() => onSelectMethod && onSelectMethod(method.id)}
                className="trav-radio-input"
              />
              <div className="trav-method-content">
                <div className="trav-method-label-row">
                  <span className="trav-method-name">{method.name}</span>
                  {method.badge && (
                    <span className="trav-badge-recommended">{method.badge}</span>
                  )}
                </div>
                <span className="trav-method-subtext">{method.description}</span>
              </div>
            </label>
          );
        })}
      </div>

      <div className="trav-trust-banner">
        <span aria-hidden="true">🔒</span>
        <span>256-bit SSL encrypted. Payment gateway integration will follow via secure provider.</span>
      </div>
    </div>
  );
}
