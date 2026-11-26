import { createAsyncThunk } from '@reduxjs/toolkit';
import { getGuideApplications, updateGuideApplicationStatus } from '@/services/nta.api.js';
import { selectUser } from '../sessionSlice.js';

// Same rejection shape as the rest of store/nta and store/techadmin — { status, message }.
function errorDetails(error, fallback) {
  return { status: error?.status ?? null, message: error?.message || fallback };
}

// nta.api.js takes the caller's session for region scoping. The page passes the session it
// already resolves (props -> auth); otherwise the signed-in user is used.
const sessionFor = (session, getState) => session ?? selectUser(getState());

// READ — GET /guide-applications (NONTECHADMIN, SUPERADMIN). The server already limits an NTA to
// plans/experiences in their region; nta.api.js maps each record to the table/modal shape and
// applies the page's filters ({ destination } today). Skipped while a request is in flight, and
// once loaded unless { force: true } is passed — decisions update the store in place.
export const fetchGuideApplications = createAsyncThunk(
  'nta/guideApplications/fetch',
  async ({ filters = {}, session } = {}, { getState, rejectWithValue }) => {
    try {
      const items = await getGuideApplications(filters, sessionFor(session, getState));
      return Array.isArray(items) ? items : [];
    } catch (error) {
      return rejectWithValue(errorDetails(error, 'Failed to load guide applications.'));
    }
  },
  {
    condition: ({ force = false } = {}, { getState }) => {
      const { status } = getState().nta.guideApplications;
      if (status === 'loading') return false;
      return force || status !== 'succeeded';
    },
  },
);

// UPDATE — PATCH /guide-applications/:id/decision { status: 'accepted' | 'rejected', reason }.
// The server enforces the NTA region, a 5+ character reason for rejections, no re-accepting a
// rejected application, and no withdrawing an approval while the guide has confirmed trips.
// Resolves with the server's updated application (mapped by nta.api.js).
export const decideGuideApplication = createAsyncThunk(
  'nta/guideApplications/decide',
  async ({ id, status, reason = '', session }, { getState, rejectWithValue }) => {
    try {
      const result = await updateGuideApplicationStatus(id, { status, reason }, sessionFor(session, getState));
      if (result?.application) return result.application;
      // Same fallback the page used when no record came back.
      const existing = getState().nta.guideApplications.items.find((app) => app.id === id) ?? { id };
      return { ...existing, status, decisionNotes: reason, decidedAt: new Date().toISOString() };
    } catch (error) {
      return rejectWithValue(errorDetails(error, `Failed to ${status} application.`));
    }
  },
);
