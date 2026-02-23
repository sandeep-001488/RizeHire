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

// All routes require authentication
router.use(protect);

// Send a message
router.post('/send', sendMessage);

// Get all conversations for current user
router.get('/conversations', getUserConversations);

// Get conversation history
router.get('/conversation/:conversationId', getConversation);

// Mark messages as read in a conversation
router.put('/read/:conversationId', markMessagesAsRead);

// Get unread message count
router.get('/unread/count', getUnreadCount);

// Get conversation ID for an application
router.get('/conversation-id/:applicationId', getConversationId);

export default router;
