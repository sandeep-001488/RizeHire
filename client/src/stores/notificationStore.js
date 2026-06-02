'use client';

import { create } from 'zustand';
import api from '@/lib/api';

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isFetching: false,

  setNotifications: (notifications) => set({ notifications }),
  setUnreadCount: (count) => set({ unreadCount: count }),
  setLoading: (isLoading) => set({ isLoading }),
  setFetching: (isFetching) => set({ isFetching }),

  fetchUnreadCount: async () => {
    try {
      const response = await api.get('/notifications/unread/count');
      if (response.data.success) {
        set({ unreadCount: response.data.data.unreadCount });
        return response.data.data.unreadCount;
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
      throw error.response?.data || error;
    }
  },

  fetchNotifications: async (skip = 0, limit = 20) => {
    try {
      set({ isFetching: true });
      const response = await api.get('/notifications', {
        params: { skip, limit },
      });

      if (response.data.success) {
        set({
          notifications: response.data.data.notifications,
        });
        return response.data.data;
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error.response?.data || error;
    } finally {
      set({ isFetching: false });
    }
  },

  markAsRead: async (notificationId) => {
    try {
      const response = await api.put(`/notifications/${notificationId}/read`);
      if (response.data.success) {
        set((state) => ({
          notifications: state.notifications.map((notif) =>
            notif._id === notificationId
              ? { ...notif, read: true, readAt: new Date() }
              : notif
          ),
        }));

        await get().fetchUnreadCount();
        return response.data.data.notification;
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error.response?.data || error;
    }
  },

  markAllAsRead: async () => {
    try {
      const response = await api.put('/notifications/read/all');
      if (response.data.success) {
        set((state) => ({
          notifications: state.notifications.map((notif) => ({
            ...notif,
            read: true,
            readAt: new Date(),
          })),
          unreadCount: 0,
        }));
        return response.data;
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error.response?.data || error;
    }
  },

  deleteNotification: async (notificationId) => {
    try {
      const response = await api.delete(`/notifications/${notificationId}`);
      if (response.data.success) {
        set((state) => ({
          notifications: state.notifications.filter(
            (notif) => notif._id !== notificationId
          ),
        }));

        await get().fetchUnreadCount();
        return response.data;
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error.response?.data || error;
    }
  },

  addNotificationRealtime: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  removeNotification: (notificationId) => {
    set((state) => ({
      notifications: state.notifications.filter(
        (notif) => notif._id !== notificationId
      ),
    }));
  },

  clearAllNotifications: () => {
    set({
      notifications: [],
      unreadCount: 0,
    });
  },
}));

export default useNotificationStore;
