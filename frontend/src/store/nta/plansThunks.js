import { createAsyncThunk } from '@reduxjs/toolkit';
import { createPlan, deletePlan, getPlans, updatePlan } from '@/services/plans.api.js';
import { selectUser } from '../sessionSlice.js';

// Same rejection shape as store/techadmin and store/hotel/resource.js — { status, message }.
function errorDetails(error, fallback) {
  return { status: error?.status ?? null, message: error?.message || fallback };
}

// The plans.api.js functions take the caller's session for NTA region scoping. Components may
// pass the session they already resolve (props -> auth); otherwise the signed-in user is used.
const sessionFor = (session, getState) => session ?? selectUser(getState());

// READ — GET /plans?page=1&limit=50 (the backend forces an NTA to their own region and returns
// every status, including draft and unavailable). Skipped while a request is in flight, and once
// loaded unless { force: true } is passed — creates and edits update the store in place.
export const fetchNtaPlans = createAsyncThunk(
  'nta/plans/fetch',
  async ({ session } = {}, { getState, rejectWithValue }) => {
    try {
      const response = await getPlans({}, sessionFor(session, getState));
      const items = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
      const total = Number.isFinite(response?.total) ? response.total : items.length;
      return { items, total };
    } catch (error) {
      return rejectWithValue(errorDetails(error, 'Failed to retrieve travel packages.'));
    }
  },
  {
    condition: ({ force = false } = {}, { getState }) => {
      const { status } = getState().nta.plans;
      if (status === 'loading') return false;
      return force || status !== 'succeeded';
    },
  },
);

// CREATE — POST /plans (SUPERADMIN, NONTECHADMIN; an NTA only inside their region).
export const createNtaPlan = createAsyncThunk(
  'nta/plans/create',
  async ({ data, session }, { getState, rejectWithValue }) => {
    try {
      return await createPlan(data, sessionFor(session, getState));
    } catch (error) {
      return rejectWithValue(errorDetails(error, 'Failed to save travel package.'));
    }
  },
);

// UPDATE — PATCH /plans/:id (SUPERADMIN, NONTECHADMIN; an NTA only inside their region).
export const updateNtaPlan = createAsyncThunk(
  'nta/plans/update',
  async ({ id, data, session }, { getState, rejectWithValue }) => {
    try {
      return await updatePlan(id, data, sessionFor(session, getState));
    } catch (error) {
      return rejectWithValue(errorDetails(error, 'Failed to save travel package.'));
    }
  },
);

// DELETE — DELETE /plans/:id is SUPERADMIN only on the backend; an NTA gets 403. This backs the
// existing SuperAdmin-only delete path in PlanList and is refused before any request for anyone else.
export const deletePlanThunk = createAsyncThunk(
  'nta/plans/delete',
  async ({ id, session }, { getState, rejectWithValue }) => {
    const actor = sessionFor(session, getState);
    if (String(actor?.role || '').toLowerCase() !== 'superadmin') {
      return rejectWithValue({ status: 403, message: 'Only SuperAdmins are permitted to delete travel plans.' });
    }
    try {
      await deletePlan(id, actor);
      return { id };
    } catch (error) {
      return rejectWithValue(errorDetails(error, 'Failed to delete package.'));
    }
  },
);
