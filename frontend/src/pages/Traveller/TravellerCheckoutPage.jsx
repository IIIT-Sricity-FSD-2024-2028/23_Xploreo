import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../../components/Navbar/navbar.jsx';
import {
  BookingSummaryCard,
  CheckoutStepper,
  PaymentMethodSelector,
  TravellerDetailsForm,
  DEFAULT_CHECKOUT_STEPS,
  DEFAULT_PAYMENT_METHODS,
} from '../../components/checkout/index.js';
import { formatCurrency, formatDate } from '../../utils/checkoutUtils.js';
import { getPaymentAdapter } from '../../services/paymentService.js';
import './travellerCheckout.css';

const DEFAULT_DEMO_ITEM = {
  id: 'demo-item-taj',
  title: 'Taj Lake Palace - Luxury Heritage Suite',
  type: 'hotel',
  location: 'Lake Pichola, Udaipur, Rajasthan',
  date: '2026-11-10',
  checkIn: '2026-11-10',
  checkOut: '2026-11-14',
  guestCount: 2,
  basePrice: 7500,
  taxesAndFees: 1200,
  subtotal: 30000,
  total: 31200,
  imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
};

/**
 * TravellerCheckoutPage
 * End-to-end checkout interface utilizing the explicit Mock Payment Adapter.
 * 
 * Rules:
 * - Operates in explicit Demo Mode.
 * - Does not charge real credit cards or contact Razorpay.
 * - Supports simulated Success, Failure/Decline, and Cancellation outcomes.
 * - Leaves room for a future backend payment adapter to drop in seamlessly.
 */
