import { DEFAULT_CHECKOUT_STEPS } from './checkoutConstants.js';
import './checkout.css';

/**
 * CheckoutStepper
 * Accessible step progress indicator.
 * Supports keyboard navigation and step status indicators.
 */
export default function CheckoutStepper({
  steps = DEFAULT_CHECKOUT_STEPS,
  currentStepIndex = 0,
  onStepClick,
}) {
  return (
    <nav className="trav-stepper" aria-label="Checkout Progress">
      {steps.map((step, index) => {
        const isCompleted = index < currentStepIndex;
        const isActive = index === currentStepIndex;
        const isFuture = index > currentStepIndex;

        // By default, only allow jumping back to completed steps
        const isClickable = !isFuture && !!onStepClick;

        return (
          <div key={step.id} style={{ display: 'contents' }}>
            <button
              type="button"
              className={`trav-step-item ${isCompleted ? 'is-completed' : ''} ${isActive ? 'is-active' : ''}`}
              disabled={!isClickable || isActive}
              onClick={() => isClickable && !isActive && onStepClick(index, step)}
              aria-current={isActive ? 'step' : undefined}
            >
              <span className="trav-step-badge" aria-hidden="true">
                {isCompleted ? '✓' : index + 1}
              </span>
              <div className="trav-step-text-wrap">
                <span className="trav-step-index">Step {index + 1}</span>
                <span className="trav-step-label">{step.label}</span>
              </div>
            </button>

            {index < steps.length - 1 && (
              <div
                className={`trav-step-divider ${isCompleted ? 'is-completed' : ''}`}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
