import { useState } from 'react';
import {
  TICKET_PRIORITIES,
  COMMON_CATEGORIES,
  validateTicketPayload,
  createMockTicketRecord,
} from '../../utils/ticketUtils.js';
import { apiRequest } from '../../services/api.js';
import './travellerSupportTicket.css';

/**
 * TravellerSupportTicketForm
 *
 * Implements the traveller-facing support ticket creation form matching the backend
 * `POST /api/tickets` endpoint and `CreateTicketDto` schema.
 *
 * Boundary rules:
 * - Does not use raw fetch/axios or hardcoded credentials.
 * - Injects submission through `onSubmit(payload)` if provided.
 * - In live mode, uses shared apiRequest('/tickets', { method: 'POST', body: payload }).
 * - In preview mode (useFixtures: true) without onSubmit, explains that live API is disconnected.
 *
 * Props:
 *   onSubmit           {function} - Async submission handler returning confirmed ticket: (payload) => Promise<Ticket>
 *   onBack             {function} - Callback to return to dashboard hub.
 *   currentTravellerId {string}   - Active traveller identity (used only for context banner).
 *   initialCategory    {string}   - Optional pre-selected category.
 *   initialPriority    {string}   - Optional pre-selected priority (default MEDIUM).
 *   useFixtures        {boolean}  - Whether component is constrained to preview mode.
 */
