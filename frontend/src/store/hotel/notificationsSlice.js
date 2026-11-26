import { request } from '@/services/request.js';
import { markAllNotificationsAsRead, markNotificationAsRead } from '@/services/notifications.api.js';
import { createReadThunk, createRepositorySlice, createWriteThunk, invalidateHotelData, selectEntry } from './resource.js';

export const fetchPartnerNotifications = createReadThunk('notifications', async () => {
  const response = await request('/notifications');
  return Array.isArray(response) ? response : response?.data ?? [];
});
export const notificationsSlice = createRepositorySlice('notifications', fetchPartnerNotifications);

export const readPartnerNotification = createWriteThunk('notifications/markRead', ({ id }) => markNotificationAsRead(id),
  (record, { id }, dispatch) => {
    dispatch(notificationsSlice.actions.update({ record: { ...record, id, read: true } }));
    dispatch(invalidateHotelData(['notifications']));
  });

export const readAllPartnerNotifications = createWriteThunk('notifications/markAllRead', markAllNotificationsAsRead,
  (_result, _args, dispatch, getState) => {
    const { data } = selectEntry(getState(), 'notifications');
    if (data) dispatch(notificationsSlice.actions.read({ data: data.map((record) => ({ ...record, read: true })) }));
    dispatch(invalidateHotelData(['notifications']));
  });
