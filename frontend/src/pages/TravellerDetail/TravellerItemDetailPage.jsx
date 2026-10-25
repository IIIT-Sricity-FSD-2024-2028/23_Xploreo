import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import Navbar from '../../components/Navbar/navbar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getHotel, listRooms } from '../../services/hotels.api.js';
import { getExperience } from '../../services/partners.api.js';
import { getPlanById } from '../../services/plans.api.js';
import { apiRequest } from '../../services/api.js';
import {
  DEFAULT_HOTEL_FIXTURES,
  DEFAULT_EXPERIENCE_FIXTURES,
  DEFAULT_PLAN_FIXTURES,
  mapBackendHotel,
  mapBackendExperience,
  mapBackendPlan,
} from '../../utils/browseUtils.js';
import { formatCurrency, formatDate, validateBookingDates } from '../../utils/checkoutUtils.js';
import './travellerDetail.css';

/**
 * TravellerItemDetailPage
 * Dedicated full page for inspecting Hotel, Experience, or Holiday Package details.
 * Supports:
 * - Dynamic data retrieval by item ID & category with browser refresh persistence
 * - Multiple images in an interactive gallery carousel with graceful missing image fallbacks
 * - Comprehensive item specifics (amenities, schedule slots, package tags & itinerary)
 * - Clear "Book Slot" CTA transitioning into the existing /Traveller/checkout flow
 * - Preservation of user selections (guests, rooms, dates, destination)
 */
