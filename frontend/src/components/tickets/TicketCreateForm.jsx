import { useState } from 'react';
import { createTicket } from '../../services/tickets.api.js';
import './tickets.css';

const DEFAULT_CATEGORIES = [
  'Booking',
  'Payment',
  'Cancellation',
  'Hotel',
  'Experience',
  'Guide Inquiry',
  'General',
];

const PRIORITIES = [
  { label: 'Low', value: 'LOW' },
  { label: 'Medium (Standard)', value: 'MEDIUM' },
  { label: 'High (Urgent)', value: 'HIGH' },
];

/**
 * Reusable Ticket Creation Form for Travellers (M5 & M4).
 * Enforces backend CreateTicketDto constraints:
 * - subject: 3-140 chars
 * - message: 10-1200 chars
 * - category: optional (max 80 chars)
 * - priority: optional ('LOW' | 'MEDIUM' | 'HIGH')
 * 
 * @param {Object} props
 * @param {Function} [props.submitTicket] - Submits validated ticket data and returns the created ticket
 * @param {Function} [props.onSubmitSuccess] - Callback with created ticket: (ticket) => void
 * @param {string} [props.initialCategory] - Optional pre-filled category
 * @param {Object} [props.currentUser] - Optional session user { userId, role }
 * @param {string} [props.className] - Optional extra class
 */
