import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar/navbar';
import './home.css';

export default function Partners({ user }) {
  return (
    <div className="home-container">
      <Navbar user={user} />

      <main className="home-content">
        <section className="home-hero">
          <span className="home-eyebrow">Partner Ecosystem</span>
          <h1 className="home-title">
            Grow Your Travel Business with Xploreo
          </h1>
          <p className="home-subtitle">
            Join our verified marketplace connecting certified local guides, boutique hotel owners, and independent experience creators with travelers worldwide.
          </p>

          <div className="home-cta-group">
            <Link to="/Auth/login" className="home-btn-primary">
              Sign In to Partner Portal
            </Link>
            <Link to="/Auth/register" className="home-btn-secondary">
              Register as Partner
            </Link>
          </div>
        </section>

        <section className="home-section-header">
          <span className="home-eyebrow">Who We Partner With</span>
          <h2 className="home-section-title">Dedicated Portals for Every Travel Provider</h2>
          <p className="home-section-desc">
            Xploreo provides dedicated dashboards and operational tools tailored to your business model.
          </p>
        </section>

        <div className="home-grid">
          <div className="home-card">
            <div>
              <span className="home-card-icon" aria-hidden="true">🏨</span>
              <h3 className="home-card-title">Hotels & Homestays</h3>
              <p className="home-card-desc">
                Showcase boutique accommodations, manage real-time room reservations, and receive automated booking confirmations with guaranteed payouts.
              </p>
            </div>
            <Link to="/Auth/login" className="home-card-link">
              Hotel Portal Login →
            </Link>
          </div>

          <div className="home-card">
            <div>
              <span className="home-card-icon" aria-hidden="true">🗺️</span>
              <h3 className="home-card-title">Local Tour Guides</h3>
              <p className="home-card-desc">
                Set your own availability schedule, lead private or group heritage tours, and manage traveller reviews through your dedicated guide dashboard.
              </p>
            </div>
            <Link to="/Auth/login" className="home-card-link">
              Guide Portal Login →
            </Link>
          </div>

          <div className="home-card">
            <div>
              <span className="home-card-icon" aria-hidden="true">🎭</span>
              <h3 className="home-card-title">Experience Hosts</h3>
              <p className="home-card-desc">
                Publish unique culinary workshops, adventure sports, and cultural immersions with transparent commission terms and verified attendees.
              </p>
            </div>
            <Link to="/Auth/login" className="home-card-link">
              Experience Host Login →
            </Link>
          </div>
        </div>

        <section className="home-banner">
          <div className="home-banner-text">
            <h3>Already a Registered Partner?</h3>
            <p>
              Sign in with your partner credentials to manage your listings, view upcoming reservations, and track your business earnings.
            </p>
          </div>
          <Link to="/Auth/login" className="home-btn-primary">
            Partner Sign In
          </Link>
        </section>
      </main>
    </div>
  );
}