export default function TravellerItemDetailPage({ user: propUser, defaultType }) {
  let authUser = null;
  try {
    const auth = useAuth();
    authUser = auth?.user;
  } catch {
    authUser = null;
  }
  const user = propUser || authUser;
  const { type: paramType, id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Normalize category type (hotel | experience | package/plan)
  const effectiveType = useMemo(() => {
    const raw = (paramType || defaultType || '').toLowerCase();
    if (raw === 'hotels' || raw === 'hotel') return 'hotel';
    if (raw === 'experiences' || raw === 'experience') return 'experience';
    if (raw === 'packages' || raw === 'package' || raw === 'plans' || raw === 'plan') return 'package';
    return 'hotel';
  }, [paramType, defaultType]);

  // Read search context from URL search params or router location state
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const initialCheckIn = searchParams.get('checkIn') || location.state?.checkInDate || location.state?.checkIn || '';
  const initialCheckOut = searchParams.get('checkOut') || location.state?.checkOutDate || location.state?.checkOut || '';
  const initialGuests = searchParams.get('guests') || location.state?.guestCount || location.state?.guests || '2';
  const initialRooms = searchParams.get('rooms') || location.state?.roomCount || location.state?.rooms || '1';

  // State management
  const [item, setItem] = useState(() => {
    if (location.state?.item && String(location.state.item.id) === String(id)) {
      return location.state.item;
    }
    return null;
  });
  const [loading, setLoading] = useState(!item);
  const [error, setError] = useState(null);

  // Gallery carousel state
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // Booking drawer controls
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedCheckIn, setSelectedCheckIn] = useState(initialCheckIn || todayStr);
  const [selectedCheckOut, setSelectedCheckOut] = useState(() => {
    if (initialCheckOut) return initialCheckOut;
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [selectedGuests, setSelectedGuests] = useState(initialGuests);
  const [selectedRooms, setSelectedRooms] = useState(initialRooms);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [bookError, setBookError] = useState('');

  // Fetch item data on mount or when id/type changes
  useEffect(() => {
    let isCancelled = false;

    async function loadItem() {
      if (!id) {
        setError('Invalid item identifier provided.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let loaded = null;

        if (effectiveType === 'hotel') {
          const raw = await getHotel(id);
          if (raw) loaded = mapBackendHotel(raw);
        } else if (effectiveType === 'experience') {
          const raw = await getExperience(id);
          if (raw) loaded = mapBackendExperience(raw);
        } else if (effectiveType === 'package') {
          const raw = await getPlanById(id);
          if (raw) loaded = mapBackendPlan(raw);
        }

        if (!isCancelled) {
          if (loaded) {
            setItem(loaded);
            if (Array.isArray(loaded.slots) && loaded.slots.length > 0) {
              const today = new Date().toISOString().slice(0, 10);
              const available = loaded.slots.find((s) => s.available && String(s.date).slice(0, 10) >= today && (s.capacity - (s.booked || 0)) > 0);
              setSelectedSlotId(available ? available.id : null);
            }
          } else if (!item) {
            setError(`The requested ${effectiveType} (#${id}) could not be found.`);
          }
        }
      } catch (err) {
        if (!isCancelled && !item) {
          setError(err.message || `Failed to load ${effectiveType} details.`);
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadItem();

    return () => {
      isCancelled = true;
    };
  }, [id, effectiveType]);

  // Room types the hotel partner added to this property (active ones only)
  useEffect(() => {
    if (effectiveType !== 'hotel' || !id) return undefined;
    let cancelled = false;
    listRooms(id)
      .then((list) => {
        if (cancelled) return;
        const active = (list || []).filter((r) => r.status !== 'inactive');
        setRooms(active);
        setSelectedRoomId((prev) => (active.some((r) => r.id === prev) ? prev : (active.find((r) => r.availableRooms > 0) || active[0])?.id ?? null));
      })
      .catch(() => { if (!cancelled) setRooms([]); });
    return () => { cancelled = true; };
  }, [id, effectiveType]);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) || null;

  // For a hotel with a chosen room type, the room count is capped at what is left of that type.
  // No hardcoded ceiling — the list always goes exactly as far as real inventory allows.
  const roomOptions = useMemo(() => {
    if (effectiveType !== 'hotel' || !selectedRoom) return null;
    const max = Math.max(1, Number(selectedRoom.availableRooms) || 0);
    return Array.from({ length: max }, (_, i) => i + 1);
  }, [effectiveType, selectedRoom]);

  useEffect(() => {
    if (roomOptions && Number(selectedRooms) > roomOptions.length) setSelectedRooms(String(roomOptions.length));
  }, [roomOptions, selectedRooms]);

  // Guest count is capped at real spots left (the chosen session's own slot capacity for an
  // experience, or the item's own capacity otherwise) — never a fixed "5+" sentinel that silently
  // misreports how many guests are actually being booked.
  const guestOptions = useMemo(() => {
    let max = Number(item?.capacity) || 10;
    if (effectiveType === 'experience' && Array.isArray(item?.slots)) {
      const slot = item.slots.find((s) => s.id === selectedSlotId);
      if (slot) max = Math.max(1, (Number(slot.capacity) || 0) - (Number(slot.booked) || 0));
    }
    return Array.from({ length: Math.max(1, max) }, (_, i) => i + 1);
  }, [item, effectiveType, selectedSlotId]);

  useEffect(() => {
    if (Number(selectedGuests) > guestOptions.length) setSelectedGuests(String(guestOptions.length));
  }, [guestOptions, selectedGuests]);

  // Photo gallery calculation (safe, no invented URLs)
  const images = useMemo(() => {
    if (!item) return [];
    const list = [];
    if (Array.isArray(item.images)) {
      item.images.forEach((img) => {
        if (typeof img === 'string' && img.trim() && !list.includes(img.trim())) {
          list.push(img.trim());
        }
      });
    }
    if (typeof item.image === 'string' && item.image.trim() && !list.includes(item.image.trim())) {
      list.push(item.image.trim());
    }
    if (typeof item.imageUrl === 'string' && item.imageUrl.trim() && !list.includes(item.imageUrl.trim())) {
      list.push(item.imageUrl.trim());
    }
    return list;
  }, [item]);

  const activePhoto = images[activePhotoIndex] || images[0] || null;

  const handlePrevPhoto = () => {
    setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNextPhoto = () => {
    setActivePhotoIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  // Pricing & Night calculations
  const calculateNights = () => {
    if (!selectedCheckIn || !selectedCheckOut) return 1;
    const start = new Date(selectedCheckIn);
    const end = new Date(selectedCheckOut);
    const diff = (end - start) / (1000 * 60 * 60 * 24);
    return diff > 0 ? Math.ceil(diff) : 1;
  };

  const nights = calculateNights();
  const guestCountNum = Math.max(1, Number(selectedGuests) || 2);
  const roomCountNum = Math.max(1, Number(selectedRooms) || 1);
  const startingRate = Number(
    (effectiveType === 'hotel' ? selectedRoom?.pricePerNight : undefined) ?? item?.pricePerNight ?? item?.price ?? item?.pricePerPerson ?? 5000,
  );
  const subtotal =
    effectiveType === 'hotel'
      ? startingRate * nights * roomCountNum
      : effectiveType === 'package'
      ? startingRate * guestCountNum
      : startingRate * guestCountNum;
  // Stays and experiences carry 12% taxes & fees (same rate as the server); packages keep their own figure.
  const taxes = effectiveType === 'package' ? Number(item?.taxesAndFees ?? 1200) : Math.round(subtotal * 0.12);
  const totalAmount = subtotal + taxes;
  const isSoldOut = effectiveType === 'package' && (item?.status || '').toLowerCase() === 'sold_out';

  // Handle "Book Slot" navigation into existing /Traveller/checkout flow
  const handleBookSlot = () => {
    if (!item) return;
    if (isSoldOut) {
      setBookError('This travel package is sold out and cannot be booked.');
      return;
    }

    const selectedSlotObj = Array.isArray(item.slots)
      ? item.slots.find((s) => s.id === selectedSlotId)
      : null;

    // Dates come from the thing being booked: a hotel's chosen stay, an experience's chosen session,
    // a package's fixed itinerary — never from a stray search-bar date.
    let bookingCheckIn = selectedCheckIn;
    let bookingCheckOut = selectedCheckOut;
    if (effectiveType === 'experience') {
      if (Array.isArray(item.slots) && item.slots.length > 0) {
        if (!selectedSlotObj) {
          setBookError('Please select a session slot to book.');
          return;
        }
        if (!selectedSlotObj.available || (selectedSlotObj.capacity || 0) - (selectedSlotObj.booked || 0) < guestCountNum) {
          setBookError('That session does not have enough spots left. Choose another session or fewer guests.');
          return;
        }
        bookingCheckIn = String(selectedSlotObj.date).slice(0, 10);
      }
      bookingCheckOut = bookingCheckIn;
    } else if (effectiveType === 'package') {
      const hotel = item.itinerary?.day1?.hotel;
      if (hotel?.checkInDate) {
        bookingCheckIn = hotel.checkInDate;
        bookingCheckOut = hotel.checkOutDate || hotel.checkInDate;
      }
    }
    if (effectiveType === 'hotel' && rooms.length > 0) {
      if (!selectedRoom) {
        setBookError('Please select a room type to book.');
        return;
      }
      if (selectedRoom.availableRooms < roomCountNum) {
        setBookError(`Only ${selectedRoom.availableRooms} "${selectedRoom.type}" room(s) left. Choose another room type or fewer rooms.`);
        return;
      }
    }
    const dateError = validateBookingDates({
      type: effectiveType === 'hotel' ? 'hotel' : effectiveType,
      checkIn: bookingCheckIn,
      checkOut: bookingCheckOut,
    });
    if (dateError) {
      setBookError(dateError);
      return;
    }
    setBookError('');

    const checkoutItem = {
      id: item.id || `item-${Date.now()}`,
      title: item.name || item.title || 'Selected Reservation',
      type: effectiveType === 'hotel' ? 'hotel' : effectiveType === 'experience' ? 'experience' : 'plan',
      location: item.location || item.city || item.destination || 'India',
      date: bookingCheckIn,
      checkIn: bookingCheckIn,
      checkOut: bookingCheckOut,
      itinerary: effectiveType === 'package' ? item.itinerary : undefined,
      guestCount: guestCountNum,
      roomCount: roomCountNum,
      roomType: effectiveType === 'hotel' ? selectedRoom?.type : undefined,
      basePrice: startingRate,
      taxesAndFees: taxes,
      total: totalAmount,
      imageUrl: activePhoto || item.image || item.imageUrl || null,
      selectedSlot: selectedSlotObj,
      item,
    };

    navigate('/Traveller/checkout', {
      state: {
        item: checkoutItem,
        guests: guestCountNum,
        rooms: roomCountNum,
        checkIn: bookingCheckIn,
        checkOut: bookingCheckOut,
      },
    });
  };

  // 1. Loading State
  if (loading && !item) {
    return (
      <div className="trav-page-container">
        <Navbar user={user} />
        <main className="trav-main" style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px', width: '100%' }}>
          <div className="trav-loading-card">
            <div className="trav-spinner" />
            <h2 className="trav-loading-title">Loading Item Details...</h2>
            <p className="trav-loading-subtitle">
              Retrieving verified rates, property features, and live availability.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // 2. Error State
  if (error && !item) {
    return (
      <div className="trav-page-container">
        <Navbar user={user} />
        <main className="trav-main" style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
          <div className="trav-error-state" role="alert">
            <span className="trav-error-icon" aria-hidden="true">⚠️</span>
            <h2 className="trav-error-title">Item Unavailable</h2>
            <p className="trav-error-desc">{error}</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                className="trav-btn trav-btn-primary"
                onClick={() => navigate('/Traveller/browse')}
              >
                ← Return to Browse
              </button>
              <button
                type="button"
                className="trav-btn trav-btn-secondary"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const title = item.name || item.title || 'Travel Item';
  const displayLocation = item.location || item.city || item.destination || 'India';
  const categoryLabel =
    effectiveType === 'hotel'
      ? 'Hotels & Stays'
      : effectiveType === 'experience'
      ? 'Curated Experience'
      : 'Holiday Tour Package';

  return (
    <div className="trav-page-container" data-testid="traveller-item-detail-page">
      <Navbar user={user} />

      <main className="trav-main" style={{ maxWidth: '1200px', margin: '24px auto', padding: '0 20px', width: '100%', boxSizing: 'border-box' }}>
        {/* Navigation Breadcrumb & Back button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <button
            type="button"
            className="trav-btn trav-btn-secondary"
            onClick={() => navigate(-1)}
            style={{ padding: '8px 16px', fontSize: '0.9rem' }}
            aria-label="Back to browse"
          >
            ← Back to Browse
          </button>
          <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
            <Link to="/Traveller/browse" style={{ color: '#0d9488', textDecoration: 'none', fontWeight: 600 }}>
              Browse
            </Link>
            {' › '}
            <span style={{ color: '#475569', fontWeight: 600 }}>{categoryLabel}</span>
            {' › '}
            <span style={{ color: '#0f172a', fontWeight: 700 }}>{title}</span>
          </div>
        </div>

        {/* Item Topline Header */}
        <div className="trav-detail-header">
          <div className="trav-detail-topline">
            <div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                <span className="trav-badge trav-badge-category">
                  {categoryLabel.toUpperCase()}
                </span>
                {isSoldOut && (
                  <span
                    style={{
                      background: '#ef4444',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Sold Out
                  </span>
                )}
              </div>
              <h1 className="trav-detail-title">{title}</h1>
              <div className="trav-detail-location">
                <span>📍</span>
                <span>{displayLocation}</span>
                {item.stars && (
                  <span style={{ marginLeft: '12px', color: '#f59e0b', fontWeight: 700 }}>
                    {'★'.repeat(Math.min(5, Math.max(1, item.stars)))} {item.stars}-Star Tier
                  </span>
                )}
                {item.rating && (
                  <span style={{ marginLeft: '8px', color: '#0f172a', fontWeight: 700 }}>
                    ★ {item.rating} ({item.reviewCount || 120} reviews)
                  </span>
                )}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Starting from</div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0f172a' }}>
                {formatCurrency(startingRate)}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {effectiveType === 'hotel' ? 'per night' : 'per person'}
              </div>
            </div>
          </div>
        </div>

        {/* Photo Gallery & Carousel */}
        <section className="trav-gallery-container" aria-label="Photo Gallery" style={{ marginBottom: '32px' }}>
          {images.length > 0 ? (
            <div>
              <div style={{ position: 'relative', width: '100%', height: '460px', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#0f172a' }}>
                <img
                  src={activePhoto}
                  alt={`${title} view ${activePhotoIndex + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrevPhoto}
                      aria-label="Previous photo"
                      style={{
                        position: 'absolute',
                        left: '16px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(15, 23, 42, 0.75)',
                        color: '#ffffff',
                        border: 'none',
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        fontSize: '1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                      }}
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={handleNextPhoto}
                      aria-label="Next photo"
                      style={{
                        position: 'absolute',
                        right: '16px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(15, 23, 42, 0.75)',
                        color: '#ffffff',
                        border: 'none',
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        fontSize: '1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                      }}
                    >
                      ›
                    </button>
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '16px',
                        right: '16px',
                        background: 'rgba(15, 23, 42, 0.8)',
                        color: '#ffffff',
                        padding: '4px 12px',
                        borderRadius: '999px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                      }}
                    >
                      {activePhotoIndex + 1} / {images.length}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnails row */}
              {images.length > 1 && (
                <div
                  style={{
                    display: 'flex',
                    gap: '12px',
                    marginTop: '12px',
                    overflowX: 'auto',
                    paddingBottom: '6px',
                  }}
                >
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActivePhotoIndex(idx)}
                      style={{
                        border: idx === activePhotoIndex ? '3px solid #0d9488' : '2px solid transparent',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        padding: 0,
                        cursor: 'pointer',
                        flexShrink: 0,
                        width: '100px',
                        height: '68px',
                        opacity: idx === activePhotoIndex ? 1 : 0.7,
                        transition: 'opacity 0.2s',
                      }}
                      aria-label={`View photo ${idx + 1}`}
                    >
                      <img
                        src={img}
                        alt={`Thumbnail ${idx + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Graceful missing-image fallback (no invented URLs) */
            <div
              style={{
                width: '100%',
                height: '320px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                color: '#cbd5e1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                boxShadow: '0 8px 24px rgba(15,23,42,0.1)',
              }}
            >
              <span style={{ fontSize: '3rem' }}>
                {effectiveType === 'hotel' ? '🏨' : effectiveType === 'experience' ? '🧭' : '🗺'}
              </span>
              <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.2rem', fontWeight: 700 }}>
                {title}
              </h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8' }}>
                Photo gallery coming soon · Verified listing
              </p>
            </div>
          )}
        </section>

        {/* 2-Column Content + Sticky Booking Box */}
        <div className="trav-grid-layout">
          {/* Left Column: Comprehensive Details */}
          <div>
            {/* Overview / Description */}
            <section className="trav-card">
              <h2 className="trav-card-title">Overview & Description</h2>
              <p className="trav-card-desc">
                {item.description ||
                  'Experience tranquil luxury and world-class hospitality curated for discerning travellers across India.'}
              </p>
            </section>

            {/* Hotel-Specific Details: Amenities & Policies */}
            {effectiveType === 'hotel' && (
              <>
                {Array.isArray(item.amenities) && item.amenities.length > 0 && (
                  <section className="trav-card">
                    <h2 className="trav-card-title">Included Amenities</h2>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {item.amenities.map((amenity, idx) => (
                        <span key={idx} className="trav-chip">
                          ✓ {amenity}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                <section className="trav-card" data-testid="room-types-section">
                  <h2 className="trav-card-title">Room Types</h2>
                  {rooms.length === 0 ? (
                    <p className="trav-card-desc">No room types are listed for this property yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {rooms.map((room) => {
                        const soldOut = room.availableRooms <= 0;
                        const chosen = room.id === selectedRoomId;
                        return (
                          <button
                            key={room.id}
                            type="button"
                            disabled={soldOut}
                            onClick={() => setSelectedRoomId(room.id)}
                            aria-pressed={chosen}
                            style={{
                              display: 'flex', gap: '14px', alignItems: 'center', textAlign: 'left', padding: '12px',
                              borderRadius: '12px', background: '#fff', cursor: soldOut ? 'not-allowed' : 'pointer',
                              border: chosen ? '2px solid #0d9488' : '1px solid #e2e8f0', opacity: soldOut ? 0.6 : 1,
                            }}
                          >
                            {room.images?.[0] ? (
                              <img src={room.images[0]} alt="" style={{ width: 84, height: 64, objectFit: 'cover', borderRadius: 8 }} />
                            ) : null}
                            <span style={{ flex: 1 }}>
                              <strong style={{ display: 'block', color: '#0f172a' }}>{room.type}</strong>
                              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                Up to {room.maxOccupancy} guests · {soldOut ? 'Sold out' : `${room.availableRooms} left`}
                              </span>
                            </span>
                            <strong style={{ color: '#0f172a' }}>{formatCurrency(room.pricePerNight)}<small style={{ color: '#64748b', fontWeight: 500 }}> / night</small></strong>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className="trav-card">
                  <h2 className="trav-card-title">Property Policies</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.95rem' }}>
                    <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px' }}>
                      <span style={{ color: '#64748b', display: 'block', marginBottom: '4px' }}>Check-in time</span>
                      <strong style={{ color: '#0f172a' }}>12:00 PM</strong>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px' }}>
                      <span style={{ color: '#64748b', display: 'block', marginBottom: '4px' }}>Check-out time</span>
                      <strong style={{ color: '#0f172a' }}>11:00 AM</strong>
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* Experience-Specific Details: Slots, Duration, Capacity */}
            {effectiveType === 'experience' && (
              <section className="trav-card">
                <h2 className="trav-card-title">Activity Information & Schedule</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                  <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Duration</span>
                    <strong style={{ display: 'block', color: '#0f172a', fontSize: '1.05rem', marginTop: '2px' }}>
                      {item.durationHours ? `${item.durationHours} Hours` : 'Half Day'}
                    </strong>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Group Capacity</span>
                    <strong style={{ display: 'block', color: '#0f172a', fontSize: '1.05rem', marginTop: '2px' }}>
                      Up to {item.capacity || 10} guests
                    </strong>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Category</span>
                    <strong style={{ display: 'block', color: '#0f172a', fontSize: '1.05rem', marginTop: '2px', textTransform: 'capitalize' }}>
                      {item.category || 'Adventure'}
                    </strong>
                  </div>
                </div>

                {Array.isArray(item.slots) && item.slots.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '16px 0 10px', color: '#0f172a' }}>
                      Available Session Slots
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {item.slots.map((slot) => {
                        const isPast = String(slot.date).slice(0, 10) < todayStr;
                        const spotsLeft = isPast ? 0 : Math.max(0, (slot.capacity || 10) - (slot.booked || 0));
                        const isSelected = selectedSlotId === slot.id && !isPast;
                        return (
                          <div
                            key={slot.id}
                            onClick={() => !isPast && spotsLeft > 0 && setSelectedSlotId(slot.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 16px',
                              borderRadius: '10px',
                              border: isSelected ? '2px solid #0d9488' : '1px solid #e2e8f0',
                              backgroundColor: isSelected ? '#f0fdfa' : '#ffffff',
                              cursor: isPast || spotsLeft === 0 ? 'not-allowed' : 'pointer',
                              opacity: isPast ? 0.55 : 1,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div>
                              <strong style={{ color: '#0f172a' }}>{slot.date}</strong>
                              <span style={{ color: '#64748b', marginLeft: '8px' }}>at {slot.time}</span>
                            </div>
                            <span
                              style={{
                                fontSize: '0.85rem',
                                color: spotsLeft > 0 ? '#0d9488' : '#ef4444',
                                fontWeight: 700,
                              }}
                            >
                              {isPast ? 'Session passed' : spotsLeft > 0 ? `${spotsLeft} spots available` : 'Sold out'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Package/Plan-Specific Details: Duration, Tags, Itinerary */}
            {effectiveType === 'package' && (
              <section className="trav-card">
                <h2 className="trav-card-title">Tour Package Specifications</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                  <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Duration</span>
                    <strong style={{ display: 'block', color: '#0f172a', fontSize: '1.05rem', marginTop: '2px' }}>
                      {item.durationNights ? `${item.durationNights} Nights / ${item.durationNights + 1} Days` : '5 Nights / 6 Days'}
                    </strong>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Accommodation</span>
                    <strong style={{ display: 'block', color: '#0f172a', fontSize: '1.05rem', marginTop: '2px' }}>
                      {item.hotelStars || 4}-Star Premium Stays
                    </strong>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Destination</span>
                    <strong style={{ display: 'block', color: '#0f172a', fontSize: '1.05rem', marginTop: '2px' }}>
                      {item.destination || 'Kerala'}
                    </strong>
                  </div>
                </div>

                {Array.isArray(item.tags) && item.tags.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '14px 0 8px', color: '#0f172a' }}>
                      Key Highlights
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {item.tags.map((tag, idx) => (
                        <span key={idx} className="trav-chip">
                          🌟 {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', borderLeft: '4px solid #0d9488' }}>
                  <h4 style={{ margin: '0 0 6px', color: '#0f172a', fontSize: '0.95rem' }}>Package Inclusions</h4>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#475569', lineHeight: 1.5 }}>
                    All packages include vetted accommodation, guided transfers, verified daily itineraries, and 24/7 traveller support.
                  </p>
                </div>
              </section>
            )}

            {/* Package Day-by-Day Itinerary Section */}
            {effectiveType === 'package' && (
              <section className="trav-card" data-testid="package-itinerary-section">
                {(() => {
                  const rawItin = item.itinerary;
                  const isObjectItin = rawItin && typeof rawItin === 'object' && !Array.isArray(rawItin);
                  const isArrayItin = Array.isArray(rawItin) && rawItin.length > 0;
                  const day1Hotel = isObjectItin ? rawItin.day1?.hotel : null;
                  const experienceDays = isObjectItin && Array.isArray(rawItin.days) ? rawItin.days : [];
                  const hasItineraryData = Boolean(
                    isArrayItin ||
                    day1Hotel?.name ||
                    experienceDays.some((d) => Array.isArray(d.experiences) && d.experiences.length > 0)
                  );

                  const totalDaysCount = isArrayItin
                    ? rawItin.length
                    : (experienceDays.length > 0
                        ? Math.max(
                            day1Hotel ? 1 : 0,
                            ...experienceDays.map((d, i) => Number(d.dayNumber || i + 2))
                          )
                        : (day1Hotel ? 1 : (item.durationNights ? item.durationNights + 1 : 0)));

                  return (
                    <>
                      <div className="trav-itinerary-header-row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <h2 className="trav-card-title" style={{ margin: 0 }}>
                            Day-by-Day Itinerary
                          </h2>
                          {totalDaysCount > 0 && (
                            <span className="trav-itinerary-count-badge">
                              {totalDaysCount} {totalDaysCount === 1 ? 'Day' : 'Days'} Plan
                            </span>
                          )}
                        </div>
                      </div>

                      {!hasItineraryData ? (
                        <div className="trav-itinerary-empty-box">
                          <p style={{ margin: 0 }}>Itinerary details will be available soon.</p>
                        </div>
                      ) : (
                        <div className="trav-itinerary-timeline">
                          {/* Case A: Object Itinerary (NTA Standard Itinerary Builder Format) */}
                          {isObjectItin && (
                            <>
                              {/* Day 1: Partner Hotel Check-In & Arrival */}
                              {day1Hotel ? (
                                <div className="trav-itinerary-day-card">
                                  <div className="trav-itinerary-day-header">
                                    <div className="trav-itinerary-day-title-group">
                                      <span className="trav-itinerary-day-badge">Day 1</span>
                                      <h3 className="trav-itinerary-day-heading">
                                        Arrival & Check-in at {day1Hotel.name || `${item.destination} Partner Stay`}
                                      </h3>
                                    </div>
                                    <span className="trav-itinerary-type-pill arrival">Stay & Check-In</span>
                                  </div>

                                  <div className="trav-itinerary-day-body">
                                    <div className="trav-itinerary-hotel-banner">
                                      <div className="trav-itinerary-hotel-top">
                                        <h4 className="trav-itinerary-hotel-name">
                                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2">
                                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                            <polyline points="9 22 9 12 15 12 15 22" />
                                          </svg>
                                          {day1Hotel.name || `${item.destination} Partner Hotel`}
                                        </h4>
                                        <span className="trav-itinerary-hotel-stars">
                                          {day1Hotel.stars || item.hotelStars || 4}★ Partner Stay
                                        </span>
                                      </div>

                                      <div className="trav-itinerary-meta-grid">
                                        <div className="trav-itinerary-meta-item">
                                          <span className="trav-itinerary-meta-label">Room Type</span>
                                          <span className="trav-itinerary-meta-val">
                                            {day1Hotel.roomType || 'Standard Room'}
                                          </span>
                                        </div>
                                        <div className="trav-itinerary-meta-item">
                                          <span className="trav-itinerary-meta-label">Check-In</span>
                                          <span className="trav-itinerary-meta-val">
                                            {day1Hotel.checkInDate || 'Scheduled Day 1'}
                                          </span>
                                        </div>
                                        <div className="trav-itinerary-meta-item">
                                          <span className="trav-itinerary-meta-label">Check-Out</span>
                                          <span className="trav-itinerary-meta-val">
                                            {day1Hotel.checkOutDate || `Day ${item.durationNights ? item.durationNights + 1 : 2}`}
                                          </span>
                                        </div>
                                        <div className="trav-itinerary-meta-item">
                                          <span className="trav-itinerary-meta-label">Destination</span>
                                          <span className="trav-itinerary-meta-val">
                                            {item.destination}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : null}

                              {/* Days 2+: Curated Local Experiences & Activities */}
                              {experienceDays.map((dayGroup, dayIdx) => {
                                const dayNumber = dayGroup.dayNumber || dayIdx + 2;
                                const experiences = Array.isArray(dayGroup.experiences)
                                  ? dayGroup.experiences
                                  : [];

                                return (
                                  <div key={dayIdx} className="trav-itinerary-day-card">
                                    <div className="trav-itinerary-day-header">
                                      <div className="trav-itinerary-day-title-group">
                                        <span className="trav-itinerary-day-badge">Day {dayNumber}</span>
                                        <h3 className="trav-itinerary-day-heading">
                                          {experiences.length > 0 && experiences[0].title
                                            ? experiences[0].title
                                            : `Day ${dayNumber} Curated Exploration`}
                                        </h3>
                                      </div>
                                      <span className="trav-itinerary-type-pill">Guided Activity</span>
                                    </div>

                                    <div className="trav-itinerary-day-body">
                                      {experiences.length > 0 ? (
                                        <div className="trav-itinerary-exp-list">
                                          {experiences.map((exp, expIdx) => {
                                            const starts = exp.startsAt
                                              ? (exp.startsAt.includes('T') ? exp.startsAt.split('T')[1].slice(0, 5) : exp.startsAt)
                                              : '';
                                            const ends = exp.endsAt
                                              ? (exp.endsAt.includes('T') ? exp.endsAt.split('T')[1].slice(0, 5) : exp.endsAt)
                                              : '';
                                            const timeRange = starts ? (ends ? `${starts} – ${ends}` : starts) : null;

                                            return (
                                              <div key={expIdx} className="trav-itinerary-exp-card">
                                                <div className="trav-itinerary-exp-title-row">
                                                  <h4 className="trav-itinerary-exp-title">
                                                    {exp.title || 'Curated Guided Activity'}
                                                  </h4>
                                                  {exp.status && (
                                                    <span style={{
                                                      fontSize: '0.75rem',
                                                      fontWeight: 700,
                                                      textTransform: 'capitalize',
                                                      color: '#0d9488',
                                                      background: '#f0fdfa',
                                                      padding: '2px 8px',
                                                      borderRadius: '4px',
                                                      border: '1px solid #ccfbf1',
                                                    }}>
                                                      {exp.status}
                                                    </span>
                                                  )}
                                                </div>

                                                <div className="trav-itinerary-exp-meta">
                                                  <span className="trav-itinerary-exp-tag">
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                                      <circle cx="12" cy="10" r="3" />
                                                    </svg>
                                                    {exp.location || item.destination}
                                                  </span>

                                                  {timeRange && (
                                                    <span className="trav-itinerary-exp-tag">
                                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <circle cx="12" cy="12" r="10" />
                                                        <polyline points="12 6 12 12 16 14" />
                                                      </svg>
                                                      {timeRange}
                                                    </span>
                                                  )}
                                                </div>

                                                {exp.description && (
                                                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                                                    {exp.description}
                                                  </p>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', fontStyle: 'italic' }}>
                                          Free day for leisure and independent destination exploration.
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </>
                          )}

                          {/* Case B: Array Itinerary Fallback */}
                          {isArrayItin &&
                            rawItin.map((step, idx) => (
                              <div key={idx} className="trav-itinerary-day-card">
                                <div className="trav-itinerary-day-header">
                                  <div className="trav-itinerary-day-title-group">
                                    <span className="trav-itinerary-day-badge">
                                      {step.day || `Day ${idx + 1}`}
                                    </span>
                                    <h3 className="trav-itinerary-day-heading">
                                      {step.title || `Day ${idx + 1} Program`}
                                    </h3>
                                  </div>
                                </div>
                                <div className="trav-itinerary-day-body">
                                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', lineHeight: 1.6 }}>
                                    {step.detail || step.description || 'Guided activities scheduled for this day.'}
                                  </p>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </section>
            )}
          </div>

          {/* Right Column: Sticky Booking Widget Sidebar */}
          <aside className="trav-booking-box">
            <h3 style={{ margin: '0 0 16px', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              Reservation Summary
            </h3>

            {/* Price display */}
            <div className="trav-price-display" style={{ marginBottom: '20px' }}>
              <span className="trav-price-amount">{formatCurrency(startingRate)}</span>
              <span className="trav-price-unit">
                {effectiveType === 'hotel' ? '/ night' : '/ person'}
              </span>
            </div>

            {/* Interactive Search / Booking fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              {/* Date pickers */}
              {effectiveType === 'hotel' ? (
                <>
                  <div>
                    <label htmlFor="detail-checkin" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      CHECK-IN
                    </label>
                    <input
                      id="detail-checkin"
                      type="date"
                      min={todayStr}
                      value={selectedCheckIn}
                      onChange={(e) => setSelectedCheckIn(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label htmlFor="detail-checkout" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      CHECK-OUT
                    </label>
                    <input
                      id="detail-checkout"
                      type="date"
                      min={selectedCheckIn || todayStr}
                      value={selectedCheckOut}
                      onChange={(e) => setSelectedCheckOut(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label htmlFor="detail-date" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    {effectiveType === 'package' ? 'DEPARTURE DATE' : 'ACTIVITY DATE'}
                  </label>
                  <input
                    id="detail-date"
                    type="date"
                    min={todayStr}
                    value={selectedCheckIn}
                    onChange={(e) => setSelectedCheckIn(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}

              {/* Guests selector */}
              <div>
                <label htmlFor="detail-guests" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  GUESTS
                </label>
                <select
                  id="detail-guests"
                  value={selectedGuests}
                  onChange={(e) => setSelectedGuests(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                    backgroundColor: '#ffffff',
                  }}
                >
                  {guestOptions.map((n) => (
                    <option key={n} value={String(n)}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
                  ))}
                </select>
              </div>

              {/* Rooms selector (hotels & packages) */}
              {effectiveType !== 'experience' && (
                <div>
                  <label htmlFor="detail-rooms" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    ROOMS
                  </label>
                  <select
                    id="detail-rooms"
                    value={selectedRooms}
                    onChange={(e) => setSelectedRooms(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    {(roomOptions ?? Array.from({ length: 10 }, (_, i) => i + 1)).map((n) => (
                      <option key={n} value={String(n)}>{n} {n === 1 ? 'Room' : 'Rooms'}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Live Pricing Breakdown */}
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '8px', color: '#475569' }}>
                <span>
                  {formatCurrency(startingRate)} × {effectiveType === 'hotel' ? `${nights} night(s)` : `${guestCountNum} guest(s)`}
                </span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatCurrency(subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '12px', color: '#475569' }}>
                <span>Taxes & Service Fees</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatCurrency(taxes)}</span>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '8px 0 12px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                <span>Total Amount</span>
                <span style={{ color: '#0d9488' }}>{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            {isSoldOut && (
              <div
                role="alert"
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  marginBottom: '14px',
                  textAlign: 'center',
                }}
              >
                This travel package is Sold Out. Bookings are currently unavailable.
              </div>
            )}

            {bookError ? (
              <div role="alert" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '12px' }}>
                {bookError}
              </div>
            ) : null}

            {/* Clear "Book Slot" Primary CTA Button */}
            <button
              type="button"
              className={`trav-btn ${isSoldOut ? 'trav-btn-disabled' : 'trav-btn-primary'}`}
              id="btn-book-slot"
              data-testid="btn-book-slot"
              disabled={isSoldOut}
              onClick={handleBookSlot}
              style={{
                width: '100%',
                padding: '14px 20px',
                fontSize: '1.05rem',
                fontWeight: 800,
                boxSizing: 'border-box',
                textAlign: 'center',
                boxShadow: isSoldOut ? 'none' : '0 4px 14px rgba(13, 148, 136, 0.35)',
                opacity: isSoldOut ? 0.6 : 1,
                cursor: isSoldOut ? 'not-allowed' : 'pointer',
                backgroundColor: isSoldOut ? '#94a3b8' : undefined,
                borderColor: isSoldOut ? '#94a3b8' : undefined,
              }}
            >
              {isSoldOut ? 'Sold Out — Bookings Unavailable' : 'Book Slot'}
            </button>

            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                🔒 Best Price Guaranteed · Instant Confirmation
              </span>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
