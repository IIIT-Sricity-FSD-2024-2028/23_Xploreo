import { createAsyncThunk } from '@reduxjs/toolkit';
import { getNtaTripActivity } from '@/services/nta.api.js';
import { selectUser } from '../sessionSlice.js';

// Same rejection shape as the rest of store/nta and store/techadmin — { status, message }.
function errorDetails(error, fallback) {
  return { status: error?.status ?? null, message: error?.message || fallback };
}

// nta.api.js takes the caller's session for region scoping. The dashboard passes the session it
// already resolves (props -> auth); otherwise the signed-in user is used.
const sessionFor = (session, getState) => session ?? selectUser(getState());

// READ — GET /trips (SUPERADMIN, NONTECHADMIN; the server limits an NTA to their region).
// Only the dashboard's trip activity lives here; its plan figures come from state.nta.plans.
// Skipped while a request is in flight, and once loaded unless { force: true } is passed.
export const fetchNtaTripActivity = createAsyncThunk(
  'nta/dashboard/fetchTripActivity',
  async ({ session } = {}, { getState, rejectWithValue }) => {
    try {
      const { tripCount, recentBookings } = await getNtaTripActivity(sessionFor(session, getState));
      return {
        tripCount: Number(tripCount) || 0,
        recentBookings: Array.isArray(recentBookings) ? recentBookings : [],
      };
    } catch (error) {
      return rejectWithValue(errorDetails(error, 'Failed to load NTA dashboard telemetry.'));
    }
  },
  {
    condition: ({ force = false } = {}, { getState }) => {
      const { status } = getState().nta.dashboard;
      if (status === 'loading') return false;
      return force || status !== 'succeeded';
    },
  },
);
