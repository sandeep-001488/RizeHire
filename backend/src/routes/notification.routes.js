import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  deleteNotification,
  markAllAsRead,
} from '../controllers/notification.controllers.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// GET unread notification count for the current user (must be before /:id routes)
router.get('/unread/count', getUnreadCount);

// PUT mark all notifications as read (must be before /:id routes)
router.put('/read/all', markAllAsRead);

// GET all notifications for the current user (paginated)
router.get('/', getNotifications);

// PUT mark a specific notification as read
router.put('/:id/read', markAsRead);

// DELETE a specific notification
router.delete('/:id', deleteNotification);

export default router;
