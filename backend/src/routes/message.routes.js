import express from 'express';
import {
  sendMessage,
  getConversation,
  getUserConversations,
  markMessagesAsRead,
  getUnreadCount,
  getConversationId,
} from '../controllers/message.controllers.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.post('/send', sendMessage);
router.get('/conversations', getUserConversations);
router.get('/conversation/:conversationId', getConversation);
router.put('/read/:conversationId', markMessagesAsRead);
router.get('/unread/count', getUnreadCount);
router.get('/conversation-id/:applicationId', getConversationId);

export default router;
