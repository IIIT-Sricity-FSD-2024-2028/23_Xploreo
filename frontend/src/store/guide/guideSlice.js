import { createSlice } from '@reduxjs/toolkit';
import {
  applyToExperienceThunk,
  applyToPlanThunk,
  confirmAssignmentThunk,
  createGuideTicketThunk,
  fetchGuideDashboardData,
  fetchGuideReviews,
  fetchGuideTickets,
  fetchGuideTrips,
  fetchTravellerDetails,
  rejectAssignmentThunk,
  updateTripTrackingThunk,
} from './guideThunks.js';

const initialState = {
  // Datasets
  plans: [],
  experiences: [],
  applications: [],
  assignments: [],
  trips: [],
  reviews: [],
  tickets: [],
  activeTraveller: null, // modal detail lookup

  // Loading & status flags
  loading: false,         // page-level data fetching
  actionBusy: false,      // button-level operation (confirm, reject, apply)
  error: null,
  successMessage: null,
};

export const guideSlice = createSlice({
  name: 'guide',
  initialState,
  reducers: {
    // Synchronous action to reset state (e.g. when leaving the guide portal)
    clearGuideState: () => initialState,

    clearGuideError: (state) => {
      state.error = null;
    },

    clearGuideSuccess: (state) => {
      state.successMessage = null;
    },

    clearActiveTraveller: (state) => {
      state.activeTraveller = null;
    },
  },
  extraReducers: (builder) => {
    // ========================================================================
    // 1. READ: fetchGuideDashboardData
    // ========================================================================
    builder
      .addCase(fetchGuideDashboardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGuideDashboardData.fulfilled, (state, action) => {
        state.loading = false;
        state.plans = action.payload.plans;
        state.experiences = action.payload.experiences;
        state.applications = action.payload.applications;
        state.assignments = action.payload.assignments;
      })
      .addCase(fetchGuideDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ========================================================================
    // 2. READ: fetchGuideTrips (for earnings/refunds)
    // ========================================================================
    builder.addCase(fetchGuideTrips.fulfilled, (state, action) => {
      state.trips = action.payload;
    });

    // ========================================================================
    // 3. READ: fetchGuideReviews
    // ========================================================================
    builder.addCase(fetchGuideReviews.fulfilled, (state, action) => {
      state.reviews = action.payload;
    });

    // ========================================================================
    // 4. READ: fetchGuideTickets
    // ========================================================================
    builder.addCase(fetchGuideTickets.fulfilled, (state, action) => {
      state.tickets = action.payload;
    });

    // ========================================================================
    // 5. READ: fetchTravellerDetails
    // ========================================================================
    builder.addCase(fetchTravellerDetails.fulfilled, (state, action) => {
      state.activeTraveller = action.payload;
    });

    // ========================================================================
    // 6. CREATE: applyToPlanThunk & applyToExperienceThunk
    // ========================================================================
    builder
      .addCase(applyToPlanThunk.pending, (state) => {
        state.actionBusy = true;
        state.error = null;
      })
      .addCase(applyToPlanThunk.fulfilled, (state, action) => {
        state.actionBusy = false;
        state.applications.unshift(action.payload);
        state.successMessage = 'Application submitted successfully!';
      })
      .addCase(applyToPlanThunk.rejected, (state, action) => {
        state.actionBusy = false;
        state.error = action.payload;
      })
      .addCase(applyToExperienceThunk.pending, (state) => {
        state.actionBusy = true;
        state.error = null;
      })
      .addCase(applyToExperienceThunk.fulfilled, (state, action) => {
        state.actionBusy = false;
        state.applications.unshift(action.payload);
        state.successMessage = 'Experience application submitted successfully!';
      })
      .addCase(applyToExperienceThunk.rejected, (state, action) => {
        state.actionBusy = false;
        state.error = action.payload;
      });

    // ========================================================================
    // 7. CREATE: createGuideTicketThunk
    // ========================================================================
    builder.addCase(createGuideTicketThunk.fulfilled, (state, action) => {
      state.tickets.unshift(action.payload);
      state.successMessage = 'Support ticket created successfully!';
    });

    // ========================================================================
    // 8. UPDATE: confirmAssignmentThunk
    // ========================================================================
    builder
      .addCase(confirmAssignmentThunk.pending, (state) => {
        state.actionBusy = true;
        state.error = null;
      })
      .addCase(confirmAssignmentThunk.fulfilled, (state, action) => {
        state.actionBusy = false;
        const job = state.assignments.find((a) => a.id === action.payload.id);
        if (job) {
          job.status = 'confirmed';
        }
        state.successMessage = 'Confirmed! Traveller has been notified.';
      })
      .addCase(confirmAssignmentThunk.rejected, (state, action) => {
        state.actionBusy = false;
        state.error = action.payload;
      });

    // ========================================================================
    // 9. UPDATE: updateTripTrackingThunk
    // ========================================================================
    builder.addCase(updateTripTrackingThunk.fulfilled, (state, action) => {
      const { tripId, changes } = action.payload;
      const trip = state.trips.find((t) => t.id === tripId);
      if (trip) {
        Object.assign(trip, changes);
      }
      // Also update in assignments if present
      const assignment = state.assignments.find((a) => a.id === tripId || a.trip?.id === tripId);
      if (assignment) {
        if (assignment.trip) {
          Object.assign(assignment.trip, changes);
        } else {
          Object.assign(assignment, changes);
        }
      }
    });

    // ========================================================================
    // 10. DELETE / REJECT: rejectAssignmentThunk
    // ========================================================================
    builder
      .addCase(rejectAssignmentThunk.pending, (state) => {
        state.actionBusy = true;
        state.error = null;
      })
      .addCase(rejectAssignmentThunk.fulfilled, (state, action) => {
        state.actionBusy = false;
        const job = state.assignments.find((a) => a.id === action.payload.id);
        if (job) {
          job.status = 'rejected_by_guide';
        }
      })
      .addCase(rejectAssignmentThunk.rejected, (state, action) => {
        state.actionBusy = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearGuideState,
  clearGuideError,
  clearGuideSuccess,
  clearActiveTraveller,
} = guideSlice.actions;

export default guideSlice.reducer;
