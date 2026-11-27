import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/services/notifications.api.js';

export const fetchExperienceNotifications = createAsyncThunk(
  'experience/notifications/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const [list, count] = await Promise.all([
        getNotifications(),
        getUnreadNotificationCount(),
      ]);
      return {
        list: Array.isArray(list) ? list : [],
        unreadCount: typeof count === 'number' ? count : 0,
      };
    } catch (error) {
      return rejectWithValue({
        status: error?.status ?? null,
        message: error?.message || 'Failed to fetch notifications',
      });
    }
  }
);

export const markExperienceNotificationAsRead = createAsyncThunk(
  'experience/notifications/markRead',
  async (id, { rejectWithValue }) => {
    try {
      await markNotificationAsRead(id);
      return id;
    } catch (error) {
      return rejectWithValue(error?.message);
    }
  }
);

export const markAllExperienceNotificationsAsRead = createAsyncThunk(
  'experience/notifications/markAllRead',
  async (_, { rejectWithValue }) => {
    try {
      await markAllNotificationsAsRead();
      return true;
    } catch (error) {
      return rejectWithValue(error?.message);
    }
  }
);

const notificationsSlice = createSlice({
  name: 'experience/notifications',
  initialState: {
    items: [],
    unreadCount: 0,
    loading: false,
    error: null,
  },
  reducers: {
    clearNotifications(state) {
      state.items = [];
      state.unreadCount = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchExperienceNotifications.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchExperienceNotifications.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.items = payload.list;
        state.unreadCount = payload.unreadCount;
        state.error = null;
      })
      .addCase(fetchExperienceNotifications.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      .addCase(markExperienceNotificationAsRead.fulfilled, (state, { payload }) => {
        const item = state.items.find((n) => n.id === payload);
        if (item && !item.read) {
          item.read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markAllExperienceNotificationsAsRead.fulfilled, (state) => {
        state.items.forEach((item) => {
          item.read = true;
        });
        state.unreadCount = 0;
      });
  },
});

export const { clearNotifications } = notificationsSlice.actions;

export const selectExperienceNotificationsState = (state) => state.experience.notifications;
export const selectExperienceNotificationsList = (state) => state.experience.notifications?.items ?? [];
export const selectExperienceNotificationsUnreadCount = (state) => state.experience.notifications?.unreadCount ?? 0;

export default notificationsSlice.reducer;
