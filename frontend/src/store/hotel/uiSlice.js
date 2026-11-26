import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'hotel/ui',
  initialState: {},
  reducers: {
    setField(state, { payload: { key, value } }) { state[key] = value; },
    clearField(state, { payload: key }) { delete state[key]; },
  },
});

export const { setField, clearField } = uiSlice.actions;
export const hotelUiReducer = uiSlice.reducer;
