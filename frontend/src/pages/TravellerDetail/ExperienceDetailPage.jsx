import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, Link } from 'react-router-dom';
import { selectAuthUser } from '@/features/authSlice.js';
import {
  createExperienceSlotBooking,
  fetchBrowseItemDetail,
  selectBrowseDetail,
} from '@/store/traveller/index.js';
import { getTodayIsoDate, validateExperienceBooking } from '@/utils/bookingValidationUtils.js';
import TravellerHeader from './TravellerHeader.jsx';
import './travellerDetail.css';

export default function ExperienceDetailPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const user = useSelector(selectAuthUser);
  const detail = useSelector(selectBrowseDetail);

  const expectedKey = `experience:${id}`;
  const isCurrent = detail.key === expectedKey;
  const experience = isCurrent ? detail.item : null;
  const reviews = isCurrent ? detail.reviews : [];
  const loading = isCurrent ? detail.loading : Boolean(id && id.trim() !== '');
  const error = !id || id.trim() === ''
    ? { status: 400, message: 'Invalid experience ID provided.' }
    : (isCurrent ? detail.error : null);

  // Booking drawer state
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [participants, setParticipants] = useState(2);
  const [booking, setBooking] = useState(false);
  const [bookedSuccess, setBookedSuccess] = useState(false);
  const [bookingMessage, setBookingMessage] = useState('');
  const [bookingError, setBookingError] = useState('');

  const loadExperienceData = useCallback(() => {
    if (!id || id.trim() === '') return;
    dispatch(fetchBrowseItemDetail({ type: 'experience', id }));
  }, [dispatch, id]);

  useEffect(() => {
    loadExperienceData();
  }, [loadExperienceData]);

  const effectiveSelectedSlotId = useMemo(() => {
    if (selectedSlotId) return selectedSlotId;
    const expSlots = experience?.slots;
    if (!expSlots?.length) return null;
    const today = new Date().toISOString().slice(0, 10);
    const firstAvailable = expSlots.find(
      (s) => s.available && String(s.date).slice(0, 10) >= today && (s.capacity - (s.booked || 0)) > 0,
    );
    return firstAvailable ? firstAvailable.id : expSlots[0].id;
  }, [selectedSlotId, experience]);

  // Handle slot reservation
  const handleReserveExperience = async (e) => {
    e.preventDefault();
    setBookingError('');
    setBookingMessage('');
    if (!effectiveSelectedSlotId) {
      setBookingError('Please select an available session slot before booking.');
      return;
    }
    const slot = (experience.slots || []).find((s) => s.id === effectiveSelectedSlotId);
    const expValidation = validateExperienceBooking({
      experience,
      slot,
      date: slot?.date,
      participants,
      today: getTodayIsoDate(),
    });
    if (!expValidation.valid) {
      setBookingError(expValidation.error);
      return;
    }
    setBooking(true);
    try {
      await dispatch(createExperienceSlotBooking({
        experienceId: experience.id,
        guestName: user?.name || 'Traveller',
        email: user?.email || '',
        phone: user?.phone || '',
        date: slot?.date,
        participants,
      })).unwrap();
      setBookedSuccess(true);
      setBookingMessage(`🎉 Experience session booked successfully for ${participants} guest(s)! Confirmation details sent to your registered email.`);
    } catch (err) {
      setBookingError((typeof err === 'string' ? err : err?.message) || 'Failed to book this experience. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="trav-page-container">
        <TravellerHeader title="Experience Details" />
        <main className="trav-main">
          <div className="trav-loading-card">
            <div className="trav-spinner" />
            <h2 className="trav-loading-title">Loading Experience...</h2>
            <p className="trav-loading-subtitle">Retrieving itinerary, guide information, and available slots.</p>
          </div>
        </main>
      </div>
    );
  }

  // 4. 400 Validation State
  if (error && error.status === 400) {
    return (
      <div className="trav-page-container">
        <TravellerHeader title="Invalid Request" />
        <main className="trav-main">
          <div className="trav-validation-alert" role="alert">
            <span>⚠️</span>
            <div>
              <strong>Validation Error (400):</strong> {error.message}
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <Link to="/hotels" className="trav-btn trav-btn-primary">
              Return to Browse
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
        <TravellerHeader title="Access Restricted" />
        <main className="trav-main">
          <div className="trav-forbidden-card">
            <div className="trav-forbidden-code">403</div>
            <h2 className="trav-forbidden-title">Experience Not Accessible</h2>
            <p className="trav-forbidden-desc">
              {error.message || 'You do not have permission to view this experience or it belongs to an unlinked region.'}
            </p>
            <Link to="/hotels" className="trav-btn trav-btn-primary">
              Browse Available Offerings
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
            <h2 className="trav-error-title">Unable to Load Experience</h2>
            <p className="trav-error-desc">{error.message}</p>
            <button type="button" onClick={loadExperienceData} className="trav-btn trav-btn-primary">
              Try Again
            </button>
          </div>
        </main>
      </div>
    );
  }

  // 2. Empty State
  if (!experience) {
    return (
      <div className="trav-page-container">
        <TravellerHeader title="Not Found" />
        <main className="trav-main">
          <div className="trav-empty-state">
            <span className="trav-empty-icon">🛶</span>
            <h2 className="trav-empty-title">Experience Not Found</h2>
            <p className="trav-empty-desc">
              This experience is either closed for the season, removed, or no longer accepting bookings.
            </p>
            <Link to="/hotels" className="trav-btn trav-btn-primary">
              Explore Other Destinations
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const expImage = experience.image || 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=80';
  const slots = experience.slots || [];
  const selectedSlot = slots.find((s) => s.id === effectiveSelectedSlotId);
  const expValidation = validateExperienceBooking({
    experience,
    slot: selectedSlot,
    date: selectedSlot?.date,
    participants,
    today: getTodayIsoDate(),
  });
  const remainingSpots = expValidation.details?.remainingSpots ?? Math.max(0, experience.capacity || 0);
  const isSelectedSlotFull = selectedSlot ? (selectedSlot.available === false || remainingSpots <= 0 || String(selectedSlot.date).slice(0, 10) < getTodayIsoDate()) : false;
  const maxSelectableParticipants = Math.max(1, remainingSpots || Number(experience.capacity) || 1);
  const unitPrice = experience.price || 1200;
  const subtotalPrice = unitPrice * Number(participants);
  const taxesPrice = Math.round(subtotalPrice * 0.12);
  const totalPrice = subtotalPrice + taxesPrice;

  return (
    <div className="trav-page-container">
      <TravellerHeader title={experience.title} backTo="/hotels" backLabel="Browse All" />

      <main className="trav-main">
        {/* Detail Header */}
        <div className="trav-detail-header">
          <div className="trav-detail-topline">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <span className="trav-badge trav-badge-category">{experience.category || 'Culture'}</span>
                <span className="trav-badge trav-badge-primary">📍 {experience.destination || 'Goa'}</span>
                <span className={`trav-badge ${experience.status === 'active' ? 'trav-badge-success' : 'trav-badge-warning'}`}>
                  {experience.status || 'Active'}
                </span>
              </div>
              <h1 className="trav-detail-title">{experience.title}</h1>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div className="trav-price-display" style={{ marginBottom: 0 }}>
                <span className="trav-price-amount">₹{(experience.price || 1200).toLocaleString('en-IN')}</span>
                <span className="trav-price-unit">/ person</span>
              </div>
              <span style={{ fontSize: '0.85rem', color: 'var(--trav-text-light)' }}>
                Includes guide, gear & taxes
              </span>
            </div>
          </div>
        </div>

        {/* Hero Image */}
        <div style={{ borderRadius: 'var(--trav-radius-lg)', overflow: 'hidden', marginBottom: '32px', boxShadow: 'var(--trav-shadow-md)' }}>
          <img
            src={expImage}
            alt={experience.title}
            style={{ width: '100%', height: '420px', objectFit: 'cover', display: 'block' }}
          />
        </div>

        {/* Grid Layout */}
        <div className="trav-grid-layout">
          <div>
            {/* Highlights Card */}
            <section className="trav-card">
              <h2 className="trav-card-title">Experience Highlights</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: 'var(--trav-radius-md)' }}>
                  <span style={{ fontSize: '1.2rem', display: 'block', marginBottom: '4px' }}>⏱️ Duration</span>
                  <strong style={{ fontSize: '1.1rem' }}>{experience.durationHours || 3} Hours</strong>
                </div>
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: 'var(--trav-radius-md)' }}>
                  <span style={{ fontSize: '1.2rem', display: 'block', marginBottom: '4px' }}>👥 Group Size</span>
                  <strong style={{ fontSize: '1.1rem' }}>Max {experience.capacity || 12} People</strong>
                </div>
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: 'var(--trav-radius-md)' }}>
                  <span style={{ fontSize: '1.2rem', display: 'block', marginBottom: '4px' }}>🗣️ Language</span>
                  <strong style={{ fontSize: '1.1rem' }}>English, Hindi</strong>
                </div>
              </div>

              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '18px 0 8px' }}>About this Experience</h3>
              <p className="trav-card-desc">
                {experience.description ||
                  'Immerse yourself in authentic local traditions, scenic landscapes, and cultural heritage led by knowledgeable certified community guides.'}
              </p>
            </section>

            {/* Schedule & Available Slots Section */}
            <section className="trav-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h2 className="trav-card-title" style={{ margin: 0 }}>Select Session Date & Time</h2>
                <span className="trav-badge trav-badge-primary">
                  {slots.length} {slots.length === 1 ? 'Slot' : 'Slots'} Scheduled
                </span>
              </div>

              {slots.length === 0 ? (
                <div className="trav-empty-state" style={{ padding: '28px 20px', margin: 0 }}>
                  <p style={{ margin: 0, color: 'var(--trav-text-muted)' }}>
                    No upcoming sessions scheduled right now. Check back soon for new dates!
                  </p>
                </div>
              ) : (
                <div className="trav-slots-grid">
                  {slots.map((slot) => {
                    const spotsLeft = slot.capacity - (slot.booked || 0);
                    const isPast = String(slot.date).slice(0, 10) < new Date().toISOString().slice(0, 10);
                    const isFull = spotsLeft <= 0 || !slot.available || isPast;
                    const isSelected = slot.id === effectiveSelectedSlotId;

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={isFull}
                        onClick={() => {
                          setSelectedSlotId(slot.id);
                          setBookedSuccess(false);
                          setBookingMessage('');
                        }}
                        className={`trav-slot-card ${isSelected ? 'selected' : ''} ${isFull ? 'disabled' : ''}`}
                      >
                        <div className="trav-slot-time">
                          📅 {slot.date}
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--trav-primary)', marginBottom: '4px' }}>
                          ⏰ {slot.time || '10:00 AM'}
                        </div>
                        <div className="trav-slot-capacity">
                          {isFull ? (
                            <span style={{ color: 'var(--trav-error)', fontWeight: 700 }}>{isPast ? '● Session passed' : '● Sold Out'}</span>
                          ) : (
                            <span style={{ color: 'var(--trav-success)', fontWeight: 600 }}>● {spotsLeft} spots available</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Guest Reviews Section */}
            <section className="trav-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h2 className="trav-card-title" style={{ margin: 0 }}>Guest Reviews & Stories</h2>
                  <span style={{ fontSize: '0.9rem', color: 'var(--trav-text-muted)' }}>
                    {reviews.length} Verified Traveller {reviews.length === 1 ? 'Review' : 'Reviews'}
                  </span>
                </div>
                <Link
                  to={`/reviews/new?targetType=experience&targetId=${id}&targetName=${encodeURIComponent(experience.title)}`}
                  className="trav-btn trav-btn-outline"
                  style={{ padding: '8px 16px', fontSize: '0.88rem' }}
                >
                  ✍️ Share Your Story
                </Link>
              </div>

              {reviews.length === 0 ? (
                <div className="trav-empty-state" style={{ padding: '32px 20px', margin: 0 }}>
                  <p style={{ margin: 0, color: 'var(--trav-text-muted)' }}>
                    No reviews written yet. Complete your tour and be the first to rate!
                  </p>
                </div>
              ) : (
                reviews.map((rev) => (
                  <div key={rev.id} className="trav-review-card">
                    <div className="trav-review-header">
                      <div>
                        <span className="trav-reviewer-name">{rev.authorName || rev.guestName || 'Curious Traveller'}</span>
                        <div className="trav-rating-stars" style={{ marginTop: '2px' }}>
                          {'★'.repeat(Math.min(5, Math.max(1, rev.rating || 5)))}
                        </div>
                      </div>
                      <span className="trav-review-date">
                        {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : 'Verified Guest'}
                      </span>
                    </div>
                    {rev.title && (
                      <h4 style={{ margin: '6px 0 2px', fontSize: '0.95rem', fontWeight: 700 }}>
                        {rev.title}
                      </h4>
                    )}
                    <p className="trav-review-text">{rev.comment || rev.text}</p>
                  </div>
                ))
              )}
            </section>
          </div>

          {/* Booking Widget Sidebar */}
          <aside className="trav-booking-box">
            <h3 style={{ margin: '0 0 14px', fontSize: '1.25rem', fontWeight: 800 }}>
              Book Experience
            </h3>

            <div className="trav-price-display">
              <span className="trav-price-amount">₹{(experience.price || 1200).toLocaleString('en-IN')}</span>
              <span className="trav-price-unit">/ person</span>
            </div>

            {bookingMessage && (
              <div
                className={bookedSuccess ? 'trav-card' : 'trav-validation-alert'}
                style={bookedSuccess ? { background: 'var(--trav-success-bg)', border: '1px solid var(--trav-success)', color: '#065f46', padding: '14px', marginBottom: '16px' } : {}}
              >
                {bookingMessage}
              </div>
            )}

            {bookingError && (
              <div className="trav-validation-alert" role="alert" style={{ marginBottom: '16px' }}>
                {bookingError}
              </div>
            )}

            {!bookingError && !expValidation.valid && !bookedSuccess && (
              <div className="trav-validation-alert" role="alert" style={{ marginBottom: '16px' }}>
                {expValidation.error}
              </div>
            )}

            <form onSubmit={handleReserveExperience}>
              <div className="trav-form-group">
                <label className="trav-form-label" htmlFor="trav-participants">Participants / Guests</label>
                <select
                  id="trav-participants"
                  className="trav-select"
                  value={participants}
                  onChange={(e) => setParticipants(Number(e.target.value))}
                >
                  {Array.from({ length: maxSelectableParticipants }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num} disabled={selectedSlot && num > remainingSpots}>
                      {num} {num === 1 ? 'Participant' : 'Participants'}
                    </option>
                  ))}
                </select>
              </div>

              {selectedSlot && (
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: 'var(--trav-radius-md)', marginBottom: '18px' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--trav-text-muted)', marginBottom: '4px' }}>
                    Selected Session:
                  </div>
                  <strong style={{ fontSize: '0.95rem' }}>
                    📅 {selectedSlot.date} at {selectedSlot.time || '10:00 AM'} ({remainingSpots} spots left)
                  </strong>
                </div>
              )}

              <div className="trav-price-breakdown">
                <div className="trav-breakdown-row">
                  <span>₹{unitPrice.toLocaleString('en-IN')} × {participants} {participants === 1 ? 'person' : 'people'}</span>
                  <span>₹{subtotalPrice.toLocaleString('en-IN')}</span>
                </div>
                <div className="trav-breakdown-row">
                  <span>Estimated Taxes & Fees (12%)</span>
                  <span>₹{taxesPrice.toLocaleString('en-IN')}</span>
                </div>
                <div className="trav-breakdown-total">
                  <span>Total Amount</span>
                  <span style={{ color: 'var(--trav-primary)' }}>₹{totalPrice.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSelectedSlotFull || !expValidation.valid || slots.length === 0 || bookedSuccess || booking}
                className="trav-btn trav-btn-primary"
                style={{ width: '100%', marginTop: '20px', padding: '14px' }}
              >
                {bookedSuccess ? '✓ Booked' : booking ? 'Booking…' : isSelectedSlotFull ? 'Slot Full' : 'Confirm Experience Booking →'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '14px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--trav-text-muted)' }}>
                  ✓ Instant booking confirmation · Mobile ticket
                </span>
              </div>
            </form>
          </aside>
        </div>
      </main>
    </div>
  );
}
