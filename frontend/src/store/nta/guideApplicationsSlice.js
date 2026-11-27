import { createSlice } from '@reduxjs/toolkit';
import { decideGuideApplication, fetchGuideApplications } from './guideApplicationsThunks.js';

// The one copy of the NTA's guide applications. Tabs, search, the package filter, the review
// modal, the selected application and the rejection-reason draft stay local to the page.
const initialMutationState = { status: 'idle', error: null, applicationId: null, decision: null, requestId: null };

const initialState = {
  items: [],
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null, // { status, message } from the last failed load
  requestId: null,
  mutation: initialMutationState, // last accept / reject decision
};

const guideApplicationsSlice = createSlice({
  name: 'nta/guideApplications',
  initialState,
  reducers: {
    clearGuideApplicationsError(state) {
      state.error = null;
    },
    clearGuideApplicationMutation(state) {
      state.mutation = initialMutationState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGuideApplications.pending, (state, { meta }) => {
        state.status = 'loading';
        state.error = null;
        state.requestId = meta.requestId;
      })
      .addCase(fetchGuideApplications.fulfilled, (state, { payload, meta }) => {
        // Ignore a response that arrives after logout (the root reducer reset this slice) or
        // after a newer request was started.
        if (state.requestId !== meta.requestId) return;
        state.items = payload;
        state.status = 'succeeded';
        state.requestId = null;
      })
      .addCase(fetchGuideApplications.rejected, (state, { payload, error, meta }) => {
        if (state.requestId !== meta.requestId) return;
        state.status = 'failed';
        state.error = payload ?? { status: null, message: error.message };
        state.requestId = null;
      })
      .addCase(decideGuideApplication.pending, (state, { meta }) => {
        state.mutation = {
          status: 'loading',
          error: null,
          applicationId: meta.arg.id,
          decision: meta.arg.status,
          requestId: meta.requestId,
        };
      })
      .addCase(decideGuideApplication.fulfilled, (state, { payload, meta }) => {
        // Replace the application with the server's record — no list refetch.
        const index = state.items.findIndex((app) => app.id === meta.arg.id);
        if (index >= 0 && payload && typeof payload === 'object') {
          state.items[index] = payload;
        }
        if (state.mutation.requestId === meta.requestId) {
          state.mutation = {
            ...initialMutationState,
            status: 'succeeded',
            applicationId: meta.arg.id,
            decision: meta.arg.status,
          };
        }
      })
      .addCase(decideGuideApplication.rejected, (state, { payload, error, meta }) => {
        // The application itself is left exactly as it was.
        if (state.mutation.requestId !== meta.requestId) return;
        state.mutation = {
          status: 'failed',
          error: payload ?? { status: null, message: error.message },
          applicationId: meta.arg.id,
          decision: meta.arg.status,
          requestId: null,
        };
      });
  },
});

export const { clearGuideApplicationsError, clearGuideApplicationMutation } = guideApplicationsSlice.actions;
export default guideApplicationsSlice.reducer;
