import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { ApiError } from '@/services/ApiError.js';
import { createExperience, deleteExperience, listMyExperiences, updateExperience } from '@/services/partners.api.js';
import { saveExperienceSlots } from '@/services/schedule.api.js';
import { selectSessionVersion, selectUser } from '../sessionSlice.js';

const CACHE_AGE = 30_000;
const isExperiencePartner = (state) => selectUser(state).role === 'experience';
export const selectExperienceCatalog = (state) => state.experience.catalog;
export const selectExperience = (state, id) => selectExperienceCatalog(state).data?.find((experience) => experience.id === id);

const writeKey = (id) => id === undefined ? 'create' : `experience:${id}`;
export const selectExperienceWriting = (state, id) => Boolean(selectExperienceCatalog(state).writes[writeKey(id)]);

export const fetchExperiences = createAsyncThunk('experience/catalog/fetch', async (_, { rejectWithValue }) => {
  try {
    return { data: await listMyExperiences(), fetchedAt: Date.now() };
  } catch (error) {
    return rejectWithValue({ status: error.status ?? null, message: error.message, fieldErrors: error.fieldErrors ?? null });
  }
}, {
  condition({ force = false } = {}, { getState }) {
    const state = getState();
    const { requestId, fetchedAt } = selectExperienceCatalog(state);
    return isExperiencePartner(state) && !requestId && (force || fetchedAt === null || Date.now() - fetchedAt >= CACHE_AGE);
  },
});

const catalogSlice = createSlice({
  name: 'experience/catalog',
  initialState: { data: null, error: null, fetchedAt: null, requestId: null, writes: {} },
  reducers: {
    create(state, { payload }) {
      if (state.data && !state.data.some((experience) => experience.id === payload.id)) {
        state.data.push(payload);
      }
    },
    read(state, { payload: { data, fetchedAt } }) {
      Object.assign(state, { data, fetchedAt, error: null, requestId: null });
    },
    update(state, { payload }) {
      const index = state.data?.findIndex((experience) => experience.id === payload.id) ?? -1;
      if (index >= 0) state.data[index] = payload;
    },
    delete(state, { payload }) {
      if (state.data) state.data = state.data.filter((experience) => experience.id !== payload);
    },
    invalidateRead(state) {
      state.requestId = null;
      state.fetchedAt = null;
    },
    writeStarted(state, { payload }) {
      state.writes[payload] = true;
    },
    writeFinished(state, { payload }) {
      delete state.writes[payload];
    },
  },
  extraReducers: (builder) => builder
    .addCase(fetchExperiences.pending, (state, { meta }) => {
      Object.assign(state, { requestId: meta.requestId, error: null });
    })
    .addCase(fetchExperiences.fulfilled, (state, action) => {
      if (state.requestId === action.meta.requestId) catalogSlice.caseReducers.read(state, action);
    })
    .addCase(fetchExperiences.rejected, (state, { meta, payload, error }) => {
      if (state.requestId === meta.requestId) Object.assign(state, { requestId: null, error: payload ?? error });
    }),
});

const actions = catalogSlice.actions;

function writeExperience(id, request, apply) {
  return async (dispatch, getState) => {
    const state = getState();
    if (!isExperiencePartner(state)) throw new ApiError(403);
    if (selectExperienceWriting(state, id)) throw new ApiError(409, 'Wait for the current change to finish.');

    const version = selectSessionVersion(state);
    const isSameSession = () => selectSessionVersion(getState()) === version;
    const key = writeKey(id);
    dispatch(actions.writeStarted(key));
    try {
      const result = await request(getState());
      if (!isSameSession()) throw new ApiError(401);

      const { requestId, data } = selectExperienceCatalog(getState());
      dispatch(apply(result));
      // A read already in flight may have captured data before this write.
      if (requestId || data === null) {
        dispatch(actions.invalidateRead());
        dispatch(fetchExperiences());
      }
      return result;
    } finally {
      if (isSameSession()) dispatch(actions.writeFinished(key));
    }
  };
}

export const addExperience = (values) => writeExperience(undefined, () => createExperience(values), actions.create);
export const editExperience = (id, values) => writeExperience(id, () => updateExperience(id, values), actions.update);
export const removeExperience = (id) => writeExperience(id, () => deleteExperience(id), () => actions.delete(id));

// The API replaces the whole slot array, so each write starts from the latest catalog record.
export const changeExperienceSlots = (id, change) => writeExperience(id, (state) => {
  const experience = selectExperience(state, id);
  if (!experience) throw new ApiError(404, 'That experience is not in your catalog.');

  const { operation, slotId, values } = change;
  const { slots } = experience;
  if (operation === 'create') {
    const newId = `${id}-s-${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
    return saveExperienceSlots(id, [...slots, { id: newId, ...values, booked: 0, available: true }]);
  }
  if (!slots.some((slot) => slot.id === slotId)) throw new ApiError(404, 'That slot is no longer available.');

  const updated = operation === 'delete'
    ? slots.filter((slot) => slot.id !== slotId)
    : slots.map((slot) => slot.id === slotId ? { ...slot, ...values } : slot);
  return saveExperienceSlots(id, updated);
}, actions.update);

export default catalogSlice.reducer;
