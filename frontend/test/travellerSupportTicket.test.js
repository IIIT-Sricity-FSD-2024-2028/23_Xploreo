import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  renderSupportTicketForm,
  renderDashboard,
  validateTicketPayload,
  TICKET_PRIORITIES,
} from './dist-test/checkoutTestBundleEntry.js';

describe('Day 6B Traveller Support Ticket Submission Tests', () => {
  describe('Backend DTO Validation Logic (validateTicketPayload)', () => {
    it('passes with strictly valid payload conforming to CreateTicketDto', () => {
      const result = validateTicketPayload({
        subject: 'Hotel booking confirmation not received',
        message: 'I completed payment for my hotel booking, but confirmation was not received.',
        category: 'Booking',
        priority: TICKET_PRIORITIES.MEDIUM,
      });

      assert.equal(result.isValid, true);
      assert.deepEqual(result.errors, {});
    });

    it('flags required subject and message when missing or whitespace only', () => {
      const result = validateTicketPayload({
        subject: '   ',
        message: '',
      });

      assert.equal(result.isValid, false);
      assert.equal(result.errors.subject, 'Subject is required');
      assert.equal(result.errors.message, 'Message is required');
    });

    it('enforces subject length constraint (3..140)', () => {
      const tooShort = validateTicketPayload({
        subject: 'ab',
        message: 'Valid length message explaining the issue in detail.',
      });
      assert.equal(tooShort.isValid, false);
      assert.equal(tooShort.errors.subject, 'Subject must be at least 3 characters');

      const tooLong = validateTicketPayload({
        subject: 'a'.repeat(141),
        message: 'Valid length message explaining the issue in detail.',
      });
      assert.equal(tooLong.isValid, false);
      assert.equal(tooLong.errors.subject, 'Subject must not exceed 140 characters');
    });

    it('enforces message length constraint (10..1200)', () => {
      const tooShort = validateTicketPayload({
        subject: 'Valid Subject',
        message: 'Short msg',
      });
      assert.equal(tooShort.isValid, false);
      assert.equal(tooShort.errors.message, 'Message must be at least 10 characters');

      const tooLong = validateTicketPayload({
        subject: 'Valid Subject',
        message: 'm'.repeat(1201),
      });
      assert.equal(tooLong.isValid, false);
      assert.equal(tooLong.errors.message, 'Message must not exceed 1200 characters');
    });

    it('enforces optional category length constraint (<= 80)', () => {
      const invalidCat = validateTicketPayload({
        subject: 'Valid Subject',
        message: 'Valid length message explaining the issue in detail.',
        category: 'c'.repeat(81),
      });
      assert.equal(invalidCat.isValid, false);
      assert.equal(invalidCat.errors.category, 'Category must not exceed 80 characters');
    });

    it('enforces valid priority enum values', () => {
      const invalidPrio = validateTicketPayload({
        subject: 'Valid Subject',
        message: 'Valid length message explaining the issue in detail.',
        priority: 'CRITICAL', // Not in LOW, MEDIUM, HIGH
      });
      assert.equal(invalidPrio.isValid, false);
      assert.equal(invalidPrio.errors.priority, 'Priority must be LOW, MEDIUM, or HIGH');
    });
  });

  describe('Form Field Rendering & Accessibility', () => {
    it('renders all CreateTicketDto input fields with proper labels and attributes', () => {
      const html = renderSupportTicketForm({});

      // Subject field
      assert.ok(html.includes('id="ticket-subject"'));
      assert.ok(html.includes('data-testid="ticket-input-subject"'));
      assert.ok(html.includes('aria-required="true"'));
      assert.ok(html.includes('0/140'));

      // Category field
      assert.ok(html.includes('id="ticket-category"'));
      assert.ok(html.includes('data-testid="ticket-select-category"'));
      assert.ok(html.includes('<option value="General"'));
      assert.ok(html.includes('<option value="Booking"'));
      assert.ok(html.includes('<option value="Payment"'));

      // Priority field
      assert.ok(html.includes('data-testid="ticket-priority-radiogroup"'));
      assert.ok(html.includes('data-testid="ticket-priority-low"'));
      assert.ok(html.includes('data-testid="ticket-priority-medium"'));
      assert.ok(html.includes('data-testid="ticket-priority-high"'));

      // Message field
      assert.ok(html.includes('id="ticket-message"'));
      assert.ok(html.includes('data-testid="ticket-input-message"'));
      assert.ok(html.includes('0/1200'));

      // Submit button
      assert.ok(html.includes('data-testid="ticket-submit-btn"'));
      assert.ok(html.includes('Submit Ticket'));
    });

    it('displays active traveller identity banner and server ownership note', () => {
      const html = renderSupportTicketForm({ currentTravellerId: 'trav-usr-7788' });
      assert.ok(html.includes('trav-usr-7788'));
      assert.ok(html.includes('Backend Contract &amp; Ownership:'));
    });

    it('renders return/cancel navigation button when onBack is provided', () => {
      const html = renderSupportTicketForm({ onBack: () => {} });
      assert.ok(html.includes('← Back to Dashboard'));
      assert.ok(html.includes('data-testid="ticket-cancel-btn"'));
    });
  });

  describe('Dashboard Integration', () => {
    it('now activates the Support Tickets navigation card in TravellerDashboard without coming-soon state', () => {
      const html = renderDashboard({});
      assert.ok(html.includes('data-testid="dashboard-nav-tickets"'));
      // Should not be disabled anymore
      assert.ok(!html.includes('data-testid="dashboard-nav-tickets" class="trav-dash-card trav-dash-card--disabled"'));
      // Arrow indicator should be present instead of coming soon label
      assert.ok(html.includes('Support Tickets</h2><p class="trav-dash-card-desc">Submit and track support requests for your bookings.</p></div><span class="trav-dash-card-arrow"'));
    });
  });
});
