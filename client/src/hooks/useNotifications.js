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

  // Initialize notifications on mount
  useEffect(() => {
    if (!user?._id) return;

    // Fetch initial unread count
    fetchUnreadCount().catch((error) => {
      console.error('Failed to fetch initial unread count:', error);
    });

    // Fetch initial notifications (first 20)
    fetchNotifications(0, 20).catch((error) => {
      console.error('Failed to fetch initial notifications:', error);
    });
  }, [user?._id, fetchUnreadCount, fetchNotifications]);

  // Handle real-time notification events via Socket.IO
  const setupSocketListeners = useCallback(() => {
    const socket = getSocket();
    if (!socket) return;

    // Listen for new applications (recruiter)
    socket.on('applicationReceived', (data) => {
      console.log('📬 New application received:', data);
      // The notification should already be created on backend
      // Just trigger a count update for real-time UI
      fetchUnreadCount();
    });

    // Listen for application status changes (seeker)
    socket.on('applicationStatusChanged', (data) => {
      console.log('📝 Application status changed:', data);
      fetchUnreadCount();
    });

    // Listen for new messages
    socket.on('messageNotification', (data) => {
      console.log('💬 New message notification:', data);
      fetchUnreadCount();
    });

    // Cleanup
    return () => {
      socket.off('applicationReceived');
      socket.off('applicationStatusChanged');
      socket.off('messageNotification');
    };
  }, [fetchUnreadCount]);

  // Set up listeners when socket is ready
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
