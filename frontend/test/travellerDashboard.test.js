import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderDashboard } from './dist-test/checkoutTestBundleEntry.js';

describe('Day 6A Traveller Dashboard Shell UI Tests', () => {
  const sampleBookings = [
    { id: 'b1', title: 'Hotel booking' },
    { id: 'b2', title: 'Experience booking' },
  ];
  const sampleTrips = [
    { id: 't1', title: 'Kerala Trip' },
  ];
  const sampleReviews = [
    { id: 1, rating: 5, comment: 'Great experience' },
    { id: 2, rating: 4, comment: 'Clean rooms' },
    { id: 3, rating: 5, comment: 'Awesome guide' },
  ];

  describe('Header and Greeting', () => {
    it('renders default traveller ID and avatar initials', () => {
      const html = renderDashboard({});
      assert.ok(html.includes('Welcome back, Traveller'));
      assert.ok(html.includes('trav-usr-20001'));
      assert.ok(html.includes('TR')); // Avatar initials for trav-usr-20001
      assert.ok(html.includes('data-testid="traveller-dashboard"'));
    });

    it('renders custom traveller identity and initials when provided', () => {
      const html = renderDashboard({ currentTravellerId: 'usr-99001' });
      assert.ok(html.includes('usr-99001'));
      assert.ok(html.includes('US'));
    });
  });

  describe('Stat Row', () => {
    it('renders zero counts when data arrays are empty or omitted', () => {
      const html = renderDashboard({});
      assert.ok(html.includes('<span class="trav-dash-stat-value">0</span>'));
      assert.ok(html.includes('Bookings'));
      assert.ok(html.includes('Trips'));
      assert.ok(html.includes('Reviews'));
    });

    it('renders accurate counts for populated fixture lists', () => {
      const html = renderDashboard({
        bookings: sampleBookings,
        trips: sampleTrips,
        reviews: sampleReviews,
      });
      assert.ok(html.includes('<span class="trav-dash-stat-value">2</span>'));
      assert.ok(html.includes('<span class="trav-dash-stat-value">1</span>'));
      assert.ok(html.includes('<span class="trav-dash-stat-value">3</span>'));
    });
  });

  describe('Navigation Grid & Card States', () => {
    it('renders all primary M5 feature navigation cards', () => {
      const html = renderDashboard({});
      assert.ok(html.includes('data-testid="dashboard-nav-browse"'));
      assert.ok(html.includes('data-testid="dashboard-nav-bookings"'));
      assert.ok(html.includes('data-testid="dashboard-nav-trips"'));
      assert.ok(html.includes('data-testid="dashboard-nav-reviews"'));
      assert.ok(html.includes('data-testid="dashboard-nav-tickets"'));
    });

    it('enables Support Tickets navigation card for Day 6B', () => {
      const html = renderDashboard({});
      assert.ok(html.includes('data-testid="dashboard-nav-tickets"'));
      assert.ok(!html.includes('trav-dash-card--disabled'));
      assert.ok(!html.includes('Coming soon'));
    });

    it('renders accessible labels and informational strip', () => {
      const html = renderDashboard({});
      assert.ok(html.includes('aria-label="Traveller sections"'));
      assert.ok(html.includes('trav-dash-info-strip'));
      assert.ok(html.includes('uses fixture data'));
    });
  });
});
