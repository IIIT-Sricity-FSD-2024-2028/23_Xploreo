import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../services/notifications.api.js';
import { loginUser, logoutSession, logoutUser, registerUser, restoreAuthSession, setAuthUser } from './authSlice.js';

const EMPTY_LIST = [];

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (userId = null, { rejectWithValue }) => {
    try {
      const [list, count] = await Promise.all([
        getNotifications(),
        getUnreadNotificationCount(),
      ]);
      return {
        userId: userId || null,
        items: Array.isArray(list) ? list : [],
        unreadCount: typeof count === 'number' ? count : 0,
      };
    } catch (error) {
      return rejectWithValue(error?.message || 'Failed to load notifications.');
    }
  },
);

export const markNotificationRead = createAsyncThunk(
  'notifications/markNotificationRead',
  async (notificationId, { rejectWithValue }) => {
    try {
      await markNotificationAsRead(notificationId);
      return notificationId;
    } catch (error) {
      return rejectWithValue(error?.message || 'Failed to mark notification as read.');
    }
  },
);

export const markAllNotificationsRead = createAsyncThunk(
  'notifications/markAllNotificationsRead',
  async (_, { rejectWithValue }) => {
    try {
      await markAllNotificationsAsRead();
      return true;
    } catch (error) {
      return rejectWithValue(error?.message || 'Failed to mark notifications as read.');
    }
  },
);

const initialState = {
  items: [],
  unreadCount: 0,
  loading: false,
  actionLoading: false,
  error: null,
  lastFetchedAt: null,
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    clearNotificationsError(state) {
      state.error = null;
    },
    resetNotificationsState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.items = Array.isArray(action.payload?.items) ? action.payload.items : [];
        state.unreadCount = typeof action.payload?.unreadCount === 'number' ? action.payload.unreadCount : 0;
        state.lastFetchedAt = Date.now();
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message || 'Failed to load notifications.';
      })
      .addCase(markNotificationRead.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        state.actionLoading = false;
        const id = action.payload;
        let decremented = false;
        state.items = state.items.map((n) => {
          if (n.id === id && !n.read) {
            decremented = true;
            return { ...n, read: true };
          }
          return n;
        });
        if (decremented) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markNotificationRead.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload || action.error?.message || 'Failed to mark notification as read.';
      })
      .addCase(markAllNotificationsRead.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.actionLoading = false;
        state.items = state.items.map((n) => ({ ...n, read: true }));
        state.unreadCount = 0;
      })
      .addCase(markAllNotificationsRead.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload || action.error?.message || 'Failed to mark notifications as read.';
      })
      .addCase(logoutUser, () => initialState)
      .addCase(logoutSession.fulfilled, () => initialState)
      .addCase(restoreAuthSession.rejected, () => initialState)
      .addCase(setAuthUser, () => initialState)
      .addCase(loginUser.fulfilled, () => initialState)
      .addCase(registerUser.fulfilled, () => initialState);
  },
});

export const { clearNotificationsError, resetNotificationsState } = notificationsSlice.actions;

export const selectNotificationsList = (state) => state.notifications?.items || EMPTY_LIST;
export const selectUnreadNotificationCount = (state) => state.notifications?.unreadCount || 0;
export const selectNotificationsLoading = (state) => Boolean(state.notifications?.loading);
export const selectNotificationActionLoading = (state) => Boolean(state.notifications?.actionLoading);
export const selectNotificationsError = (state) => state.notifications?.error || null;

export default notificationsSlice.reducer;