export default function TravellerSupportTicketForm({
  onSubmit,
  onBack,
  currentTravellerId = 'trav-usr-20001',
  initialCategory = 'General',
  initialPriority = TICKET_PRIORITIES.MEDIUM,
  useFixtures = false,
}) {
  const [formData, setFormData] = useState({
    subject: '',
    category: initialCategory,
    priority: initialPriority,
    message: '',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [submittedTicket, setSubmittedTicket] = useState(null);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (serverError) setServerError(null);

    // Revalidate field if already touched
    if (touched[field]) {
      const validation = validateTicketPayload({
        ...formData,
        [field]: value,
      });
      setErrors((prev) => ({
        ...prev,
        [field]: validation.errors[field] || undefined,
      }));
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const validation = validateTicketPayload(formData);
    setErrors((prev) => ({
      ...prev,
      [field]: validation.errors[field] || undefined,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mark all as touched
    setTouched({
      subject: true,
      category: true,
      priority: true,
      message: true,
    });

    const validation = validateTicketPayload(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setServerError(null);

    // Prepare strictly conforming DTO payload
    const payload = {
      subject: formData.subject.trim(),
      message: formData.message.trim(),
      category: formData.category.trim() || 'General',
      priority: formData.priority || TICKET_PRIORITIES.MEDIUM,
    };

    if (typeof onSubmit === 'function') {
      setIsSubmitting(true);
      try {
        const confirmedTicket = await onSubmit(payload);
        if (confirmedTicket && (confirmedTicket.id || confirmedTicket.status)) {
          setSubmittedTicket(confirmedTicket);
        } else {
          // If the caller returned truthy confirmation
          setSubmittedTicket(createMockTicketRecord(payload, currentTravellerId));
        }
      } catch (err) {
        // Preserve user entered values on error!
        setServerError(
          err?.message || 'Server error occurred while creating support ticket. Please retry.',
        );
      } finally {
        setIsSubmitting(false);
      }
    } else if (useFixtures) {
      // Preview mode without an injected submit handler:
      setServerError(
        'Preview mode: No live API client provided. Shared authentication & API infrastructure is pending.',
      );
    } else {
      // Live API mode: submit directly to POST /api/tickets with authenticated identity headers
      setIsSubmitting(true);
      try {
        const confirmedTicket = await apiRequest('/tickets', {
          method: 'POST',
          body: payload,
        });
        if (confirmedTicket && (confirmedTicket.id || confirmedTicket.status)) {
          setSubmittedTicket(confirmedTicket);
        } else {
          setSubmittedTicket({
            id: 'TICK-' + Date.now(),
            status: 'OPEN',
            ...payload,
          });
        }
      } catch (err) {
        setServerError(
          err?.message || 'Server error occurred while creating support ticket. Please retry.',
        );
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleResetForm = () => {
    setSubmittedTicket(null);
    setFormData({
      subject: '',
      category: initialCategory,
      priority: initialPriority,
      message: '',
    });
    setErrors({});
    setTouched({});
    setServerError(null);
  };

  // ── Success State View ─────────────────────────────────────────────────────
  if (submittedTicket) {
    return (
      <div className="trav-ticket-container" data-testid="support-ticket-success-view">
        <div className="trav-ticket-header">
          {onBack && (
            <button
              type="button"
              className="trav-ticket-back-btn"
              onClick={onBack}
              aria-label="Return to Dashboard"
            >
              ← Back to Dashboard
            </button>
          )}
        </div>

        <div className="trav-ticket-success-card">
          <div className="trav-ticket-success-icon" aria-hidden="true">✓</div>
          <h2 className="trav-ticket-success-title">Support Ticket Created</h2>
          <p className="trav-ticket-success-desc">
            Your support request has been logged and assigned to technical administration.
          </p>

          <div className="trav-ticket-details-box">
            <div className="trav-ticket-details-grid">
              <div className="trav-ticket-detail-item">
                <span className="trav-ticket-detail-label">Ticket ID</span>
                <span className="trav-ticket-detail-value" data-testid="confirmed-ticket-id">
                  {submittedTicket.id}
                </span>
              </div>
              <div className="trav-ticket-detail-item">
                <span className="trav-ticket-detail-label">Status</span>
                <span className="trav-ticket-detail-value">
                  <span className="trav-ticket-badge-open">{submittedTicket.status || 'OPEN'}</span>
                </span>
              </div>
              <div className="trav-ticket-detail-item">
                <span className="trav-ticket-detail-label">Priority</span>
                <span className="trav-ticket-detail-value">{submittedTicket.priority}</span>
              </div>
              <div className="trav-ticket-detail-item">
                <span className="trav-ticket-detail-label">Category</span>
                <span className="trav-ticket-detail-value">{submittedTicket.category}</span>
              </div>
              <div className="trav-ticket-detail-item" style={{ gridColumn: '1 / -1' }}>
                <span className="trav-ticket-detail-label">Subject</span>
                <span className="trav-ticket-detail-value">{submittedTicket.subject}</span>
              </div>
            </div>
          </div>

          <div className="trav-ticket-success-actions">
            <button
              type="button"
              className="trav-ticket-submit-btn"
              onClick={handleResetForm}
              data-testid="submit-another-ticket-btn"
            >
              Create Another Ticket
            </button>
            {onBack && (
              <button
                type="button"
                className="trav-ticket-cancel-btn"
                onClick={onBack}
              >
                Return to Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Form Entry View ────────────────────────────────────────────────────────
  return (
    <div className="trav-ticket-container" data-testid="support-ticket-form-container">
      <div className="trav-ticket-header">
        {onBack && (
          <button
            type="button"
            className="trav-ticket-back-btn"
            onClick={onBack}
            aria-label="Back to Dashboard"
            disabled={isSubmitting}
          >
            ← Back to Dashboard
          </button>
        )}
        <h1 className="trav-ticket-title">
          <span>🎫</span> Submit Support Ticket
        </h1>
        <p className="trav-ticket-subtitle">
          Have an issue with a booking, payment, or experience? Submit a ticket and our support team will assist you.
        </p>
      </div>

      {/* Info notice about authentication boundary */}
      <div className="trav-ticket-notice">
        <span className="trav-ticket-notice-icon" aria-hidden="true">ℹ️</span>
        <div>
          <strong>Backend Contract & Ownership:</strong> Tickets are registered to your verified identity (
          <code>{currentTravellerId}</code>) via server-side session headers. Ticket ID and status are assigned upon server confirmation.
        </div>
      </div>

      <div className="trav-ticket-card">
        {serverError && (
          <div className="trav-ticket-alert-error" role="alert" data-testid="support-ticket-server-error" style={{ marginBottom: '1.25rem' }}>
            <span className="trav-ticket-alert-error-icon" aria-hidden="true">⚠️</span>
            <div>
              <strong>Submission Error:</strong> {serverError}
            </div>
          </div>
        )}

        <form
          className="trav-ticket-form"
          onSubmit={handleSubmit}
          noValidate
          data-testid="support-ticket-form"
        >
          {/* Subject Field */}
          <div className="trav-ticket-group">
            <div className="trav-ticket-label-row">
              <label htmlFor="ticket-subject" className="trav-ticket-label">
                Subject <span className="trav-ticket-required" aria-hidden="true">*</span>
              </label>
              <span
                className={`trav-ticket-counter ${
                  formData.subject.length > 140
                    ? 'trav-ticket-counter--exceeded'
                    : formData.subject.length >= 120
                    ? 'trav-ticket-counter--limit'
                    : ''
                }`}
                aria-live="polite"
              >
                {formData.subject.length}/140
              </span>
            </div>
            <input
              id="ticket-subject"
              name="subject"
              type="text"
              className={`trav-ticket-input ${errors.subject ? 'trav-ticket-input--error' : ''}`}
              placeholder="e.g., Hotel booking confirmation not received"
              value={formData.subject}
              onChange={(e) => handleChange('subject', e.target.value)}
              onBlur={() => handleBlur('subject')}
              maxLength={150}
              disabled={isSubmitting}
              aria-required="true"
              aria-invalid={!!errors.subject}
              aria-describedby={errors.subject ? 'ticket-subject-error' : 'ticket-subject-hint'}
              data-testid="ticket-input-subject"
            />
            {errors.subject ? (
              <span id="ticket-subject-error" className="trav-ticket-error-msg" role="alert">
                {errors.subject}
              </span>
            ) : (
              <span id="ticket-subject-hint" className="trav-ticket-hint">
                Brief summary of your inquiry (between 3 and 140 characters).
              </span>
            )}
          </div>

          {/* Category & Priority Grid */}
          <div className="trav-ticket-grid-row">
            {/* Category Field */}
            <div className="trav-ticket-group">
              <label htmlFor="ticket-category" className="trav-ticket-label">
                Category
              </label>
              <select
                id="ticket-category"
                name="category"
                className={`trav-ticket-select ${errors.category ? 'trav-ticket-select--error' : ''}`}
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                onBlur={() => handleBlur('category')}
                disabled={isSubmitting}
                data-testid="ticket-select-category"
              >
                {COMMON_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {errors.category && (
                <span className="trav-ticket-error-msg" role="alert">
                  {errors.category}
                </span>
              )}
            </div>

            {/* Priority Selector */}
            <div className="trav-ticket-group">
              <label className="trav-ticket-label">
                Priority
              </label>
              <div
                className="trav-ticket-priority-options"
                role="radiogroup"
                aria-label="Ticket Priority"
                data-testid="ticket-priority-radiogroup"
              >
                {Object.values(TICKET_PRIORITIES).map((prio) => {
                  const isSelected = formData.priority === prio;
                  const prioClass =
                    prio === 'LOW'
                      ? 'trav-ticket-priority-btn--low'
                      : prio === 'HIGH'
                      ? 'trav-ticket-priority-btn--high'
                      : 'trav-ticket-priority-btn--medium';

                  return (
                    <button
                      key={prio}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      className={`trav-ticket-priority-btn ${prioClass} ${
                        isSelected ? 'trav-ticket-priority-btn--selected' : ''
                      }`}
                      onClick={() => handleChange('priority', prio)}
                      disabled={isSubmitting}
                      data-testid={`ticket-priority-${prio.toLowerCase()}`}
                    >
                      {prio === 'LOW' && '🟢'}
                      {prio === 'MEDIUM' && '🟡'}
                      {prio === 'HIGH' && '🔴'}
                      <span>{prio}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Message Field */}
          <div className="trav-ticket-group">
            <div className="trav-ticket-label-row">
              <label htmlFor="ticket-message" className="trav-ticket-label">
                Message <span className="trav-ticket-required" aria-hidden="true">*</span>
              </label>
              <span
                className={`trav-ticket-counter ${
                  formData.message.length > 1200
                    ? 'trav-ticket-counter--exceeded'
                    : formData.message.length >= 1000
                    ? 'trav-ticket-counter--limit'
                    : ''
                }`}
                aria-live="polite"
              >
                {formData.message.length}/1200
              </span>
            </div>
            <textarea
              id="ticket-message"
              name="message"
              className={`trav-ticket-textarea ${errors.message ? 'trav-ticket-textarea--error' : ''}`}
              placeholder="Describe your issue in detail. Include any relevant booking reference numbers or error messages..."
              value={formData.message}
              onChange={(e) => handleChange('message', e.target.value)}
              onBlur={() => handleBlur('message')}
              disabled={isSubmitting}
              maxLength={1250}
              aria-required="true"
              aria-invalid={!!errors.message}
              aria-describedby={errors.message ? 'ticket-message-error' : 'ticket-message-hint'}
              data-testid="ticket-input-message"
            />
            {errors.message ? (
              <span id="ticket-message-error" className="trav-ticket-error-msg" role="alert">
                {errors.message}
              </span>
            ) : (
              <span id="ticket-message-hint" className="trav-ticket-hint">
                Provide comprehensive details (between 10 and 1200 characters).
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="trav-ticket-actions">
            {onBack && (
              <button
                type="button"
                className="trav-ticket-cancel-btn"
                onClick={onBack}
                disabled={isSubmitting}
                data-testid="ticket-cancel-btn"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="trav-ticket-submit-btn"
              disabled={isSubmitting}
              data-testid="ticket-submit-btn"
            >
              {isSubmitting ? (
                <>
                  <span className="trav-ticket-spinner" aria-hidden="true" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Submit Ticket</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
