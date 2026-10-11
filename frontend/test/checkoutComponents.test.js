import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  renderSummaryCard,
  renderTravellerForm,
  renderPaymentSelector,
  renderStepper,
  DEFAULT_PAYMENT_METHODS,
  DEFAULT_CHECKOUT_STEPS,
} from './dist-test/checkoutTestBundleEntry.js';

describe('Checkout Presentation Components SSR/Rendering & Accessibility tests', () => {
  describe('BookingSummaryCard', () => {
    it('renders booking title, location, type, and dates accurately', () => {
      const booking = {
        title: 'Old Delhi Heritage Food Trail',
        type: 'experience',
        location: 'Chandni Chowk, Old Delhi',
        date: '2026-10-25T09:00:00Z',
        time: '09:00 AM',
        guestCount: 2,
      };

      const pricing = {
        basePrice: 1999,
        subtotal: 3998,
        taxesAndFees: 360,
        total: 4358,
      };

      const html = renderSummaryCard({ booking, pricing });

      assert.ok(html.includes('Old Delhi Heritage Food Trail'), 'Must display title');
      assert.ok(html.includes('Chandni Chowk, Old Delhi'), 'Must display location');
      assert.ok(html.includes('trav-summary-card'), 'Must have root class .trav-summary-card');
      assert.ok(html.includes('2 Guests'), 'Must format guest count');
      assert.ok(html.includes('Estimated Total'), 'Must label estimated total');
      assert.ok(
        html.includes('Final authoritative amount will be verified'),
        'Must display non-authoritative disclaimer'
      );
    });

    it('renders placeholder when optional fields are omitted', () => {
      const html = renderSummaryCard({
        booking: { title: 'Goa Kayaking' },
        pricing: { basePrice: 800 },
      });

      assert.ok(html.includes('Goa Kayaking'));
      assert.ok(html.includes('Location not specified'));
      assert.ok(html.includes('Date not specified'));
    });
  });

  describe('TravellerDetailsForm', () => {
    it('renders with accessible labels, required attributes, and submit button', () => {
      const html = renderTravellerForm({
        initialValues: {
          firstName: 'Aarav',
          lastName: 'Patel',
          email: 'aarav@example.com',
          phone: '9876543210',
          specialRequests: 'Vegetarian meals preferred',
        },
        submitLabel: 'Continue to Payment',
      });

      assert.ok(html.includes('id="trav-first-name"'), 'Must render first name field with ID');
      assert.ok(html.includes('for="trav-first-name"'), 'Must associate label with first name');
      assert.ok(html.includes('id="trav-last-name"'), 'Must render last name field with ID');
      assert.ok(html.includes('for="trav-last-name"'), 'Must associate label with last name');
      assert.ok(html.includes('id="trav-email"'), 'Must render email field with ID');
      assert.ok(html.includes('id="trav-phone"'), 'Must render phone field with ID');
      assert.ok(html.includes('value="Aarav"'), 'Must prefill first name');
      assert.ok(html.includes('value="Patel"'), 'Must prefill last name');
      assert.ok(html.includes('value="aarav@example.com"'), 'Must prefill email');
      assert.ok(html.includes('Vegetarian meals preferred'), 'Must render special requests');
      assert.ok(html.includes('type="submit"'), 'Must include submit button');
      assert.ok(html.includes('Continue to Payment'), 'Must display custom submit label');
    });

    it('renders in disabled/processing state when isSubmitting is true', () => {
      const html = renderTravellerForm({
        isSubmitting: true,
      });

      assert.ok(html.includes('disabled=""'), 'Must disable inputs when submitting');
      assert.ok(html.includes('Processing...'), 'Must render processing label');
    });
  });

  describe('PaymentMethodSelector', () => {
    it('renders accessible radiogroup with configured payment choices and labels', () => {
      const html = renderPaymentSelector({
        selectedMethod: 'upi',
        methods: DEFAULT_PAYMENT_METHODS,
      });

      assert.ok(html.includes('role="radiogroup"'), 'Must provide radiogroup ARIA role');
      assert.ok(html.includes('aria-label="Payment method choices"'), 'Must have accessible group label');
      assert.ok(html.includes('type="radio"'), 'Must render radio inputs');
      assert.ok(html.includes('checked=""'), 'Must have checked attribute on selected radio');
      assert.ok(html.includes('value="upi"'), 'Must contain upi value');
      assert.ok(html.includes('Recommended'), 'Must render recommended badge when present');
      assert.ok(html.includes('256-bit SSL encrypted'), 'Must render security assurance note');
    });

    it('renders with all inputs disabled when disabled prop is true', () => {
      const html = renderPaymentSelector({
        selectedMethod: 'card',
        disabled: true,
        methods: DEFAULT_PAYMENT_METHODS,
      });

      assert.ok(html.includes('value="card"'));
      assert.ok(html.includes('checked=""'));
      assert.ok(html.includes('disabled=""'));
    });
  });

  describe('CheckoutStepper', () => {
    it('renders step labels with accessible step progress and current indicator', () => {
      const html = renderStepper({
        steps: DEFAULT_CHECKOUT_STEPS,
        currentStepIndex: 1, // 'details' step
      });

      assert.ok(html.includes('aria-label="Checkout Progress"'), 'Must provide accessible nav label');
      assert.ok(html.includes('aria-current="step"'), 'Must mark active step with aria-current="step"');
      assert.ok(html.includes('Step 2'), 'Must label Step 2');
      assert.ok(html.includes('Traveller Details'), 'Must display step name');
      assert.ok(html.includes('is-completed'), 'Must mark prior step as completed');
      assert.ok(html.includes('✓'), 'Must render checkmark on completed steps');
    });

    it('marks future steps as disabled to enforce sequential checkout', () => {
      const html = renderStepper({
        steps: DEFAULT_CHECKOUT_STEPS,
        currentStepIndex: 0,
      });

      // Steps 2, 3, 4 should be disabled
      assert.ok(html.includes('disabled=""'));
    });
  });
});
