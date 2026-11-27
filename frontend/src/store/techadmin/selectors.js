import { createSelector } from '@reduxjs/toolkit';

// Calculations below are moved unchanged from pages/TechAdmin/dashboard.jsx so the dashboard's
// numbers stay identical; they now live in one place instead of inside a component.

// Supported Categories defined in the schema and fixtures: Booking, Payment, Hotel, Guide Inquiry, General
const EXPECTED_CATEGORIES = ['Booking', 'Payment', 'Hotel', 'Guide Inquiry', 'General'];

const PRIORITIES = [
  { key: 'HIGH', label: 'High Priority', color: '#ef4444', bg: '#fef2f2' },
  { key: 'MEDIUM', label: 'Medium Priority', color: '#f59e0b', bg: '#fffbeb' },
  { key: 'LOW', label: 'Low Priority', color: '#3b82f6', bg: '#eff6ff' },
];

const upper = (value) => String(value || '').toUpperCase();

const selectTicketsState = (state) => state.techadmin.tickets;

export const selectTaTickets = (state) => selectTicketsState(state).items;
export const selectTaTicketsStatus = (state) => selectTicketsState(state).status;
export const selectTaTicketsError = (state) => selectTicketsState(state).error;

// True until the first load finishes, and while any load is in flight.
export const selectTaTicketsLoading = (state) => {
  const status = selectTaTicketsStatus(state);
  return status === 'idle' || status === 'loading';
};

export const selectTaResolveStatus = (state) => selectTicketsState(state).resolve.status;
export const selectTaResolveError = (state) => selectTicketsState(state).resolve.error;

// KPI Calculations strictly based on actual ticket dataset
export const selectTaTicketKpis = createSelector([selectTaTickets], (tickets) => {
  const total = tickets.length;
  const open = tickets.filter((t) => upper(t.status) === 'OPEN').length;
  const resolved = tickets.filter((t) => upper(t.status) === 'RESOLVED').length;
  const highPriority = tickets.filter((t) => upper(t.priority) === 'HIGH' && upper(t.status) === 'OPEN').length;
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  return { total, open, resolved, highPriority, resolutionRate };
});

export const selectTaTotalTicketCount = (state) => selectTaTicketKpis(state).total;
export const selectTaOpenTicketCount = (state) => selectTaTicketKpis(state).open;
export const selectTaResolvedTicketCount = (state) => selectTaTicketKpis(state).resolved;

// Workload: Priority Distribution (High, Medium, Low)
export const selectTaPriorityBreakdown = createSelector([selectTaTickets], (tickets) => {
  const total = tickets.length;
  return PRIORITIES.map((p) => {
    const count = tickets.filter((t) => upper(t.priority) === p.key).length;
    const openCount = tickets.filter((t) => upper(t.priority) === p.key && upper(t.status) === 'OPEN').length;
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    return { ...p, count, openCount, percentage };
  });
});

// Workload: Category Distribution (Booking, Payment, Hotel, Guide Inquiry, General, etc.)
export const selectTaCategoryBreakdown = createSelector([selectTaTickets], (tickets) => {
  const total = tickets.length;
  // Collect all unique categories from actual tickets and ensure known categories are represented
  const ticketCategories = new Set(tickets.map((t) => t.category).filter(Boolean));
  EXPECTED_CATEGORIES.forEach((cat) => ticketCategories.add(cat));

  return Array.from(ticketCategories)
    .map((cat) => {
      const count = tickets.filter((t) => (t.category || 'General') === cat).length;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      return { category: cat, count, percentage };
    })
    .sort((a, b) => b.count - a.count);
});

// Recent Tickets sorted by createdAt descending (latest five)
export const selectTaRecentTickets = createSelector([selectTaTickets], (tickets) =>
  [...tickets]
    .sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 5),
);
