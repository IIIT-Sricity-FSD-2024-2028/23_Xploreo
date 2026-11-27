import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchBrowseItemDetail, selectBrowseDetail } from '@/features/browseSlice.js';
import { createHotelBooking } from '@/features/bookingsSlice.js';
import {
  calculateNightCount,
  getTodayIsoDate,
  validateHotelRoomBooking,
} from '@/utils/bookingValidationUtils.js';
import TravellerHeader from './TravellerHeader.jsx';
import './travellerDetail.css';

function formatDateInput(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function RoomDetailPage() {
  const { id: hotelId, roomId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const detail = useSelector(selectBrowseDetail);

  const expectedKey = `hotel:${hotelId}`;
  const isCurrent = detail.key === expectedKey;
  const hotel = isCurrent ? detail.item : null;
  const room = isCurrent ? (detail.rooms || []).find((r) => String(r.id) === String(roomId)) || null : null;
  const loading = isCurrent ? detail.loading : Boolean(hotelId && roomId);
  const fetchError = !hotelId || !roomId
    ? { status: 400, message: 'Invalid hotel or room parameter provided.' }
    : (isCurrent ? detail.error : null);

  // Form booking state
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 3);

  const [checkIn, setCheckIn] = useState(formatDateInput(tomorrow));
  const [checkOut, setCheckOut] = useState(formatDateInput(dayAfter));
  const [guests, setGuests] = useState(2);
  const [roomsCount, setRoomsCount] = useState(1);
  const [guestName, setGuestName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  // 400 Validation and Submitting state
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(() => {
    if (!hotelId || !roomId) return;
    dispatch(fetchBrowseItemDetail({ type: 'hotel', id: hotelId }));
  }, [dispatch, hotelId, roomId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Price calculations (aligned with backend 12% taxes)
  const nights = calculateNightCount(checkIn, checkOut);
  const roomPrice = room?.pricePerNight || hotel?.pricePerNight || 3500;
  const subtotal = roomPrice * nights * Number(roomsCount);
  const taxes = Math.round(subtotal * 0.12);
  const grandTotal = subtotal + taxes;
  const todayStr = getTodayIsoDate();
  const roomValidation = validateHotelRoomBooking({
    hotel,
    room,
    roomsCount,
    guestsCount: guests,
    checkIn,
    checkOut,
    today: todayStr,
  });

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    // Validation (capacity, inventory, dates & contact fields)
    const errors = {};
    if (!guestName || guestName.trim().length < 2) {
      errors.guestName = 'Guest name is required (minimum 2 characters).';
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Valid email address is required.';
    }
    if (!phone || phone.trim().length < 8) {
      errors.phone = 'Valid phone number is required.';
    }
    if (!roomValidation.valid) {
      errors.booking = roomValidation.error;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSubmitError(errors.booking || 'Please correct the validation errors in the booking form.');
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      const payload = {
        hotelId,
        guestName: guestName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        checkIn,
        checkOut,
        guests: Number(guests),
        roomType: room.type,
        notes: notes.trim(),
        rooms: Number(roomsCount),
        totalAmount: grandTotal,
      };

      const booking = await dispatch(createHotelBooking(payload)).unwrap();
      // On success, navigate to confirmation page
      navigate(`/bookings/confirmation/${booking.id}`, { state: { booking } });
    } catch (err) {
      const message = err?.message || 'Failed to complete booking. Please review your details.';
      setSubmitError(message);
      if (err?.fieldErrors && typeof err.fieldErrors === 'object') {
        setFieldErrors(err.fieldErrors);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="trav-page-container">
        <TravellerHeader title="Room Details & Booking" />
        <main className="trav-main">
          <div className="trav-loading-card">
            <div className="trav-spinner" />
            <h2 className="trav-loading-title">Loading Room Details...</h2>
            <p className="trav-loading-subtitle">Checking live availability and pricing...</p>
          </div>
        </main>
      </div>
    );
  }

  // 4. 400 Validation State (on route param)
  if (fetchError && fetchError.status === 400) {
    return (
      <div className="trav-page-container">
        <TravellerHeader title="Invalid Parameters" />
        <main className="trav-main">
          <div className="trav-validation-alert" role="alert">
            <span>⚠️</span>
            <div>
              <strong>Validation Error (400):</strong> {fetchError.message}
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <Link to="/hotels" className="trav-btn trav-btn-primary">
              Return to Hotels
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // 5. 403 Forbidden State
  if (fetchError && fetchError.status === 403) {
    return (
      <div className="trav-page-container">
        <TravellerHeader title="Access Denied" />
        <main className="trav-main">
          <div className="trav-forbidden-card">
            <div className="trav-forbidden-code">403</div>
            <h2 className="trav-forbidden-title">Booking Access Restricted</h2>
            <p className="trav-forbidden-desc">
              {fetchError.message || 'You do not have permission to book this room or property.'}
            </p>
            <Link to="/hotels" className="trav-btn trav-btn-primary">
              Explore Available Properties
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // 3. General Error State
  if (fetchError) {
    return (
      <div className="trav-page-container">
        <TravellerHeader title="Error" />
        <main className="trav-main">
          <div className="trav-error-state">
            <span className="trav-error-icon">⚠️</span>
            <h2 className="trav-error-title">Unable to Load Room</h2>
            <p className="trav-error-desc">{fetchError.message}</p>
            <button type="button" onClick={loadData} className="trav-btn trav-btn-primary">
              Try Again
            </button>
          </div>
        </main>
      </div>
    );
  }

  // 2. Empty State
  if (!room || !hotel) {
    return (
      <div className="trav-page-container">
        <TravellerHeader title="Room Not Found" />
        <main className="trav-main">
          <div className="trav-empty-state">
            <span className="trav-empty-icon">🛏️</span>
            <h2 className="trav-empty-title">Room Category Not Found</h2>
            <p className="trav-empty-desc">
              This room category is no longer available or does not exist for this property.
            </p>
            <Link to={`/hotels/${hotelId}`} className="trav-btn trav-btn-primary">
              View Other Rooms in this Hotel
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const roomImage = room.images?.[0] || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80';
  const availableRooms = room.availableRooms ?? room.totalRooms ?? 3;
  const isSoldOut = availableRooms <= 0;

  return (
    <div className="trav-page-container">
      <TravellerHeader
        title={`${room.type} — ${hotel.name}`}
        backTo={`/hotels/${hotelId}`}
        backLabel="Back to Hotel"
      />

      <main className="trav-main">
        {/* Breadcrumb */}
        <nav style={{ marginBottom: '18px', fontSize: '0.9rem', color: 'var(--trav-text-muted)' }}>
          <Link to="/hotels" style={{ color: 'var(--trav-primary)', textDecoration: 'none' }}>Hotels</Link>
          {' > '}
          <Link to={`/hotels/${hotelId}`} style={{ color: 'var(--trav-primary)', textDecoration: 'none' }}>{hotel.name}</Link>
          {' > '}
          <span style={{ color: 'var(--trav-text-dark)', fontWeight: 600 }}>{room.type}</span>
        </nav>

        {submitError && (
          <div className="trav-validation-alert" role="alert">
            <span>⚠️</span>
            <div>
              <strong>Error:</strong> {submitError}
            </div>
          </div>
        )}

        <div className="trav-grid-layout">
          {/* Room Details Column */}
          <div>
            <div className="trav-card" style={{ padding: 0, overflow: 'hidden' }}>
              <img
                src={roomImage}
                alt={room.type}
                style={{ width: '100%', height: '360px', objectFit: 'cover', display: 'block' }}
              />

              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h1 style={{ margin: '0 0 6px', fontSize: '1.85rem', fontWeight: 800 }}>
                      {room.type}
                    </h1>
                    <span style={{ fontSize: '1rem', color: 'var(--trav-text-muted)' }}>
                      at {hotel.name} • {hotel.location || hotel.city}
                    </span>
                  </div>

                  <span className={`trav-badge ${isSoldOut ? 'trav-badge-warning' : 'trav-badge-success'}`}>
                    {isSoldOut ? 'Sold Out' : `${availableRooms} Available`}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
                  <span className="trav-chip">👥 Max {room.maxOccupancy || 2} Guests</span>
                  <span className="trav-chip">🛏️ Premium King/Twin Bed</span>
                  <span className="trav-chip">🚿 Private Bathroom</span>
                  {(room.amenities || []).map((amenity, idx) => (
                    <span key={idx} className="trav-chip">
                      ✓ {amenity}
                    </span>
                  ))}
                </div>

                <div style={{ marginTop: '20px', borderTop: '1px solid var(--trav-border)', paddingTop: '16px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 8px' }}>Room Description</h3>
                  <p className="trav-card-desc">
                    {room.description ||
                      'Relax in spacious, tastefully designed quarters featuring panoramic views, plush luxury bedding, high-speed connectivity, and curated room service amenities.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Traveller Details Form */}
            <section className="trav-card">
              <h2 className="trav-card-title">Guest Contact Information</h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--trav-text-muted)', marginBottom: '18px' }}>
                Confirmation and check-in instructions will be sent to these contact details.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="trav-form-group">
                  <label className="trav-form-label" htmlFor="trav-guest-name">Primary Guest Full Name *</label>
                  <input
                    id="trav-guest-name"
                    type="text"
                    className={`trav-input ${fieldErrors.guestName ? 'has-error' : ''}`}
                    placeholder="e.g. Anjali Sharma"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                  />
                  {fieldErrors.guestName && (
                    <span className="trav-field-error">{fieldErrors.guestName}</span>
                  )}
                </div>

                <div className="trav-form-group">
                  <label className="trav-form-label" htmlFor="trav-guest-email">Email Address *</label>
                  <input
                    id="trav-guest-email"
                    type="email"
                    className={`trav-input ${fieldErrors.email ? 'has-error' : ''}`}
                    placeholder="e.g. anjali@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {fieldErrors.email && (
                    <span className="trav-field-error">{fieldErrors.email}</span>
                  )}
                </div>
              </div>

              <div className="trav-form-group">
                <label className="trav-form-label" htmlFor="trav-guest-phone">Phone Number *</label>
                <input
                  id="trav-guest-phone"
                  type="tel"
                  className={`trav-input ${fieldErrors.phone ? 'has-error' : ''}`}
                  placeholder="e.g. +91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                {fieldErrors.phone && (
                  <span className="trav-field-error">{fieldErrors.phone}</span>
                )}
              </div>

              <div className="trav-form-group" style={{ marginBottom: 0 }}>
                <label className="trav-form-label" htmlFor="trav-guest-notes">Special Requests / Notes (Optional)</label>
                <textarea
                  id="trav-guest-notes"
                  className="trav-textarea"
                  rows={3}
                  placeholder="e.g. Quiet floor requested, early flight arrival..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </section>
          </div>

          {/* Booking Summary Box */}
          <aside className="trav-booking-box">
            <h3 style={{ margin: '0 0 16px', fontSize: '1.25rem', fontWeight: 800 }}>
              Reservation Summary
            </h3>

            <div className="trav-price-display">
              <span className="trav-price-amount">₹{roomPrice.toLocaleString('en-IN')}</span>
              <span className="trav-price-unit">/ night</span>
            </div>

            <form onSubmit={handleBookingSubmit}>
              {/* Check-In and Check-Out */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div className="trav-form-group" style={{ margin: 0 }}>
                  <label className="trav-form-label" htmlFor="trav-check-in">Check-in</label>
                  <input
                    id="trav-check-in"
                    type="date"
                    className={`trav-input ${fieldErrors.checkIn ? 'has-error' : ''}`}
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                  />
                  {fieldErrors.checkIn && <span className="trav-field-error">{fieldErrors.checkIn}</span>}
                </div>

                <div className="trav-form-group" style={{ margin: 0 }}>
                  <label className="trav-form-label" htmlFor="trav-check-out">Check-out</label>
                  <input
                    id="trav-check-out"
                    type="date"
                    className={`trav-input ${fieldErrors.checkOut ? 'has-error' : ''}`}
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                  />
                  {fieldErrors.checkOut && <span className="trav-field-error">{fieldErrors.checkOut}</span>}
                </div>
              </div>

              {/* Rooms & Guests */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div className="trav-form-group" style={{ margin: 0 }}>
                  <label className="trav-form-label" htmlFor="trav-guests">Guests</label>
                  <select
                    id="trav-guests"
                    className="trav-select"
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value))}
                  >
                    {Array.from(
                      { length: Math.max(8, (Number(room.maxOccupancy) || 4) * Math.max(1, availableRooms)) },
                      (_, i) => i + 1,
                    ).map((num) => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? 'Guest' : 'Guests'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="trav-form-group" style={{ margin: 0 }}>
                  <label className="trav-form-label" htmlFor="trav-rooms">Rooms</label>
                  <select
                    id="trav-rooms"
                    className="trav-select"
                    value={roomsCount}
                    onChange={(e) => setRoomsCount(Number(e.target.value))}
                  >
                    {Array.from({ length: Math.max(1, availableRooms) }, (_, i) => i + 1).map((num) => (
                      <option key={num} value={num} disabled={num > availableRooms}>
                        {num} {num === 1 ? 'Room' : 'Rooms'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--trav-text-muted)', marginBottom: '12px' }}>
                Max {room.maxOccupancy || 2} guests/room ({(room.maxOccupancy || 2) * Math.max(1, Number(roomsCount))} total allowed for {roomsCount} room{Number(roomsCount) === 1 ? '' : 's'}) · {availableRooms} left
              </div>

              {!roomValidation.valid && (
                <div className="trav-validation-alert" role="alert" style={{ marginBottom: '14px' }}>
                  {roomValidation.error}
                </div>
              )}

              {/* Price Breakdown */}
              <div className="trav-price-breakdown">
                <div className="trav-breakdown-row">
                  <span>₹{roomPrice.toLocaleString('en-IN')} × {nights} {nights === 1 ? 'night' : 'nights'} × {roomsCount} {roomsCount === 1 ? 'room' : 'rooms'}</span>
                  <span>₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="trav-breakdown-row">
                  <span>Estimated Taxes & Fees (12%)</span>
                  <span>₹{taxes.toLocaleString('en-IN')}</span>
                </div>
                <div className="trav-breakdown-total">
                  <span>Total Amount</span>
                  <span style={{ color: 'var(--trav-primary)' }}>₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSoldOut || !roomValidation.valid || submitting}
                className="trav-btn trav-btn-primary"
                style={{ width: '100%', marginTop: '20px', padding: '14px' }}
              >
                {submitting ? 'Confirming Reservation...' : isSoldOut ? 'Sold Out' : 'Confirm & Book Now →'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '14px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--trav-text-muted)' }}>
                  ✓ Free cancellation up to 24h before check-in
                </span>
              </div>
            </form>
          </aside>
        </div>
      </main>
    </div>
  );
}
