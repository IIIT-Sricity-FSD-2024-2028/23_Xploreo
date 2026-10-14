import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar/navbar';
import './home.css';

export default function Support({ user }) {
  const isTraveller = user?.role === 'traveller';

  return (
    <div className="home-container">
      <Navbar user={user} />

      <main className="home-content">
        <section className="home-hero">
          <span className="home-eyebrow">Customer Care & Assistance</span>
          <h1 className="home-title">
            We’re Here to Help Every Step of the Way
          </h1>
          <p className="home-subtitle">
            Need help with a booking, have questions about your itinerary, or looking for partner onboarding assistance? Our support team is ready to assist you.
          </p>

          <div className="home-cta-group">
            {isTraveller ? (
              <Link to="/Traveller/tickets" className="home-btn-primary">
                Open Support Ticket →
              </Link>
            ) : (
              <Link to="/Auth/login" className="home-btn-primary">
                Sign In to Open a Ticket →
              </Link>
            )}
            <Link to="/Home/partners" className="home-btn-secondary">
              Partner Inquiries
            </Link>
          </div>
        </section>

        <section className="home-section-header">
          <span className="home-eyebrow">Frequently Asked Questions</span>
          <h2 className="home-section-title">Common Questions & Guidance</h2>
          <p className="home-section-desc">
            Quick answers to common questions about reservations, guide verification, and live tracking.
          </p>
        </section>

        <div className="home-faq-list">
          <div className="home-faq-item">
            <h4>How do I track my active trip and guide location?</h4>
            <p>
              Once your booking is confirmed, navigate to your <strong>My Trips</strong> view from the Traveller Dashboard. Each active trip includes a live tracking pulse widget that polls progress and updates stops automatically.
            </p>
          </div>

          <div className="home-faq-item">
            <h4>How are local guides vetted and assigned?</h4>
            <p>
              Every guide on Xploreo undergoes credential verification and regional knowledge checks. When booking a package or guided excursion, your assigned guide’s details and verified profile are displayed in your booking confirmation.
            </p>
          </div>

          <div className="home-faq-item">
            <h4>Can I submit reviews for hotels, guides, and experiences?</h4>
            <p>
              Yes! Travelers can submit ratings and written feedback directly through the <strong>Reviews</strong> section. Your ratings help maintain high service standards across the entire marketplace.
            </p>
          </div>

          <div className="home-faq-item">
            <h4>What should I do if I need urgent booking modifications?</h4>
            <p>
              Signed-in travelers can submit a high-priority support ticket directly through the portal, and our support desk will respond promptly.
            </p>
          </div>
        </div>

        <section className="home-banner">
          <div className="home-banner-text">
            <h3>Need Dedicated Help with Your Trip?</h3>
            <p>
              Registered travelers can open priority support tickets directly from the dashboard for instant tracking and resolution.
            </p>
          </div>
          {isTraveller ? (
            <Link to="/Traveller/tickets" className="home-btn-primary">
              Create Support Ticket
            </Link>
          ) : (
            <Link to="/Auth/login" className="home-btn-primary">
              Sign In to Get Help
            </Link>
          )}
        </section>
      </main>
    </div>
  );
}