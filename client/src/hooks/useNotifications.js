import { useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import useNotificationStore from '@/stores/notificationStore';
import { getSocket } from '@/lib/socket';

/**
 * Custom hook to manage notification lifecycle
 * - Initializes notification store
 * - Fetches initial unread count
 * - Sets up Socket.IO listeners
 * - Cleans up on unmount
 */
export const useNotifications = () => {
  const { user } = useAuthStore();
  const {
    unreadCount,
    notifications,
    fetchUnreadCount,
    fetchNotifications,
    addNotificationRealtime,
    markAsRead,
    deleteNotification,
  } = useNotificationStore();

  useEffect(() => {
    if (!user?._id) return;

    fetchUnreadCount().catch((error) => {
      console.error('Failed to fetch initial unread count:', error);
    });

    fetchNotifications(0, 20).catch((error) => {
      console.error('Failed to fetch initial notifications:', error);
    });
  }, [user?._id, fetchUnreadCount, fetchNotifications]);

  const setupSocketListeners = useCallback(() => {
    const socket = getSocket();
    if (!socket) return;

    // Notification is created on the backend; just refresh the count for real-time UI
    socket.on('applicationReceived', (data) => {
      console.log('📬 New application received:', data);
      fetchUnreadCount();
    });

    socket.on('applicationStatusChanged', (data) => {
      console.log('📝 Application status changed:', data);
      fetchUnreadCount();
    });

    socket.on('messageNotification', (data) => {
      console.log('💬 New message notification:', data);
      fetchUnreadCount();
    });

    return () => {
      socket.off('applicationReceived');
      socket.off('applicationStatusChanged');
      socket.off('messageNotification');
    };
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (!user?._id) return;

    // Small delay to ensure socket is initialized
    const timer = setTimeout(() => {
      setupSocketListeners();
    }, 100);

    return () => {
      clearTimeout(timer);
      const cleanup = setupSocketListeners();
      if (cleanup) cleanup();
    };
  }, [user?._id, setupSocketListeners]);

  return {
    unreadCount,
    notifications,
    fetchUnreadCount,
    fetchNotifications,
    addNotificationRealtime,
    markAsRead,
    deleteNotification,
  };
};
