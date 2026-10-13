/**
 * ticketUtils.js
 * Pure utility functions and constants for support ticket creation,
 * validation, and formatting strictly adhering to backend CreateTicketDto schema.
 */

/**
 * TicketPriority options corresponding strictly to backend TicketPriority enum.
 */
export const TICKET_PRIORITIES = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
};

/**
 * Suggested common ticket categories for travellers.
 */
export const COMMON_CATEGORIES = [
  'General',
  'Booking',
  'Payment',
  'Hotel',
  'Experience',
  'Guide',
  'Technical',
];

/**
 * Pure validation function for ticket creation payload against backend constraints.
 *
 * Constraints:
 * - subject: required, 3..140 characters
 * - message: required, 10..1200 characters
 * - category: optional, max 80 characters
 * - priority: optional, must be 'LOW' | 'MEDIUM' | 'HIGH'
 */
export function validateTicketPayload({ subject, message, category, priority }) {
  const errors = {};

  const trimmedSubject = (subject || '').trim();
  if (!trimmedSubject) {
    errors.subject = 'Subject is required';
  } else if (trimmedSubject.length < 3) {
    errors.subject = 'Subject must be at least 3 characters';
  } else if (trimmedSubject.length > 140) {
    errors.subject = 'Subject must not exceed 140 characters';
  }

  const trimmedMessage = (message || '').trim();
  if (!trimmedMessage) {
    errors.message = 'Message is required';
  } else if (trimmedMessage.length < 10) {
    errors.message = 'Message must be at least 10 characters';
  } else if (trimmedMessage.length > 1200) {
    errors.message = 'Message must not exceed 1200 characters';
  }

  if (category && category.trim().length > 80) {
    errors.category = 'Category must not exceed 80 characters';
  }

  if (priority && !Object.values(TICKET_PRIORITIES).includes(priority)) {
    errors.priority = 'Priority must be LOW, MEDIUM, or HIGH';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Generates a mock confirmed ticket for preview/development modes.
 */
export function createMockTicketRecord(payload, travellerId = 'trav-usr-20001') {
  return {
    id: `ticket-${Date.now().toString(36)}`,
    travellerId,
    travellerName: travellerId,
    subject: payload.subject,
    message: payload.message,
    category: payload.category || 'General',
    priority: payload.priority || TICKET_PRIORITIES.MEDIUM,
    status: 'OPEN',
    createdAt: new Date().toISOString(),
  };
}
