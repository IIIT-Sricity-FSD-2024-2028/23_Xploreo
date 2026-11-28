import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, Link } from 'react-router-dom';
import { fetchBrowseItemDetail, selectBrowseDetail } from '@/store/traveller/index.js';
import TravellerHeader from './TravellerHeader.jsx';
import './travellerDetail.css';

export default function HotelDetailPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const detail = useSelector(selectBrowseDetail);

  const expectedKey = `hotel:${id}`;
  const isCurrent = detail.key === expectedKey;
  const hotel = isCurrent ? detail.item : null;
  const rooms = isCurrent ? detail.rooms : [];
  const reviews = isCurrent ? detail.reviews : [];
  const loading = isCurrent ? detail.loading : Boolean(id && id.trim() !== '');
  const error = !id || id.trim() === ''
    ? { status: 400, message: 'Invalid hotel identifier provided.' }
    : (isCurrent ? detail.error : null);

  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const loadHotelData = useCallback(() => {
    if (!id || id.trim() === '') return;
    dispatch(fetchBrowseItemDetail({ type: 'hotel', id }));
  }, [dispatch, id]);

  useEffect(() => {
    loadHotelData();
  }, [loadHotelData]);

  // 1. Loading State
  if (loading) {
    return (
      <div className="trav-page-container">
        <TravellerHeader title="Hotel Details" />
        <main className="trav-main">
          <div className="trav-loading-card">
            <div className="trav-spinner" />
            <h2 className="trav-loading-title">Loading Hotel Details...</h2>
            <p className="trav-loading-subtitle">Fetching properties, room types, and verified guest reviews.</p>
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
            <h2 className="trav-forbidden-title">Property Access Restricted</h2>
            <p className="trav-forbidden-desc">
              {error.message || 'You do not have permission to view this property or it is restricted to another region.'}
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
        <TravellerHeader title="Error Loading Hotel" />
        <main className="trav-main">
          <div className="trav-error-state">
            <span className="trav-error-icon">⚠️</span>
            <h2 className="trav-error-title">Unable to Load Hotel</h2>
            <p className="trav-error-desc">{error.message}</p>
            <button type="button" onClick={loadHotelData} className="trav-btn trav-btn-primary">
              Try Again
            </button>
          </div>
        </main>
      </div>
    );
  }

  // 2. Empty State
  if (!hotel) {
    return (
      <div className="trav-page-container">
        <TravellerHeader title="Hotel Not Found" />
        <main className="trav-main">
          <div className="trav-empty-state">
            <span className="trav-empty-icon">🏨</span>
            <h2 className="trav-empty-title">Hotel Not Found</h2>
            <p className="trav-empty-desc">
              The property you are looking for does not exist, has been archived, or is currently unavailable.
            </p>
            <Link to="/hotels" className="trav-btn trav-btn-primary">
              Browse Other Hotels
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Prepare images list
  const photos = hotel.images && hotel.images.length > 0
    ? hotel.images
    : [hotel.image || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80'];

  const mainPhoto = selectedPhoto || photos[0];
  const sidePhotos = photos.slice(1, 3);

  const amenities = Array.isArray(hotel.amenities)
    ? hotel.amenities
    : ['Free High-Speed Wi-Fi', 'Swimming Pool', 'Air Conditioning', 'Multi-cuisine Dining', '24/7 Front Desk'];

  return (
    <div className="trav-page-container">
      <TravellerHeader title={hotel.name} backTo="/hotels" backLabel="All Hotels" />

      <main className="trav-main">
        {/* Detail Header */}
        <div className="trav-detail-header">
          <div className="trav-detail-topline">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span className="trav-badge trav-badge-success">{hotel.status || 'Active'}</span>
                <div className="trav-rating-stars">
                  {'★'.repeat(Math.min(5, Math.max(1, hotel.stars || 4)))}
                  <span style={{ color: 'var(--trav-text-dark)', marginLeft: '4px' }}>
                    {hotel.stars || 4}-Star Hotel
                  </span>
                </div>
              </div>
              <h1 className="trav-detail-title">{hotel.name}</h1>
              <div className="trav-detail-location">
                <span>📍</span>
                <span>{hotel.location || hotel.city || 'Goa, India'}</span>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div className="trav-price-display" style={{ marginBottom: 0 }}>
                <span className="trav-price-amount">₹{hotel.pricePerNight?.toLocaleString('en-IN') || '4,500'}</span>
                <span className="trav-price-unit">/ night</span>
              </div>
              <span style={{ fontSize: '0.85rem', color: 'var(--trav-text-light)' }}>
                + ₹{hotel.taxesAndFees || 0} taxes & fees
              </span>
            </div>
          </div>
        </div>

        {/* Photo Gallery Grid */}
        <section className="trav-gallery-grid" aria-label="Hotel Photo Gallery">
          <img
            src={mainPhoto}
            alt={hotel.name}
            className="trav-gallery-main"
          />
          <div className="trav-gallery-side">
            {sidePhotos.length > 0 ? (
              sidePhotos.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`${hotel.name} view ${idx + 2}`}
                  className="trav-gallery-thumb"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedPhoto(img)}
                />
              ))
            ) : (
              <>
                <img
                  src="https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80"
                  alt="Interior room"
                  className="trav-gallery-thumb"
                />
                <img
                  src="https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=600&q=80"
                  alt="Hotel pool"
                  className="trav-gallery-thumb"
                />
              </>
            )}
          </div>
        </section>

        {/* Content & Sidebar Grid */}
        <div className="trav-grid-layout">
          <div>
            {/* Overview Section */}
            <section className="trav-card">
              <h2 className="trav-card-title">About this property</h2>
              <p className="trav-card-desc">
                {hotel.description ||
                  'Experience tranquil luxury and world-class hospitality. Located in prime surroundings with panoramic views, spacious suites, and premium amenities crafted for your comfort.'}
              </p>

              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '20px 0 12px' }}>
                Property Amenities
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {amenities.map((item, idx) => (
                  <span key={idx} className="trav-chip">
                    ✓ {item}
                  </span>
                ))}
              </div>
            </section>

            {/* Room Types Section */}
            <section className="trav-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 className="trav-card-title" style={{ margin: 0 }}>Available Room Types</h2>
                <span className="trav-badge trav-badge-primary">
                  {rooms.length} {rooms.length === 1 ? 'Option' : 'Options'}
                </span>
              </div>

              {rooms.length === 0 ? (
                <div className="trav-empty-state" style={{ padding: '32px 20px', margin: 0 }}>
                  <p style={{ margin: 0, color: 'var(--trav-text-muted)' }}>
                    No specific room categories currently listed. Please contact the front desk or book directly.
                  </p>
                </div>
              ) : (
                rooms.map((room) => {
                  const roomImg = room.images?.[0] || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80';
                  const availableCount = room.availableRooms ?? room.totalRooms ?? 3;
                  const isSoldOut = availableCount <= 0;

                  return (
                    <article key={room.id} className="trav-room-card">
                      <img src={roomImg} alt={room.type} className="trav-room-card-img" />
                      <div className="trav-room-card-body">
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h3 style={{ margin: '0 0 6px', fontSize: '1.2rem', fontWeight: 700 }}>
                              {room.type}
                            </h3>
                            <span className={`trav-badge ${isSoldOut ? 'trav-badge-warning' : 'trav-badge-success'}`}>
                              {isSoldOut ? 'Sold Out' : `${availableCount} left`}
                            </span>
                          </div>
                          <p style={{ margin: '0 0 10px', fontSize: '0.9rem', color: 'var(--trav-text-muted)' }}>
                            {room.description || 'Spacious room with modern styling, en-suite bathroom, and premium bedding.'}
                          </p>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <span className="trav-chip" style={{ fontSize: '0.8rem' }}>
                              👥 Up to {room.maxOccupancy || 2} Guests
                            </span>
                            {(room.amenities || []).slice(0, 3).map((a, i) => (
                              <span key={i} className="trav-chip" style={{ fontSize: '0.8rem' }}>
                                {a}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--trav-border)' }}>
                          <div>
                            <span style={{ fontSize: '1.35rem', fontWeight: 800 }}>
                              ₹{room.pricePerNight?.toLocaleString('en-IN') || hotel.pricePerNight?.toLocaleString('en-IN')}
                            </span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--trav-text-muted)', marginLeft: '4px' }}>
                              / night
                            </span>
                          </div>

                          <Link
                            to={`/hotels/${id}/rooms/${room.id}`}
                            className={`trav-btn ${isSoldOut ? 'trav-btn-secondary' : 'trav-btn-primary'}`}
                            style={{ padding: '8px 18px', fontSize: '0.9rem' }}
                          >
                            {isSoldOut ? 'View Details' : 'Book Room →'}
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </section>

            {/* Guest Reviews Section */}
            <section className="trav-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h2 className="trav-card-title" style={{ margin: 0 }}>Guest Reviews & Ratings</h2>
                  <span style={{ fontSize: '0.9rem', color: 'var(--trav-text-muted)' }}>
                    {reviews.length} Verified Traveller {reviews.length === 1 ? 'Review' : 'Reviews'}
                  </span>
                </div>
                <Link
                  to={`/reviews/new?targetType=hotel&targetId=${id}&targetName=${encodeURIComponent(hotel.name)}`}
                  className="trav-btn trav-btn-outline"
                  style={{ padding: '8px 16px', fontSize: '0.88rem' }}
                >
                  ✍️ Write a Review
                </Link>
              </div>

              {reviews.length === 0 ? (
                <div className="trav-empty-state" style={{ padding: '32px 20px', margin: 0 }}>
                  <p style={{ margin: 0, color: 'var(--trav-text-muted)' }}>
                    No reviews written yet. Be the first to share your experience staying at this hotel!
                  </p>
                </div>
              ) : (
                reviews.map((rev) => (
                  <div key={rev.id} className="trav-review-card">
                    <div className="trav-review-header">
                      <div>
                        <span className="trav-reviewer-name">{rev.authorName || rev.guestName || 'Verified Guest'}</span>
                        <div className="trav-rating-stars" style={{ marginTop: '2px' }}>
                          {'★'.repeat(Math.min(5, Math.max(1, rev.rating || 5)))}
                        </div>
                      </div>
                      <span className="trav-review-date">
                        {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : 'Recent Stay'}
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

          {/* Quick Booking Sidebar */}
          <aside className="trav-booking-box">
            <h3 style={{ margin: '0 0 14px', fontSize: '1.25rem', fontWeight: 800 }}>
              Reserve Your Stay
            </h3>
            <div className="trav-price-display">
              <span className="trav-price-amount">₹{hotel.pricePerNight?.toLocaleString('en-IN') || '4,500'}</span>
              <span className="trav-price-unit">/ night base rate</span>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: 'var(--trav-radius-md)', marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '6px' }}>
                <span style={{ color: 'var(--trav-text-muted)' }}>Check-in:</span>
                <strong>12:00 PM</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--trav-text-muted)' }}>Check-out:</span>
                <strong>11:00 AM</strong>
              </div>
            </div>

            {rooms.length > 0 ? (
              <Link
                to={`/hotels/${id}/rooms/${rooms[0].id}`}
                className="trav-btn trav-btn-primary"
                style={{ width: '100%', boxSizing: 'border-box', textAlign: 'center' }}
              >
                Select Room & Book Now
              </Link>
            ) : (
              <button disabled className="trav-btn trav-btn-secondary" style={{ width: '100%' }}>
                No Rooms Available
              </button>
            )}

            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--trav-text-muted)' }}>
                🔒 Best Price Guaranteed · Instant Confirmation
              </span>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
