// Domain service for support tickets, built on the shared request() (same pattern as every
// other *.api.js file). The signed-in user's identity is attached automatically by
// identityHeaders() inside request() — callers do not need to pass a session object, but the
// optional second/third params below are kept for backward compatibility with existing callers.
import { request } from '@/foundation';
import { ApiError } from './ApiError.js';

const listOf = (response) => (Array.isArray(response) ? response : response?.items ?? response?.data ?? []);

export { ApiError };

// POST /tickets   CreateTicketDto { subject, message, category?, priority? }
export async function createTicket(data) {
  const subject = String(data.subject || '').trim();
  const message = String(data.message || '').trim();
  if (subject.length < 3 || subject.length > 140) {
    throw new ApiError(400, 'Subject must be between 3 and 140 characters.');
  }
  if (message.length < 10 || message.length > 1200) {
    throw new ApiError(400, 'Message must be between 10 and 1200 characters.');
  }

  const body = {
    subject,
    message,
    ...(data.category ? { category: String(data.category).trim() } : {}),
    ...(data.priority ? { priority: data.priority } : {}),
  };

  return request('/tickets', { method: 'POST', body });
}

// GET /tickets (scoped to the caller: their own tickets, or all of them for a tech admin)
export async function getTickets() {
  return listOf(await request('/tickets'));
}

// PATCH /tickets/:id   ResolveTicketDto { resolution? }
export async function resolveTicket(ticketId, resolution = '') {
  if (!ticketId) throw new ApiError(400, 'Ticket ID is required for resolution.');
  const cleanResolution = String(resolution || '').trim();
  if (cleanResolution.length > 800) {
    throw new ApiError(400, 'Resolution text must not exceed 800 characters.');
  }
  const body = cleanResolution ? { resolution: cleanResolution } : {};
  return request(`/tickets/${encodeURIComponent(ticketId)}`, { method: 'PATCH', body });
}
