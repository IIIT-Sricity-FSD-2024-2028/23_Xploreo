import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { getBooking, cancelBooking, getHotel } from '@/services/hotels.api.js';
import CancellationModal from '@/components/checkout/CancellationModal.jsx';
import TravellerHeader from './TravellerHeader.jsx';
import './travellerDetail.css';
import '@/pages/Traveller/travellerBookings.css';

export default function BookingConfirmationPage() {
  const { id } = useParams();
  const location = useLocation();

  const [booking, setBooking] = useState(location.state?.booking || null);
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(!location.state?.booking);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);


  const loadBookingData = async () => {
    if (!id || id.trim() === '') {
      setError({ status: 400, message: 'Invalid booking reference ID provided.' });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const bookingData = await getBooking(id);
      setBooking(bookingData);

      if (bookingData?.hotelId) {
        try {
          const hotelData = await getHotel(bookingData.hotelId);
          setHotel(hotelData);
        } catch {
          // If hotel fails to load, booking is still displayed
        }
      }
    } catch (err) {
      const status = err?.status || err?.response?.status || 500;
      const message = err?.message || 'Failed to load booking details.';
      setError({ status, message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!booking) {
      loadBookingData();
    } else if (booking.hotelId && !hotel) {
      getHotel(booking.hotelId)
        .then((data) => setHotel(data))
        .catch(() => {});
    }
  }, [id]);

  const handleCopyCode = () => {
    const code = booking?.id || id;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCancelBooking = () => {
    setShowCancelModal(true);
  };

  const handleCancelSuccess = (result) => {
    if (result?.booking) {
      setBooking(result.booking);
    } else {
      setBooking((prev) => ({
        ...prev,
        status: 'CANCELLED',
        refundStatus: result?.refundStatus,
        refundAmount: result?.refundAmount,
        refundReference: result?.refundReference,
        cancellationPolicyNote: result?.cancellationPolicyNote,
      }));
    }
    setCancelSuccess(true);
  };


  const handlePrint = () => {
    window.print();
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="trav-page-container">
        <TravellerHeader title="Reservation Details" />
        <main className="trav-main">
          <div className="trav-loading-card">
            <div className="trav-spinner" />
            <h2 className="trav-loading-title">Loading Reservation Summary...</h2>
            <p className="trav-loading-subtitle">Verifying booking voucher and guest check-in pass.</p>
          </div>
        </main>
      </div>
    );
  }

  // 4. 400 Validation State
  if (error && error.status === 400) {
    return (
      <div className="trav-page-container">
        <TravellerHeader title="Invalid Booking Reference" />
        <main className="trav-main">
          <div className="trav-validation-alert" role="alert">
            <span>⚠️</span>
            <div>
              <strong>Validation Error (400):</strong> {error.message}
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <Link to="/hotels" className="trav-btn trav-btn-primary">
              Return to Hotels Search
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // 5. 403 Forbidden State
  if (error && error.status === 403) {
    return (
      <div className="trav-page-container">
        <TravellerHeader title="Access Denied" />
        <main className="trav-main">
          <div className="trav-forbidden-card">
            <div className="trav-forbidden-code">403</div>
            <h2 className="trav-forbidden-title">Booking Access Restricted</h2>
            <p className="trav-forbidden-desc">
              {error.message || 'You are not authorized to view this booking receipt. Bookings are only visible to the guest who created them.'}
            </p>
            <Link to="/hotels" className="trav-btn trav-btn-primary">
              Browse Available Hotels
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // 3. General Error State
  if (error) {
    return (
      <div className="trav-page-container">
        <TravellerHeader title="Error" />
        <main className="trav-main">
          <div className="trav-error-state">
            <span className="trav-error-icon">⚠️</span>
            <h2 className="trav-error-title">Unable to Retrieve Booking</h2>
            <p className="trav-error-desc">{error.message}</p>
            <button type="button" onClick={loadBookingData} className="trav-btn trav-btn-primary">
              Try Again
            </button>
          </div>
        </main>
      </div>
    );
  }

  // 2. Empty State
  if (!booking) {
    return (
      <div className="trav-page-container">
        <TravellerHeader title="Booking Not Found" />
        <main className="trav-main">
          <div className="trav-empty-state">
            <span className="trav-empty-icon">🧾</span>
            <h2 className="trav-empty-title">Reservation Not Found</h2>
            <p className="trav-empty-desc">
              We could not find a booking matching reference #{id}. It may have expired or been deleted.
            </p>
            <Link to="/hotels" className="trav-btn trav-btn-primary">
              Browse Hotels
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const isCancelled = booking.status === 'CANCELLED';
  const isConfirmed = booking.status === 'CONFIRMED' || booking.status === 'confirmed';
  const isCheckedIn = booking.status === 'CHECKED_IN';
  const isCompleted = booking.status === 'COMPLETED' || booking.status === 'CHECKED_OUT';

  const calculateNights = () => {
    if (!booking.checkIn || !booking.checkOut) return 1;
    const diff = (new Date(booking.checkOut) - new Date(booking.checkIn)) / 86400000;
    return diff > 0 ? Math.ceil(diff) : 1;
  };

  const nights = calculateNights();

  return (
    <div className="trav-page-container">
      <TravellerHeader title={`Booking #${booking.id || id}`} backTo="/hotels" backLabel="Hotels" />

      <main className="trav-main">
        <div className="trav-receipt-container">
          {/* Receipt Hero Header */}
          <div
            className="trav-receipt-hero"
            style={isCancelled ? { background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' } : {}}
          >
            <div className="trav-receipt-check">
              {isCancelled ? '✕' : '✓'}
            </div>
            <h1 style={{ margin: '0 0 8px', fontSize: '2rem', fontWeight: 800 }}>
              {isCancelled ? 'Booking Cancelled' : 'Reservation Confirmed!'}
            </h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '1.05rem' }}>
              {isCancelled
                ? 'Your reservation has been cancelled as requested.'
                : 'A confirmation voucher has been sent to your registered email.'}
            </p>
          </div>

          {/* Receipt Details Body */}
          <div className="trav-receipt-body">
            {/* Reference Badge & Copy */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--trav-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Booking Reference ID
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <code style={{ fontSize: '1.25rem', fontWeight: 800, background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px' }}>
                    #{booking.id || id}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="trav-btn trav-btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  >
                    {copied ? '✓ Copied' : '📋 Copy'}
                  </button>
                </div>
              </div>

              <span className={`trav-badge ${isCancelled ? 'trav-badge-warning' : 'trav-badge-success'}`} style={{ fontSize: '0.9rem', padding: '6px 14px' }}>
                {booking.status || 'CONFIRMED'}
              </span>
            </div>

            {cancelSuccess && (
              <div className="trav-validation-alert" style={{ background: '#ecfdf5', color: '#065f46', borderColor: '#34d399', marginBottom: '20px' }}>
                <span>✓</span>
                <div>Reservation cancelled successfully.</div>
              </div>
            )}

            {isCancelled && (
              <div className="trav-cancellation-card" style={{ marginBottom: '24px' }}>
                <div className="trav-cancellation-header">
                  <h3 className="trav-cancellation-title">
                    <span>✕</span> Booking Cancelled
                  </h3>
                  {booking.refundStatus && (
                    <span className={`trav-refund-pill is-${booking.refundStatus.toLowerCase()}`}>
                      Refund: {booking.refundStatus} {booking.refundAmount ? `(₹${booking.refundAmount})` : ''}
                    </span>
                  )}
                </div>

                <div className="trav-cancellation-grid">
                  <div className="trav-info-block">
                    <span className="trav-info-label">Cancellation Status</span>
                    <strong style={{ color: '#dc2626' }}>Cancelled</strong>
                  </div>
                  <div className="trav-info-block">
                    <span className="trav-info-label">Refund Reference</span>
                    <code style={{ fontSize: '0.9rem', color: '#0f172a' }}>{booking.refundReference || 'RF-SIM-PENDING'}</code>
                  </div>
                  <div className="trav-info-block">
                    <span className="trav-info-label">Refund Amount</span>
                    <strong style={{ color: '#16a34a', fontSize: '1.1rem' }}>
                      {booking.refundAmount ? `₹${booking.refundAmount}` : (booking.refundStatus === 'NOT_ELIGIBLE' ? '₹0 (Ineligible)' : '₹0')}
                    </strong>
                  </div>
                </div>

                {booking.cancellationPolicyNote && (
                  <div className="trav-receipt-note" style={{ marginTop: '0.5rem' }}>
                    <strong>Policy Applied:</strong> {booking.cancellationPolicyNote}
                  </div>
                )}

                <div className="trav-simulation-banner">
                  <span>ℹ️</span>
                  <div>
                    <strong>Honest Simulation:</strong> Refund processing is simulated in this development environment. No actual banking transaction has been executed.
                  </div>
                </div>
              </div>
            )}


            {/* Hotel & Room Summary */}
            <div style={{ background: '#f8fafc', border: '1px solid var(--trav-border)', borderRadius: 'var(--trav-radius-md)', padding: '20px', marginBottom: '24px' }}>
              <h2 style={{ margin: '0 0 6px', fontSize: '1.35rem', fontWeight: 800 }}>
                {hotel?.name || `Hotel #${booking.hotelId}`}
              </h2>
              <div style={{ color: 'var(--trav-text-muted)', fontSize: '0.95rem', marginBottom: '12px' }}>
                📍 {hotel?.location || hotel?.city || 'India'}
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span className="trav-chip">🛏️ {booking.roomType || 'Standard Room'}</span>
                <span className="trav-chip">👥 {booking.guests || 2} {booking.guests === 1 ? 'Guest' : 'Guests'}</span>
                <span className="trav-chip">🚪 {booking.rooms || 1} {booking.rooms === 1 ? 'Room' : 'Rooms'}</span>
                <span className="trav-chip">🌙 {nights} {nights === 1 ? 'Night' : 'Nights'}</span>
              </div>
            </div>

            {/* Dates Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div style={{ border: '1px solid var(--trav-border)', borderRadius: 'var(--trav-radius-md)', padding: '16px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--trav-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Check-In
                </span>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '4px' }}>
                  {booking.checkIn}
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--trav-text-light)' }}>From 12:00 PM</span>
              </div>

              <div style={{ border: '1px solid var(--trav-border)', borderRadius: 'var(--trav-radius-md)', padding: '16px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--trav-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Check-Out
                </span>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '4px' }}>
                  {booking.checkOut}
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--trav-text-light)' }}>Until 11:00 AM</span>
              </div>
            </div>

            {/* Guest Details */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 12px' }}>
                Guest & Contact Information
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--trav-text-muted)', display: 'block' }}>Primary Guest</span>
                  <strong style={{ fontSize: '0.95rem' }}>{booking.guestName}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--trav-text-muted)', display: 'block' }}>Email</span>
                  <strong style={{ fontSize: '0.95rem' }}>{booking.email}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--trav-text-muted)', display: 'block' }}>Phone</span>
                  <strong style={{ fontSize: '0.95rem' }}>{booking.phone}</strong>
                </div>
              </div>

              {booking.notes && (
                <div style={{ marginTop: '14px', background: '#f8fafc', padding: '12px', borderRadius: '8px', fontSize: '0.9rem' }}>
                  <span style={{ fontWeight: 600 }}>Special Requests:</span> {booking.notes}
                </div>
              )}
            </div>

            {/* Total Payment Breakdown */}
            <div className="trav-price-breakdown" style={{ marginBottom: '28px' }}>
              <div className="trav-breakdown-row">
                <span>Room Charges ({nights} {nights === 1 ? 'night' : 'nights'})</span>
                <span>₹{(booking.totalAmount ? Math.round(booking.totalAmount * 0.88) : 4000).toLocaleString('en-IN')}</span>
              </div>
              <div className="trav-breakdown-row">
                <span>Taxes & Service Fees (12%)</span>
                <span>₹{(booking.totalAmount ? Math.round(booking.totalAmount * 0.12) : 480).toLocaleString('en-IN')}</span>
              </div>
              <div className="trav-breakdown-total">
                <span>Total Amount Paid</span>
                <span style={{ color: 'var(--trav-primary)', fontSize: '1.35rem' }}>
                  ₹{(booking.totalAmount || 4480).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Actions Bar */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={handlePrint}
                className="trav-btn trav-btn-primary"
              >
                🖨️ Print Voucher
              </button>

              {booking.hotelId && (
                <Link
                  to={`/reviews/new?targetType=hotel&targetId=${booking.hotelId}&targetName=${encodeURIComponent(hotel?.name || '')}`}
                  className="trav-btn trav-btn-secondary"
                >
                  ✍️ Write Review
                </Link>
              )}

              {!isCancelled && !isCompleted && (
                <button
                  type="button"
                  onClick={handleCancelBooking}
                  className="trav-btn trav-btn-outline"
                  style={{ color: 'var(--trav-error)', borderColor: 'var(--trav-error)' }}
                >
                  Cancel Booking
                </button>
              )}

              <Link to="/hotels" className="trav-btn trav-btn-secondary">
                Browse More Hotels
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Reusable Cancellation Modal */}
      {showCancelModal && (
        <CancellationModal
          isOpen={showCancelModal}
          booking={booking}
          bookingType="hotel"
          onClose={() => setShowCancelModal(false)}
          onSuccess={handleCancelSuccess}
        />
      )}
    </div>
  );
}

