import { createAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { ApiError } from '@/services/ApiError.js';
import { selectHotelAccountId, selectSessionVersion } from '../sessionSlice.js';

const INITIAL_ENTRY = { data: null, status: 'idle', error: null, fetchedAt: null, requestId: null, revision: 0 };
export const LIST = 'list';
export const selectEntry = (state, resource, key = LIST) => state.hotel[resource].entries[key] ?? INITIAL_ENTRY;
export const invalidateHotelData = createAction('hotel/invalidate');

function errorDetails(error) {
  return { status: error?.status ?? null, message: error?.message || 'Something went wrong.' };
}

function requireHotelSession(getState, accountId, version) {
  const state = getState();
  if (!accountId || selectHotelAccountId(state) !== accountId || selectSessionVersion(state) !== version) {
    throw new ApiError(403, 'Sign in as this hotel partner to continue.');
  }
}

function runRequest(type, work, options) {
  return createAsyncThunk(type, async (args, { dispatch, getState, rejectWithValue }) => {
    const version = selectSessionVersion(getState());
    const checkSession = () => requireHotelSession(getState, args.accountId, version);
    try {
      checkSession();
      return await work(args, { dispatch, getState, checkSession });
    } catch (error) {
      return rejectWithValue(errorDetails(error));
    }
  }, options);
}

export function createReadThunk(resource, load) {
  return runRequest(`hotel/${resource}/fetch`, async (args, { checkSession }) => {
    const data = await load(args);
    checkSession();
    return { data, fetchedAt: Date.now() };
  }, {
    condition({ accountId, key = LIST, force = false, maxAge = 30_000 }, { getState }) {
      const state = getState();
      if (!accountId || selectHotelAccountId(state) !== accountId) return false;
      const entry = selectEntry(state, resource, key);
      return entry.status !== 'pending' && (force || entry.fetchedAt === null || Date.now() - entry.fetchedAt >= maxAge);
    },
  });
}

export function createWriteThunk(type, request, applyChanges) {
  return runRequest(`hotel/${type}`, async (args, { dispatch, getState, checkSession }) => {
    const result = await request(args);
    checkSession();
    applyChanges?.(result, args, dispatch, getState);
    return result;
  });
}

function ensureEntry(state, key = LIST) {
  return state.entries[key] ??= { ...INITIAL_ENTRY };
}

function read(state, { payload: { key, data, fetchedAt = null } }) {
  const entry = ensureEntry(state, key);
  Object.assign(entry, { data, status: 'succeeded', error: null, fetchedAt, requestId: null });
}

function addRequestReducers(builder, resource, fetch) {
  builder
    .addCase(fetch.pending, (state, { meta }) => {
      const entry = ensureEntry(state, meta.arg.key);
      Object.assign(entry, { status: 'pending', requestId: meta.requestId, error: null });
    })
    .addCase(fetch.fulfilled, (state, action) => {
      const { arg, requestId } = action.meta;
      if (state.entries[arg.key ?? LIST]?.requestId === requestId) {
        read(state, { payload: { key: arg.key, ...action.payload } });
      }
    })
    .addCase(fetch.rejected, (state, { meta, payload, error }) => {
      const entry = state.entries[meta.arg.key ?? LIST];
      if (!entry || entry.requestId !== meta.requestId) return;
      Object.assign(entry, { status: 'failed', requestId: null, error: payload ?? error });
    })
    .addCase(invalidateHotelData, (state, { payload }) => {
      if (!payload.includes(resource)) return;
      for (const entry of Object.values(state.entries)) {
        Object.assign(entry, { status: 'idle', error: null, requestId: null, fetchedAt: null });
        entry.revision += 1;
      }
    });
}

export function createRepositorySlice(resource, fetch, selectId = (record) => record.id) {
  return createSlice({
    name: `hotel/${resource}`,
    initialState: { entries: {} },
    reducers: {
      create(state, { payload: { key, record } }) {
        const entry = ensureEntry(state, key);
        const records = entry.data ??= [];
        if (!records.some((item) => selectId(item) === selectId(record))) {
          records.unshift(record);
        }
      },
      read,
      update(state, { payload: { key, record, replace = false, fetchedAt } }) {
        const entry = ensureEntry(state, key);
        if (replace) {
          read(state, { payload: { key, data: [record], fetchedAt } });
          return;
        }
        const index = entry.data?.findIndex((item) => selectId(item) === selectId(record)) ?? -1;
        if (index >= 0) entry.data[index] = { ...entry.data[index], ...record };
      },
      delete(state, { payload: { key, id } }) {
        const entry = ensureEntry(state, key);
        if (entry.data) entry.data = entry.data.filter((item) => selectId(item) !== id);
      },
    },
    extraReducers: (builder) => addRequestReducers(builder, resource, fetch),
  });
}

// Earnings is a server projection of bookings, without its own repository or CRUD writes.
export function createProjectionSlice(resource, fetch) {
  return createSlice({
    name: `hotel/${resource}`,
    initialState: { entries: {} },
    reducers: {},
    extraReducers: (builder) => addRequestReducers(builder, resource, fetch),
  });
}
