import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import {
  ProtectedRoute,
  renderWithRouter,
} from './dist-test/checkoutTestBundleEntry.js';

describe('Stage 2: Authentication and Traveller Route Integration Tests', () => {
  describe('ProtectedRoute Behavior & RBAC', () => {
    function createProtectedHarness(props, childContent = 'PROTECTED_CONTENT') {
      return React.createElement(
        ProtectedRoute,
        props,
        React.createElement('div', { 'data-testid': 'protected-child' }, childContent)
      );
    }

    it('grants access when user role matches allowedRoles', () => {
      const html = renderWithRouter(
        createProtectedHarness({
          allowedRoles: ['traveller'],
          user: { userId: 'trav-101', role: 'traveller' },
        })
      );
      assert.ok(html.includes('data-testid="protected-child"'));
      assert.ok(html.includes('PROTECTED_CONTENT'));
    });

    it('redirects unauthenticated guest (role: default) to /Auth/login without crashing', () => {
      const html = renderWithRouter(
        createProtectedHarness({
          allowedRoles: ['traveller'],
          user: { username: 'Guest', role: 'default' },
        })
      );
      // Protected child must NOT be rendered
      assert.ok(!html.includes('PROTECTED_CONTENT'));
      assert.ok(!html.includes('data-testid="protected-child"'));
    });

    it('handles null or undefined user gracefully and redirects to /Auth/login', () => {
      const htmlNull = renderWithRouter(
        createProtectedHarness({
          allowedRoles: ['traveller'],
          user: null,
        })
      );
      assert.ok(!htmlNull.includes('PROTECTED_CONTENT'));

      const htmlUndefined = renderWithRouter(
        createProtectedHarness({
          allowedRoles: ['traveller'],
          user: undefined,
        })
      );
      assert.ok(!htmlUndefined.includes('PROTECTED_CONTENT'));

      const htmlEmpty = renderWithRouter(
        createProtectedHarness({
          allowedRoles: ['traveller'],
          user: {},
        })
      );
      assert.ok(!htmlEmpty.includes('PROTECTED_CONTENT'));
    });

    it('redirects authenticated user with wrong role to valid fallback (not dead route)', () => {
      // Guide user attempting to access traveller page
      const html = renderWithRouter(
        createProtectedHarness({
          allowedRoles: ['traveller'],
          user: { userId: 'guide-99', role: 'guide' },
        })
      );
      assert.ok(!html.includes('PROTECTED_CONTENT'));
      assert.ok(!html.includes('data-testid="protected-child"'));
    });

    it('preserves existing partner role checks (guide, hotel, experience)', () => {
      const guideHtml = renderWithRouter(
        createProtectedHarness({
          allowedRoles: ['guide'],
          user: { userId: 'g-1', role: 'guide' },
        })
      );
      assert.ok(guideHtml.includes('PROTECTED_CONTENT'));

      const hotelHtml = renderWithRouter(
        createProtectedHarness({
          allowedRoles: ['hotel'],
          user: { userId: 'h-1', role: 'hotel' },
        })
      );
      assert.ok(hotelHtml.includes('PROTECTED_CONTENT'));

      const expHtml = renderWithRouter(
        createProtectedHarness({
          allowedRoles: ['experience'],
          user: { userId: 'e-1', role: 'experience' },
        })
      );
      assert.ok(expHtml.includes('PROTECTED_CONTENT'));
    });
  });

  describe('Traveller Route Declarations in App.jsx', () => {
    const appPath = path.resolve('src/App.jsx');
    const appSource = fs.readFileSync(appPath, 'utf8');

    it('registers all required M5 Traveller routes', () => {
      assert.ok(
        appSource.includes('path="/Traveller/dashboard"'),
        'Missing /Traveller/dashboard route'
      );
      assert.ok(
        appSource.includes('path="/Traveller/browse"'),
        'Missing /Traveller/browse route'
      );
      assert.ok(
        appSource.includes('path="/Traveller/bookings"'),
        'Missing /Traveller/bookings route'
      );
      assert.ok(
        appSource.includes('path="/Traveller/trips"'),
        'Missing /Traveller/trips route'
      );
      assert.ok(
        appSource.includes('path="/Traveller/reviews"'),
        'Missing /Traveller/reviews route'
      );
      assert.ok(
        appSource.includes('path="/Traveller/tickets"'),
        'Missing /Traveller/tickets route'
      );
    });

    it('protects Traveller routes under allowedRoles={[\'traveller\']}', () => {
      assert.ok(
        appSource.includes("allowedRoles={['traveller']}") ||
          appSource.includes('allowedRoles={["traveller"]}'),
        'Traveller routes must be wrapped with ProtectedRoute allowedRoles traveller'
      );
    });

    it('preserves existing guide, hotel, and experience protected routes', () => {
      assert.ok(
        appSource.includes("allowedRoles={['guide']}") ||
          appSource.includes('allowedRoles={["guide"]}')
      );
      assert.ok(
        appSource.includes("allowedRoles={['hotel']}") ||
          appSource.includes('allowedRoles={["hotel"]}')
      );
      assert.ok(
        appSource.includes("allowedRoles={['experience']}") ||
          appSource.includes('allowedRoles={["experience"]}')
      );
      assert.ok(appSource.includes('path="/Guide/dashboard"'));
      assert.ok(appSource.includes('path="/Hotel/bookings"'));
      assert.ok(appSource.includes('path="/Experience/dashboard"'));
    });

    it('preserves public home and authentication routes', () => {
      assert.ok(appSource.includes('path="/"'));
      assert.ok(appSource.includes('path="/Home/partners"'));
      assert.ok(appSource.includes('path="/Home/tours"'));
      assert.ok(appSource.includes('path="/Home/support"'));
      assert.ok(appSource.includes('path="/Auth/login"'));
      assert.ok(appSource.includes('path="/Auth/register"'));
    });
  });

  describe('Post-Login Navigation Destination', () => {
    const loginPath = path.resolve('src/pages/Auth/login.jsx');
    const loginSource = fs.readFileSync(loginPath, 'utf8');

    it('maps traveller role directly to /Traveller/dashboard', () => {
      assert.ok(
        loginSource.includes("traveller: '/Traveller/dashboard'") ||
          loginSource.includes('traveller: "/Traveller/dashboard"'),
        'Login must route traveller to /Traveller/dashboard'
      );
    });

    it('preserves partner role destinations', () => {
      assert.ok(loginSource.includes('/Guide/dashboard'));
      assert.ok(loginSource.includes('/Hotel/bookings'));
      assert.ok(loginSource.includes('/Experience/dashboard'));
    });
  });
});
