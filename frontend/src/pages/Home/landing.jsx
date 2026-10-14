import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar/navbar';
import './home.css';

export default function Landing({ user }) {
  const isTraveller = user?.role === 'traveller';
  const isLoggedIn = Boolean(user?.role && user.role !== 'default');

  return (
    <div className="home-container">
      <Navbar user={user} />

      <main className="home-content">
        <section className="home-hero">
          <span className="home-eyebrow">Smart Travel Marketplace</span>
          <h1 className="home-title">
            Curated Journeys, Verified Local Hosts & Authentic Stays
          </h1>
          <p className="home-subtitle">
            Xploreo connects curious travelers directly with certified local guides, boutique hotel partners, and one-of-a-kind cultural experiences across premier destinations.
          </p>

          <div className="home-cta-group">
            {isTraveller ? (
              <Link to="/Traveller/dashboard" className="home-btn-primary">
                Open Traveller Dashboard →
              </Link>
            ) : isLoggedIn ? (
              <Link to="/Auth/login" className="home-btn-primary">
                Access Dashboard →
              </Link>
            ) : (
              <Link to="/Auth/login" className="home-btn-primary">
                Sign In to Xploreo
              </Link>
            )}
            <Link to="/Traveller/browse" className="home-btn-secondary">
              Explore Experiences
            </Link>
          </div>
        </section>

        <section className="home-stats-strip" aria-label="Platform Statistics">
          <div className="home-stat-item">
            <h3>500+</h3>
            <p>Curated Experiences</p>
          </div>
          <div className="home-stat-item">
            <h3>120+</h3>
            <p>Verified Partners</p>
          </div>
          <div className="home-stat-item">
            <h3>4.9★</h3>
            <p>Traveler Rating</p>
          </div>
          <div className="home-stat-item">
            <h3>100%</h3>
            <p>Verified Bookings</p>
          </div>
        </section>

        <section className="home-section-header">
          <span className="home-eyebrow">Why Travel with Xploreo</span>
          <h2 className="home-section-title">A Unified Ecosystem for Authentic Travel</h2>
          <p className="home-section-desc">
            Everything you need for seamless exploration—from guided heritage excursions to boutique accommodations and live trip tracking.
          </p>
        </section>

        <div className="home-grid">
          <div className="home-card">
            <div>
              <span className="home-card-icon" aria-hidden="true">🧭</span>
              <h3 className="home-card-title">Certified Local Guides</h3>
              <p className="home-card-desc">
                Engage with licensed storytellers and experts vetted for local depth, multilingual fluency, and safety standards.
              </p>
            </div>
            <Link to="/Traveller/browse" className="home-card-link">
              Find Local Guides →
            </Link>
          </div>

          <div className="home-card">
            <div>
              <span className="home-card-icon" aria-hidden="true">🏨</span>
              <h3 className="home-card-title">Boutique Stays & Hotels</h3>
              <p className="home-card-desc">
                Rest easy at vetted heritage havelis, eco-resorts, and scenic villas selected for character and hospitality.
              </p>
            </div>
            <Link to="/Traveller/browse" className="home-card-link">
              Discover Stays →
            </Link>
          </div>

          <div className="home-card">
            <div>
              <span className="home-card-icon" aria-hidden="true">🛶</span>
              <h3 className="home-card-title">Immersive Experiences</h3>
              <p className="home-card-desc">
                From backwater kayak expeditions to private culinary walks, unlock experiences curated by native hosts.
              </p>
            </div>
            <Link to="/Home/tours" className="home-card-link">
              View Excursions →
            </Link>
          </div>
        </div>

        <section className="home-banner">
          <div className="home-banner-text">
            <h3>Ready to Begin Your Next Adventure?</h3>
            <p>
              Join thousands of travelers exploring India’s heritage and culture with real-time tracking, transparent booking, and dedicated support.
            </p>
          </div>
          <Link to="/Auth/login" className="home-btn-primary">
            Get Started Now
          </Link>
        </section>
      </main>
    </div>
  );
}