export default function TravellerCheckoutPage({
  user,
  initialItem = null,
  adapter = null,
  onComplete = null,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  // Item to checkout passed via state, prop, or fallback demo item
  const selectedItem = location.state?.item || initialItem || DEFAULT_DEMO_ITEM;

  const paymentAdapter = adapter || getPaymentAdapter({ mode: 'mock' });

  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Form details collected from Step 1
  const [travellerDetails, setTravellerDetails] = useState({
    firstName: user?.name ? user.name.split(' ')[0] : 'Anjali',
    lastName: user?.name ? user.name.split(' ').slice(1).join(' ') : 'Sharma',
    email: user?.email || 'anjali@xploreo.com',
    phone: user?.phone || '9123456780',
    specialRequests: 'High floor room preferred, quiet corner.',
  });

  // Payment method & simulation outcome
  const [selectedMethod, setSelectedMethod] = useState('upi');
  const [simulatedOutcome, setSimulatedOutcome] = useState('SUCCESS'); // 'SUCCESS' | 'FAILURE' | 'CANCEL'

  // Processing & Receipt state
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Pricing calculations
  const basePrice = selectedItem.pricePerNight || selectedItem.price || selectedItem.basePrice || 5000;
  const guestCount = selectedItem.guestCount || selectedItem.participants || selectedItem.guests || 2;
  const taxesAndFees = selectedItem.taxesAndFees || 1200;
  const totalAmount = selectedItem.total || selectedItem.totalAmount || (basePrice * guestCount + taxesAndFees);

  const cardBooking = {
    title: selectedItem.title || selectedItem.name || 'Demo Reservation',
    type: selectedItem.type || selectedItem.bookingType || 'hotel',
    location: selectedItem.location || selectedItem.city || selectedItem.destination || 'India',
    date: selectedItem.checkIn ? `${formatDate(selectedItem.checkIn)} → ${formatDate(selectedItem.checkOut)}` : selectedItem.date,
    guestCount: guestCount,
    imageUrl: selectedItem.imageUrl || selectedItem.image || null,
  };

  const cardPricing = {
    basePrice,
    guestCount,
    taxesAndFees,
    subtotal: totalAmount - taxesAndFees,
    total: totalAmount,
  };

  // Step 1: Submit traveller details
  const handleDetailsSubmit = (formData) => {
    setTravellerDetails(formData);
    setCurrentStepIndex(2); // Advance to Payment step
  };

  // Step 2: Trigger payment processing via Payment Adapter
  const handleProcessPayment = async () => {
    setIsProcessing(true);
    setErrorMessage('');

    try {
      // 1. Create simulated order
      const order = await paymentAdapter.createOrder({
        bookingId: selectedItem.id || 'demo-booking-1',
        bookingType: selectedItem.type || 'hotel',
        amount: totalAmount,
        travellerDetails,
      });

      // 2. Process / verify outcome via adapter
      const result = await paymentAdapter.verifyPayment({
        orderId: order.orderId,
        method: selectedMethod,
        simulatedOutcome,
      });

      setPaymentResult(result);
      setCurrentStepIndex(3); // Advance to Confirmation step

      if (!result.success) {
        setErrorMessage(result.errorMessage || 'Simulated payment was not successful.');
      } else if (onComplete) {
        onComplete(result);
      }
    } catch (err) {
      setErrorMessage(err?.message || 'Payment processing failed.');
      setCurrentStepIndex(3);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="trav-checkout-wrapper">
      <Navbar user={user} />

      <main className="trav-checkout-page" data-testid="traveller-checkout-page">
        <header className="trav-checkout-header">
          <p className="trav-checkout-eyebrow">Checkout & Payment Demo</p>
          <h1 className="trav-checkout-title">Complete Your Reservation</h1>
          <p className="trav-checkout-subtitle">
            Experience our streamlined checkout flow powered by the explicit Mock Payment Adapter.
          </p>
        </header>

        {/* Demo Mode Notice Banner */}
        <div className="trav-checkout-demo-banner" role="alert" data-testid="checkout-demo-banner">
          <span aria-hidden="true" style={{ fontSize: '1.25rem' }}>⚠️</span>
          <div>
            <strong>Demo Checkout Mode Active:</strong> This checkout session is connected to the <code>MockPaymentAdapter</code>. Real credit cards are not charged and no real financial transactions take place.
          </div>
        </div>

        {/* Stepper Navigation */}
        <div className="trav-checkout-stepper-wrap">
          <CheckoutStepper
            steps={DEFAULT_CHECKOUT_STEPS}
            currentStepIndex={currentStepIndex}
            onStepClick={(index) => {
              // Only allow jumping back to prior completed steps
              if (index < currentStepIndex && !isProcessing) {
                setCurrentStepIndex(index);
              }
            }}
          />
        </div>

        {/* Step 0: Review Booking */}
        {currentStepIndex === 0 && (
          <section className="trav-checkout-content-card" data-testid="checkout-step-review">
            <h2 className="trav-checkout-section-title">Step 1: Review Itinerary & Pricing</h2>
            <BookingSummaryCard booking={cardBooking} pricing={cardPricing} />

            <div className="trav-checkout-actions">
              <button
                type="button"
                className="trav-btn-secondary"
                onClick={() => navigate('/Traveller/browse')}
              >
                ← Back to Browse
              </button>
              <button
                type="button"
                className="trav-btn-primary"
                onClick={() => setCurrentStepIndex(1)}
                data-testid="btn-proceed-to-details"
              >
                Proceed to Traveller Details →
              </button>
            </div>
          </section>
        )}

        {/* Step 1: Traveller Details Form */}
        {currentStepIndex === 1 && (
          <section className="trav-checkout-content-card" data-testid="checkout-step-details">
            <h2 className="trav-checkout-section-title">Step 2: Traveller Contact Details</h2>
            <TravellerDetailsForm
              initialValues={travellerDetails}
              onSubmit={handleDetailsSubmit}
              submitLabel="Proceed to Payment Selection"
            />
            <div style={{ marginTop: '1rem' }}>
              <button
                type="button"
                className="trav-btn-secondary"
                onClick={() => setCurrentStepIndex(0)}
              >
                ← Back to Itinerary Review
              </button>
            </div>
          </section>
        )}

        {/* Step 2: Payment Method & Simulation Controls */}
        {currentStepIndex === 2 && (
          <section className="trav-checkout-content-card" data-testid="checkout-step-payment">
            <h2 className="trav-checkout-section-title">Step 3: Select Payment Method</h2>

            <PaymentMethodSelector
              selectedMethod={selectedMethod}
              onSelectMethod={setSelectedMethod}
              methods={DEFAULT_PAYMENT_METHODS}
              disabled={isProcessing}
            />

            {/* Simulation Controls for testing outcomes */}
            <div className="trav-simulation-panel" data-testid="simulation-outcome-controls">
              <h3 className="trav-simulation-title">
                🧪 Test Simulation Outcome (Demo Mode Control)
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 0.75rem 0' }}>
                Select how you would like the Mock Payment Adapter to respond when processing:
              </p>
              <div className="trav-simulation-options" role="radiogroup" aria-label="Simulated payment outcome">
                <label className={`trav-simulation-label ${simulatedOutcome === 'SUCCESS' ? 'is-active' : ''}`}>
                  <input
                    type="radio"
                    name="simOutcome"
                    value="SUCCESS"
                    checked={simulatedOutcome === 'SUCCESS'}
                    onChange={() => setSimulatedOutcome('SUCCESS')}
                  />
                  <span>Simulate Success (Approved)</span>
                </label>
                <label className={`trav-simulation-label ${simulatedOutcome === 'FAILURE' ? 'is-active' : ''}`}>
                  <input
                    type="radio"
                    name="simOutcome"
                    value="FAILURE"
                    checked={simulatedOutcome === 'FAILURE'}
                    onChange={() => setSimulatedOutcome('FAILURE')}
                  />
                  <span>Simulate Card Decline / Failure</span>
                </label>
                <label className={`trav-simulation-label ${simulatedOutcome === 'CANCEL' ? 'is-active' : ''}`}>
                  <input
                    type="radio"
                    name="simOutcome"
                    value="CANCEL"
                    checked={simulatedOutcome === 'CANCEL'}
                    onChange={() => setSimulatedOutcome('CANCEL')}
                  />
                  <span>Simulate User Cancellation</span>
                </label>
              </div>
            </div>

            <div className="trav-checkout-actions">
              <button
                type="button"
                className="trav-btn-secondary"
                disabled={isProcessing}
                onClick={() => setCurrentStepIndex(1)}
              >
                ← Back to Details
              </button>
              <button
                type="button"
                className="trav-btn-primary"
                disabled={isProcessing}
                onClick={handleProcessPayment}
                data-testid="btn-process-payment"
              >
                {isProcessing
                  ? 'Processing Demo Payment...'
                  : `Pay Demo Amount (${formatCurrency(totalAmount)})`}
              </button>
            </div>
          </section>
        )}

        {/* Step 3: Confirmation / Outcome */}
        {currentStepIndex === 3 && (
          <section className="trav-checkout-content-card" data-testid="checkout-step-confirmation">
            {paymentResult?.success ? (
              <div className="trav-confirmation-view" data-testid="checkout-outcome-success">
                <div className="trav-confirm-icon-success" aria-hidden="true">✓</div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#15803d', margin: '0 0 0.5rem 0' }}>
                  Demo Payment Successful!
                </h2>
                <p style={{ color: '#475569', fontSize: '1rem', maxWidth: '480px', margin: '0 auto 1.5rem auto' }}>
                  Your simulated reservation has been recorded in Demo Mode. No real financial charges were made.
                </p>

                <div className="trav-receipt-card" data-testid="demo-receipt">
                  <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <span
                      style={{
                        background: '#dcfce7',
                        color: '#166534',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                      }}
                    >
                      DEMO RECEIPT — NO REAL PAYMENT
                    </span>
                  </div>
                  <div className="trav-receipt-row">
                    <span>Receipt Reference:</span>
                    <strong>{paymentResult.receiptId}</strong>
                  </div>
                  <div className="trav-receipt-row">
                    <span>Simulated Order ID:</span>
                    <span>{paymentResult.orderId}</span>
                  </div>
                  <div className="trav-receipt-row">
                    <span>Payment Method:</span>
                    <span style={{ textTransform: 'uppercase' }}>{paymentResult.method}</span>
                  </div>
                  <div className="trav-receipt-row">
                    <span>Lead Traveller:</span>
                    <span>{travellerDetails.firstName} {travellerDetails.lastName}</span>
                  </div>
                  <div className="trav-receipt-row">
                    <span>Reservation:</span>
                    <span>{cardBooking.title}</span>
                  </div>
                  <div className="trav-receipt-row">
                    <span>Simulated Amount:</span>
                    <span style={{ color: '#15803d' }}>{formatCurrency(totalAmount)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    className="trav-btn-secondary"
                    onClick={() => navigate('/Traveller/bookings')}
                  >
                    View in My Bookings
                  </button>
                  <button
                    type="button"
                    className="trav-btn-primary"
                    onClick={() => navigate('/Traveller/dashboard')}
                  >
                    Return to Dashboard
                  </button>
                </div>
              </div>
            ) : paymentResult?.status === 'CANCELLED' ? (
              <div className="trav-confirmation-view" data-testid="checkout-outcome-cancelled">
                <div className="trav-confirm-icon-cancel" aria-hidden="true">⚠️</div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#b45309', margin: '0 0 0.5rem 0' }}>
                  Simulated Payment Cancelled
                </h2>
                <p style={{ color: '#475569', fontSize: '1rem', maxWidth: '480px', margin: '0 auto 1.5rem auto' }}>
                  {paymentResult.errorMessage || 'The payment session was cancelled. No charges occurred.'}
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="trav-btn-secondary"
                    onClick={() => navigate('/Traveller/browse')}
                  >
                    Exit Checkout
                  </button>
                  <button
                    type="button"
                    className="trav-btn-primary"
                    onClick={() => setCurrentStepIndex(2)}
                  >
                    Try Another Payment
                  </button>
                </div>
              </div>
            ) : (
              <div className="trav-confirmation-view" data-testid="checkout-outcome-failed">
                <div className="trav-confirm-icon-error" aria-hidden="true">✕</div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#dc2626', margin: '0 0 0.5rem 0' }}>
                  Simulated Payment Failed
                </h2>
                <p style={{ color: '#475569', fontSize: '1rem', maxWidth: '480px', margin: '0 auto 1.5rem auto' }}>
                  {errorMessage || 'The demo payment was declined by the simulated payment processor.'}
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="trav-btn-secondary"
                    onClick={() => navigate('/Traveller/dashboard')}
                  >
                    Return to Dashboard
                  </button>
                  <button
                    type="button"
                    className="trav-btn-primary"
                    onClick={() => setCurrentStepIndex(2)}
                  >
                    Retry Payment (Change Method/Outcome)
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
