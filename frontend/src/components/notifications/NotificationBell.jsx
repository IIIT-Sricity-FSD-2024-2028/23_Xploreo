import { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '@/foundation';
import { useHotelAction, usePartnerNotifications } from '@/store/hotel/hooks.js';
import { readAllPartnerNotifications, readPartnerNotification } from '@/store/hotel/notificationsSlice.js';
import { useHotelState } from '@/store/hotel/useHotelState.js';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  selectNotificationsList,
  selectUnreadNotificationCount,
} from '../../features/notificationsSlice.js';
import {
  fetchExperienceNotifications,
  markExperienceNotificationAsRead,
  markAllExperienceNotificationsAsRead,
  selectExperienceNotificationsList,
  selectExperienceNotificationsUnreadCount,
} from '@/store/experience/notificationsSlice.js';
import './notifications.css';

function formatRelativeTime(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function getNotificationIcon(type, refundStatus) {
  if (type === 'REFUND_PROCESSED' || refundStatus === 'SUCCESS') {
    return { icon: '₹', className: 'notif-icon-refund-success' };
  }
  if (type === 'REFUND_FAILED' || refundStatus === 'FAILED') {
    return { icon: '⚠️', className: 'notif-icon-refund-failed' };
  }
  if (type === 'BOOKING_CANCELLED') {
    return { icon: '✕', className: 'notif-icon-cancelled' };
  }
  return { icon: 'ℹ️', className: 'notif-icon-info' };
}

const EMPTY_NOTIFICATIONS = [];

export default function NotificationBell({ hotelPartner = false, userId = null }) {
  const { user } = useAuth();
  if (hotelPartner) return <HotelNotificationBell />;
  if (user?.role === 'experience') return <ExperienceNotificationBell />;
  return <StandardNotificationBell userId={userId} />;
}

function ExperienceNotificationBell() {
  const dispatch = useDispatch();
  const [isOpen, setIsOpen] = useState(false);
  const notifications = useSelector(selectExperienceNotificationsList);
  const unreadCount = useSelector(selectExperienceNotificationsUnreadCount);

  const refresh = useCallback(() => {
    dispatch(fetchExperienceNotifications());
  }, [dispatch]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  const markRead = (notification) => {
    dispatch(markExperienceNotificationAsRead(notification.id));
  };

  const markAllRead = () => {
    dispatch(markAllExperienceNotificationsAsRead());
  };

  return (
    <NotificationBellView
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      notifications={notifications}
      unreadCount={unreadCount}
      refresh={refresh}
      onRead={markRead}
      onReadAll={markAllRead}
    />
  );
}

function HotelNotificationBell() {
  const [isOpen, setIsOpen] = useHotelState(false);
  const { accountId, data, reload } = usePartnerNotifications();
  const markRead = useHotelAction(readPartnerNotification);
  const markAllRead = useHotelAction(readAllPartnerNotifications);
  const notifications = data ?? EMPTY_NOTIFICATIONS;

  useEffect(() => {
    const interval = setInterval(reload, 10000);
    window.addEventListener('focus', reload);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', reload);
    };
  }, [reload]);

  return (
    <NotificationBellView
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      notifications={notifications}
      unreadCount={notifications.filter((item) => !item.read).length}
      refresh={reload}
      onRead={(notification) => markRead({ accountId, id: notification.id })}
      onReadAll={() => markAllRead({ accountId })}
    />
  );
}

function StandardNotificationBell({ userId = null }) {
  const dispatch = useDispatch();
  const notifications = useSelector(selectNotificationsList);
  const unreadCount = useSelector(selectUnreadNotificationCount);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotificationData = useCallback(() => {
    dispatch(fetchNotifications(userId || null));
  }, [dispatch, userId]);

  // Poll for notifications every 10 seconds or on window focus
  useEffect(() => {
    const initialPoll = setTimeout(fetchNotificationData, 0);
    const interval = setInterval(fetchNotificationData, 10000);
    const onFocus = () => fetchNotificationData();
    window.addEventListener('focus', onFocus);
    return () => {
      clearTimeout(initialPoll);
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchNotificationData]);

  const markRead = async (notification) => {
    try {
      await dispatch(markNotificationRead(notification.id)).unwrap();
    } catch {
      // Keep the last known notification state.
    }
  };

  const markAllRead = async () => {
    try {
      await dispatch(markAllNotificationsRead()).unwrap();
    } catch {
      // Keep the last known notification state.
    }
  };

  return (
    <NotificationBellView
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      notifications={notifications}
      unreadCount={unreadCount}
      refresh={fetchNotificationData}
      onRead={markRead}
      onReadAll={markAllRead}
    />
  );
}

function NotificationBellView({ isOpen, setIsOpen, notifications, unreadCount, refresh, onRead, onReadAll }) {
  const containerRef = useRef(null);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, setIsOpen]);

  const handleToggle = () => {
    if (!isOpen) {
      refresh();
    }
    setIsOpen((prev) => !prev);
  };

  const handleItemClick = (notification) => {
    if (!notification.read) onRead(notification);
  };

  return (
    <div className="notif-bell-container" ref={containerRef} data-testid="notification-bell-container">
      <button
        type="button"
        className="notif-bell-btn"
        onClick={handleToggle}
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-expanded={isOpen}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="notif-badge" data-testid="notification-unread-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notif-popover" role="dialog" aria-label="Notifications popover">
          <div className="notif-header">
            <h4 className="notif-header-title">
              Notifications
              {unreadCount > 0 && <span className="notif-count-tag">{unreadCount} new</span>}
            </h4>
            {unreadCount > 0 && (
              <button
                type="button"
                className="notif-mark-all-btn"
                onClick={onReadAll}
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="notif-empty">
              <div className="notif-empty-icon" aria-hidden="true">🔔</div>
              <p className="notif-empty-text">No notifications yet</p>
            </div>
          ) : (
            <ul className="notif-list">
              {notifications.map((n) => {
                const { icon, className } = getNotificationIcon(n.type, n.refundStatus);
                return (
                  <li
                    key={n.id}
                    className={`notif-item ${!n.read ? 'is-unread' : ''}`}
                    onClick={() => handleItemClick(n)}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleItemClick(n);
                    }}
                  >
                    <div className={`notif-icon-wrap ${className}`} aria-hidden="true">
                      {icon}
                    </div>
                    <div className="notif-content">
                      <div className="notif-title-row">
                        <h5 className="notif-item-title">{n.title}</h5>
                        {!n.read && <span className="notif-unread-dot" title="Unread" />}
                      </div>
                      <p className="notif-item-msg">{n.message}</p>
                      <span className="notif-time">{formatRelativeTime(n.createdAt)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
