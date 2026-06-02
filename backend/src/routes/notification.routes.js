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

router.use(protect);

// Must be before /:id routes
router.get('/unread/count', getUnreadCount);

// Must be before /:id routes
router.put('/read/all', markAllAsRead);

router.get('/', getNotifications);
router.put('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

export default router;