export default function TicketCreateForm({
  submitTicket = createTicket,
  onSubmitSuccess,
  initialCategory = '',
  currentUser,
  className = '',
}) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState(initialCategory || 'Booking');
  const [priority, setPriority] = useState('MEDIUM');

  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [successTicket, setSuccessTicket] = useState(null);

  // Client validation
  const errors = {};
  if (touched.subject || isSubmitting) {
    const trimmed = subject.trim();
    if (!trimmed) {
      errors.subject = 'Subject is required.';
    } else if (trimmed.length < 3) {
      errors.subject = `Subject must be at least 3 characters (current: ${trimmed.length}).`;
    } else if (trimmed.length > 140) {
      errors.subject = `Subject cannot exceed 140 characters (current: ${trimmed.length}).`;
    }
  }

  if (touched.message || isSubmitting) {
    const trimmed = message.trim();
    if (!trimmed) {
      errors.message = 'Message is required.';
    } else if (trimmed.length < 10) {
      errors.message = `Message must be at least 10 characters (current: ${trimmed.length}).`;
    } else if (trimmed.length > 1200) {
      errors.message = `Message cannot exceed 1200 characters (current: ${trimmed.length}).`;
    }
  }

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError(null);
    setSuccessTicket(null);

    // Mark fields touched
    setTouched({ subject: true, message: true });

    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (
      trimmedSubject.length < 3 ||
      trimmedSubject.length > 140 ||
      trimmedMessage.length < 10 ||
      trimmedMessage.length > 1200
    ) {
      return;
    }

    setIsSubmitting(true);

    try {
      const created = await submitTicket(
        {
          subject: trimmedSubject,
          message: trimmedMessage,
          category: category.trim(),
          priority,
        },
        currentUser
      );

      setSuccessTicket(created);
      setSubject('');
      setMessage('');
      setTouched({});

      if (typeof onSubmitSuccess === 'function') {
        onSubmitSuccess(created);
      }
    } catch (err) {
      setApiError(err.message || 'An unexpected error occurred while submitting the ticket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`admin-ticket-split-card ${className}`}>
      {/* Left Panel: Brand Navy Context & Support Info */}
      <div className="admin-ticket-info-panel">
        <div className="admin-ticket-info-glow" aria-hidden="true" />
        
        <div className="admin-ticket-info-content">
          <div className="admin-ticket-eyebrow">
            <span className="admin-ticket-eyebrow-dot" />
            Xploreo Support
          </div>

          <h2 className="admin-ticket-info-title">
            We're here to help.
          </h2>

          <p className="admin-ticket-info-desc">
            Have questions about your booking, itinerary changes, or need emergency assistance on your trip? Submit a request and our dedicated operations desk will investigate.
          </p>

          <div className="admin-ticket-features">
            <div className="admin-ticket-feature-row">
              <div className="admin-ticket-feature-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div className="admin-ticket-feature-text">
                <strong>Ticket tracking</strong>
                <span>Direct inquiry updates logged to your active booking</span>
              </div>
            </div>

            <div className="admin-ticket-feature-row">
              <div className="admin-ticket-feature-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div className="admin-ticket-feature-text">
                <strong>Dedicated support</strong>
                <span>Assistance across Jaipur, Goa, Delhi, Mumbai & Kerala</span>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-ticket-info-footer">
          <span>Xploreo Travel Network</span>
        </div>
      </div>

      {/* Right Panel: White Form Container */}
      <div className="admin-ticket-form-panel">
        <div className="admin-ticket-form-header">
          <h2 className="admin-ticket-form-title">Submit a Support Ticket</h2>
          <p className="admin-ticket-form-subtitle">
            Provide the details of your inquiry below and we'll look into it promptly.
          </p>
        </div>

        {apiError && (
          <div className="admin-ticket-alert-error" role="alert">
            <span>⚠️</span>
            <span>{apiError}</span>
          </div>
        )}

        {successTicket && (
          <div className="admin-ticket-alert-success" role="status">
            <span>✅</span>
            <span>
              Ticket #{successTicket.id?.substring(0, 8)} created successfully! Our support team has received your request.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="admin-ticket-form" noValidate>
          {/* Subject */}
          <div className="admin-ticket-form-group">
            <label htmlFor="ticket-subject" className="admin-ticket-label">
              <span>Subject *</span>
              <span className="admin-ticket-char-count">{subject.length}/140</span>
            </label>
            <input
              id="ticket-subject"
              type="text"
              className={`admin-ticket-input ${errors.subject ? 'admin-ticket-input-error' : ''}`}
              placeholder="Brief summary of the issue (e.g. Booking confirmation not received)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onBlur={() => handleBlur('subject')}
              disabled={isSubmitting}
              maxLength={140}
              required
              aria-invalid={!!errors.subject}
              aria-describedby={errors.subject ? 'ticket-subject-error' : undefined}
            />
            {errors.subject && (
              <p id="ticket-subject-error" className="admin-ticket-error-text">
                {errors.subject}
              </p>
            )}
          </div>

          {/* 2-column row: Category & Priority */}
          <div className="admin-ticket-row-2col">
            <div className="admin-ticket-form-group">
              <label htmlFor="ticket-category" className="admin-ticket-label">
                Category
              </label>
              <select
                id="ticket-category"
                className="admin-ticket-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isSubmitting}
              >
                {DEFAULT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-ticket-form-group">
              <label htmlFor="ticket-priority" className="admin-ticket-label">
                Urgency / Priority
              </label>
              <select
                id="ticket-priority"
                className="admin-ticket-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                disabled={isSubmitting}
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Message */}
          <div className="admin-ticket-form-group">
            <label htmlFor="ticket-message" className="admin-ticket-label">
              <span>Detailed Description *</span>
              <span className="admin-ticket-char-count">{message.length}/1200</span>
            </label>
            <textarea
              id="ticket-message"
              className={`admin-ticket-textarea ${errors.message ? 'admin-ticket-input-error' : ''}`}
              placeholder="Please provide details, booking reference IDs, dates, and what you expected to see..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onBlur={() => handleBlur('message')}
              disabled={isSubmitting}
              maxLength={1200}
              required
              aria-invalid={!!errors.message}
              aria-describedby={errors.message ? 'ticket-message-error' : undefined}
            />
            {errors.message && (
              <p id="ticket-message-error" className="admin-ticket-error-text">
                {errors.message}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="admin-ticket-btn-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting ticket...' : 'Submit Support Ticket'}
          </button>
        </form>
      </div>
    </div>
  );
}
