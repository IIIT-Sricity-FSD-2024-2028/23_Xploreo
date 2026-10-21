import { apiRequest } from './api.js';

const enc = encodeURIComponent;

export async function getNotifications() {
  try {
    const res = await apiRequest('/notifications');
    return Array.isArray(res) ? res : res?.data || [];
  } catch (err) {
    console.warn('Failed to load notifications:', err?.message);
    return [];
  }
}

export async function getUnreadNotificationCount() {
  try {
    const res = await apiRequest('/notifications/unread-count');
    return res?.unreadCount || 0;
  } catch (err) {
    console.warn('Failed to load unread count:', err?.message);
    return 0;
  }
}

export function markNotificationAsRead(id) {
  return apiRequest(`/notifications/${enc(id)}/read`, { method: 'PATCH' });
}

export function markAllNotificationsAsRead() {
  return apiRequest('/notifications/read-all', { method: 'PATCH' });
}
