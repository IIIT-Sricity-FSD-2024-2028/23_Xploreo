import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  applyToExperience,
  applyToPlan,
  confirmAssignment,
  getTraveller,
  listExperiences,
  listMyApplications,
  listMyAssignments,
  listMyTrips,
  listPlans,
  rejectAssignment,
  updateTripTracking,
} from '@/services/guide.api.js';
import { listReviews } from '@/services/schedule.api.js';
import { createTicket, getTickets } from '@/services/tickets.api.js';

// ============================================================================
// 1. READ OPERATIONS (Fetch data from backend into Redux store)
// ============================================================================

/**
 * Loads all initial datasets needed by the Guide Dashboard simultaneously.
 * CRUD: Read
 */
export const fetchGuideDashboardData = createAsyncThunk(
  'guide/fetchDashboardData',
  async (guideId, { rejectWithValue }) => {
    try {
      const [plans, experiences, applications, assignments] = await Promise.all([
        listPlans(),
        listExperiences(),
        listMyApplications(guideId),
        listMyAssignments(guideId),
      ]);
      return { plans, experiences, applications, assignments };
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to load guide dashboard data');
    }
  }
);

/**
 * Loads trips assigned to this guide (used for earnings & refund metrics).
 * CRUD: Read
 */
export const fetchGuideTrips = createAsyncThunk(
  'guide/fetchTrips',
  async (guideId, { rejectWithValue }) => {
    try {
      const trips = await listMyTrips(guideId);
      return Array.isArray(trips) ? trips : [];
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to load guide trips');
    }
  }
);

/**
 * Loads reviews for guide feedback & star ratings.
 * CRUD: Read
 */
export const fetchGuideReviews = createAsyncThunk(
  'guide/fetchReviews',
  async (_, { rejectWithValue }) => {
    try {
      const reviews = await listReviews();
      return Array.isArray(reviews) ? reviews : [];
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to load guide reviews');
    }
  }
);

/**
 * Loads support tickets submitted by this guide.
 * CRUD: Read
 */
export const fetchGuideTickets = createAsyncThunk(
  'guide/fetchTickets',
  async (_, { rejectWithValue }) => {
    try {
      const tickets = await getTickets();
      return Array.isArray(tickets) ? tickets : [];
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to load support tickets');
    }
  }
);

/**
 * Loads traveller profile details when viewing job modal.
 * CRUD: Read
 */
export const fetchTravellerDetails = createAsyncThunk(
  'guide/fetchTravellerDetails',
  async (travellerId, { rejectWithValue }) => {
    try {
      const data = await getTraveller(travellerId);
      return data;
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to load traveller details');
    }
  }
);

// ============================================================================
// 2. CREATE OPERATIONS (Post new data from frontend to backend)
// ============================================================================

/**
 * Submits an application for a standard Travel Plan.
 * CRUD: Create
 */
export const applyToPlanThunk = createAsyncThunk(
  'guide/applyToPlan',
  async ({ planId, guidePricePerPerson }, { rejectWithValue }) => {
    try {
      const newApp = await applyToPlan({ planId, guidePricePerPerson });
      return newApp;
    } catch (err) {
      return rejectWithValue(err?.fieldErrors?.guidePricePerPerson || err?.message || 'Failed to apply to plan');
    }
  }
);

/**
 * Submits an application for an Experience.
 * CRUD: Create
 */
export const applyToExperienceThunk = createAsyncThunk(
  'guide/applyToExperience',
  async ({ experienceId, guidePricePerPerson }, { rejectWithValue }) => {
    try {
      const newApp = await applyToExperience({ experienceId, guidePricePerPerson });
      return newApp;
    } catch (err) {
      return rejectWithValue(err?.fieldErrors?.guidePricePerPerson || err?.message || 'Failed to apply to experience');
    }
  }
);

/**
 * Creates a new support ticket.
 * CRUD: Create
 */
export const createGuideTicketThunk = createAsyncThunk(
  'guide/createTicket',
  async ({ subject, message, category }, { rejectWithValue }) => {
    try {
      const ticket = await createTicket({ subject, message, category });
      return ticket;
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to create support ticket');
    }
  }
);

// ============================================================================
// 3. UPDATE OPERATIONS (Modify existing records)
// ============================================================================

/**
 * Confirms an assigned trip or experience job.
 * CRUD: Update
 */
export const confirmAssignmentThunk = createAsyncThunk(
  'guide/confirmAssignment',
  async ({ id, kind }, { rejectWithValue }) => {
    try {
      await confirmAssignment(id, kind);
      return { id, kind, status: 'confirmed' };
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to confirm assignment');
    }
  }
);

/**
 * Updates ongoing tour tracking (current stop, progress, status).
 * CRUD: Update
 */
export const updateTripTrackingThunk = createAsyncThunk(
  'guide/updateTripTracking',
  async ({ tripId, changes }, { rejectWithValue }) => {
    try {
      await updateTripTracking(tripId, changes);
      return { tripId, changes };
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to update tour tracking');
    }
  }
);

// ============================================================================
// 4. DELETE / REJECT OPERATIONS
// ============================================================================

/**
 * Rejects an assigned trip or experience job.
 * CRUD: Delete / Status Update
 */
export const rejectAssignmentThunk = createAsyncThunk(
  'guide/rejectAssignment',
  async ({ id, kind }, { rejectWithValue }) => {
    try {
      await rejectAssignment(id, kind);
      return { id, kind, status: 'rejected_by_guide' };
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to reject assignment');
    }
  }
);
