import { createSlice } from '@reduxjs/toolkit';
import { createNtaPlan, deletePlanThunk, fetchNtaPlans, updateNtaPlan } from './plansThunks.js';

// The one copy of the NTA's travel packages. Search text, filters, modals, the plan being edited
// and the form draft stay local to the components.
const initialMutationState = { status: 'idle', error: null, operation: null, planId: null, requestId: null };

const initialState = {
  items: [],
  total: 0,
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null, // { status, message } from the last failed load
  requestId: null,
  mutation: initialMutationState, // last create / update / delete
};

// Same order the backend returns (PlansRepository.findAll): destination, then title.
const byDestinationThenTitle = (a, b) =>
  String(a.destination || '').localeCompare(String(b.destination || '')) ||
  String(a.title || '').localeCompare(String(b.title || ''));

const OPERATIONS = [
  [createNtaPlan, 'create'],
  [updateNtaPlan, 'update'],
  [deletePlanThunk, 'delete'],
];

function upsert(state, plan) {
  if (!plan || typeof plan !== 'object' || !plan.id) return;
  const index = state.items.findIndex((item) => item.id === plan.id);
  if (index >= 0) {
    state.items[index] = { ...state.items[index], ...plan };
  } else {
    state.items.push(plan);
    state.total += 1;
  }
  state.items.sort(byDestinationThenTitle);
}

function remove(state, id) {
  const before = state.items.length;
  state.items = state.items.filter((item) => item.id !== id);
  state.total = Math.max(0, state.total - (before - state.items.length));
}

const plansSlice = createSlice({
  name: 'nta/plans',
  initialState,
  reducers: {
    clearPlansError(state) {
      state.error = null;
    },
    clearPlanMutation(state) {
      state.mutation = initialMutationState;
    },
    // A plan deleted by a caller-supplied handler (PlanList's onDeletePlan prop).
    planRemoved(state, { payload: id }) {
      remove(state, id);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNtaPlans.pending, (state, { meta }) => {
        state.status = 'loading';
        state.error = null;
        state.requestId = meta.requestId;
      })
      .addCase(fetchNtaPlans.fulfilled, (state, { payload, meta }) => {
        // Ignore a response that arrives after logout (the root reducer reset this slice) or
        // after a newer request was started.
        if (state.requestId !== meta.requestId) return;
        state.items = payload.items;
        state.total = payload.total;
        state.status = 'succeeded';
        state.requestId = null;
      })
      .addCase(fetchNtaPlans.rejected, (state, { payload, error, meta }) => {
        if (state.requestId !== meta.requestId) return;
        state.status = 'failed';
        state.error = payload ?? { status: null, message: error.message };
        state.requestId = null;
      });

    for (const [thunk, operation] of OPERATIONS) {
      builder
        .addCase(thunk.pending, (state, { meta }) => {
          state.mutation = {
            status: 'loading',
            error: null,
            operation,
            planId: meta.arg.id ?? null,
            requestId: meta.requestId,
          };
        })
        .addCase(thunk.fulfilled, (state, { payload, meta }) => {
          // Apply the server's record to the collection — no list refetch.
          if (operation === 'delete') remove(state, payload.id);
          else upsert(state, payload);
          if (state.mutation.requestId === meta.requestId) {
            state.mutation = { ...initialMutationState, status: 'succeeded', operation, planId: payload?.id ?? null };
          }
        })
        .addCase(thunk.rejected, (state, { payload, error, meta }) => {
          if (state.mutation.requestId !== meta.requestId) return;
          state.mutation = {
            status: 'failed',
            error: payload ?? { status: null, message: error.message },
            operation,
            planId: meta.arg.id ?? null,
            requestId: null,
          };
        });
    }
  },
});

export const { clearPlansError, clearPlanMutation, planRemoved } = plansSlice.actions;
export default plansSlice.reducer;
