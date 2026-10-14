import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Audit Fixes: Shared Navbar & Public Pages Verification', () => {
  const navbarPath = path.resolve('src/components/Navbar/navbar.jsx');
  const navbarCssPath = path.resolve('src/components/Navbar/navbar.css');
  const landingPath = path.resolve('src/pages/Home/landing.jsx');
  const partnersPath = path.resolve('src/pages/Home/partners.jsx');
  const toursPath = path.resolve('src/pages/Home/tours.jsx');
  const supportPath = path.resolve('src/pages/Home/support.jsx');
  const homeCssPath = path.resolve('src/pages/Home/home.css');

  const navbarSource = fs.readFileSync(navbarPath, 'utf8');
  const navbarCss = fs.readFileSync(navbarCssPath, 'utf8');
  const landingSource = fs.readFileSync(landingPath, 'utf8');
  const partnersSource = fs.readFileSync(partnersPath, 'utf8');
  const toursSource = fs.readFileSync(toursPath, 'utf8');
  const supportSource = fs.readFileSync(supportPath, 'utf8');
  const homeCss = fs.readFileSync(homeCssPath, 'utf8');

  describe('Fix 1 — Shared Navbar Dynamic Role & Public State Handling', () => {
    it('removes hardcoded Experience role identity', () => {
      assert.ok(
        !navbarSource.includes('role : "experience"') &&
          !navbarSource.includes("role: 'experience'") &&
          !navbarSource.includes('role: "experience"'),
        'Navbar must not have hardcoded role: "experience"'
      );
      assert.ok(
        !navbarSource.includes('username : "Default User"'),
        'Navbar must not hardcode Default User'
      );
    });

    it('accepts user prop and falls back to xploreoUser localStorage entry', () => {
      assert.ok(
        navbarSource.includes('propUser') || navbarSource.includes('user'),
        'Navbar must accept user prop'
      );
      assert.ok(
        navbarSource.includes("localStorage.getItem('xploreoUser')") ||
          navbarSource.includes('localStorage.getItem("xploreoUser")'),
        'Navbar must check localStorage xploreoUser for session state'
      );
    });

    it('renders clean public/guest links when role is default or unauthenticated', () => {
      assert.ok(
        navbarSource.includes('role === "default"') || navbarSource.includes("role === 'default'"),
        'Navbar must handle default role'
      );
      assert.ok(navbarSource.includes('to="/"') || navbarSource.includes('to = "/"'));
      assert.ok(navbarSource.includes('/Home/partners'));
      assert.ok(navbarSource.includes('/Home/tours'));
      assert.ok(navbarSource.includes('/Home/support'));
      assert.ok(navbarSource.includes('/Auth/login'));
    });

    it('preserves existing partner role navigation (guide, hotel, experience)', () => {
      assert.ok(navbarSource.includes('role === "guide"'));
      assert.ok(navbarSource.includes('role === "hotel"'));
      assert.ok(navbarSource.includes('role === "experience"'));
      assert.ok(navbarSource.includes('role === "superadmin"'));
      assert.ok(navbarSource.includes('/Guide/dashboard'));
      assert.ok(navbarSource.includes('/Hotel/bookings'));
      assert.ok(navbarSource.includes('/Experience/dashboard'));
    });

    it('includes responsive mobile styling in navbar.css without overlapping logo', () => {
      assert.ok(navbarCss.includes('@media (max-width: 768px)'));
      assert.ok(navbarCss.includes('position: static'));
    });
  });

  describe('Fix 2 — Replace Invalid Traveller Navbar Links', () => {
    it('removes obsolete /Traveller/wishlist and /Traveller/mytrips links', () => {
      assert.ok(
        !navbarSource.includes('/Traveller/wishlist'),
        'Must remove obsolete /Traveller/wishlist route'
      );
      assert.ok(
        !navbarSource.includes('/Traveller/mytrips'),
        'Must remove obsolete /Traveller/mytrips route'
      );
    });

    it('renders valid implemented Traveller destinations in navbar', () => {
      assert.ok(
        navbarSource.includes('/Traveller/dashboard'),
        'Must include /Traveller/dashboard'
      );
      assert.ok(
        navbarSource.includes('/Traveller/browse'),
        'Must include /Traveller/browse'
      );
      assert.ok(
        navbarSource.includes('/Traveller/bookings'),
        'Must include /Traveller/bookings'
      );
      assert.ok(
        navbarSource.includes('/Traveller/trips'),
        'Must include /Traveller/trips'
      );
    });
  });

  describe('Fix 3 — Public Pages Content & Layout', () => {
    it('landing page renders headline, value proposition, and primary/secondary CTAs', () => {
      assert.ok(landingSource.includes('Navbar user={user}'));
      assert.ok(landingSource.includes('/Auth/login') || landingSource.includes('/Traveller/dashboard'));
      assert.ok(landingSource.includes('/Traveller/browse'));
      assert.ok(landingSource.includes('Curated Journeys'));
    });

    it('partners page explains partner ecosystem and links to auth flow', () => {
      assert.ok(partnersSource.includes('Navbar user={user}'));
      assert.ok(partnersSource.includes('/Auth/login'));
      assert.ok(partnersSource.includes('/Auth/register'));
      assert.ok(partnersSource.includes('Hotels') || partnersSource.includes('Homestays'));
      assert.ok(partnersSource.includes('Local Tour Guides'));
      assert.ok(partnersSource.includes('Experience Hosts'));
    });

    it('tours page provides introduction and links to implemented browse experience', () => {
      assert.ok(toursSource.includes('Navbar user={user}'));
      assert.ok(toursSource.includes('/Traveller/browse'));
      assert.ok(toursSource.includes('Heritage') || toursSource.includes('Tours'));
    });

    it('support page provides helpful FAQ guidance and links to ticket or auth flow without fake APIs', () => {
      assert.ok(supportSource.includes('Navbar user={user}'));
      assert.ok(supportSource.includes('/Traveller/tickets'));
      assert.ok(supportSource.includes('/Auth/login'));
      assert.ok(supportSource.includes('Frequently Asked Questions'));
    });

    it('home.css provides responsive cards, hero, and banner styling', () => {
      assert.ok(homeCss.includes('.home-container'));
      assert.ok(homeCss.includes('.home-hero'));
      assert.ok(homeCss.includes('.home-card'));
      assert.ok(homeCss.includes('.home-btn-primary'));
      assert.ok(homeCss.includes('.home-btn-secondary'));
    });
  });
});
