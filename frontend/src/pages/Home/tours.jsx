import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar/navbar';
import './home.css';

export default function Tours({ user }) {
  return (
    <div className="home-container">
      <Navbar user={user} />

      <main className="home-content">
        <section className="home-hero">
          <span className="home-eyebrow">Curated Excursions</span>
          <h1 className="home-title">
            Unforgettable Tours Led by Verified Local Guides
          </h1>
          <p className="home-subtitle">
            Immerse yourself in authentic cultural heritage walks, wildlife safaris, and scenic expeditions handpicked for safety, depth, and memorable moments.
          </p>

          <div className="home-cta-group">
            <Link to="/Traveller/browse" className="home-btn-primary">
              Browse All Experiences →
            </Link>
            <Link to="/Auth/login" className="home-btn-secondary">
              Sign In to Book
            </Link>
          </div>
        </section>

        <section className="home-section-header">
          <span className="home-eyebrow">Tour Collections</span>
          <h2 className="home-section-title">Explore by Experience Type</h2>
          <p className="home-section-desc">
            Discover hand-crafted itineraries curated across India's most captivating travel regions.
          </p>
        </section>

        <div className="home-grid">
          <div className="home-card">
            <div>
              <span className="home-card-icon" aria-hidden="true">🏛️</span>
              <h3 className="home-card-title">Cultural & Heritage Trails</h3>
              <p className="home-card-desc">
                Walk through ancient architecture, temple corridors, and historic fortress complexes with licensed local historians.
              </p>
            </div>
            <Link to="/Traveller/browse" className="home-card-link">
              Explore Heritage Tours →
            </Link>
          </div>

          <div className="home-card">
            <div>
              <span className="home-card-icon" aria-hidden="true">🍲</span>
              <h3 className="home-card-title">Culinary & Spice Expeditions</h3>
              <p className="home-card-desc">
                Taste authentic street foods, visit organic spice plantations, and learn age-old recipes in masterclasses with native home cooks.
              </p>
            </div>
            <Link to="/Traveller/browse" className="home-card-link">
              Explore Food Tours →
            </Link>
          </div>

          <div className="home-card">
            <div>
              <span className="home-card-icon" aria-hidden="true">🌿</span>
              <h3 className="home-card-title">Nature & Eco-Adventures</h3>
              <p className="home-card-desc">
                Paddle peaceful backwater lagoons, trek through lush Western Ghats trails, and observe wildlife in ethical sanctuaries.
              </p>
            </div>
            <Link to="/Traveller/browse" className="home-card-link">
              Explore Eco Tours →
            </Link>
          </div>
        </div>

        <section className="home-banner">
          <div className="home-banner-text">
            <h3>Find Your Perfect Tour Package</h3>
            <p>
              Our discovery catalog includes detailed itineraries, guide assignments, transparent pricing, and instant checkout.
            </p>
          </div>
          <Link to="/Traveller/browse" className="home-btn-primary">
            Open Browse Catalog
          </Link>
        </section>
      </main>
    </div>
  );
}