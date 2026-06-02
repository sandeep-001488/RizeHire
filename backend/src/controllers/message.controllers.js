import Message from '../models/message.model.js';
import Application from '../models/application.model.js';
import User from '../models/user.model.js';
import Job from '../models/job.model.js';
import Notification from '../models/notification.model.js';
import { sendMessageNotificationEmail } from '../services/email.service.js';
import { io } from '../../app.js';

export const sendMessage = async (req, res) => {
  try {
    const { receiverId, message, applicationId } = req.body;
    const senderId = req.user._id;

    if (!receiverId || !message || !applicationId) {
      return res.status(400).json({
        success: false,
        message: 'Receiver ID, message, and application ID are required',
      });
    }

    const application = await Application.findById(applicationId)
      .populate('jobId')
      .populate('applicantId')
      .populate('recruiterId');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    // Sender must be a participant (applicant or recruiter) on this application
    const isApplicant = application.applicantId._id.toString() === senderId.toString();
    const isRecruiter = application.recruiterId._id.toString() === senderId.toString();

    if (!isApplicant && !isRecruiter) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to send messages in this conversation',
      });
    }

    // Receiver must be the other participant
    const expectedReceiverId = isApplicant
      ? application.recruiterId._id.toString()
      : application.applicantId._id.toString();

    if (receiverId !== expectedReceiverId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid receiver for this conversation',
      });
    }

    const conversationId = Message.createConversationId(
      application.jobId._id,
      application.applicantId._id,
      application.recruiterId._id
    );

    const newMessage = await Message.create({
      conversationId,
      applicationId: application._id,
      jobId: application.jobId._id,
      senderId,
      receiverId,
      message: message.trim(),
    });

    await newMessage.populate([
      { path: 'senderId', select: 'name email profileImage role' },
      { path: 'receiverId', select: 'name email profileImage role' },
      { path: 'jobId', select: 'title company' },
    ]);

    const receiver = await User.findById(receiverId);

    if (io) {
      io.to(`conversation:${conversationId}`).emit('newMessage', {
        message: newMessage,
        conversationId,
      });

      io.to(`user:${receiverId}`).emit('messageNotification', {
        message: newMessage,
        conversationId,
        unreadCount: await Message.getUnreadCount(receiverId),
      });

      console.log(`📨 Real-time message emitted to conversation: ${conversationId}`);
    }

    try {
      const notification = await Notification.createNotification(
        receiverId,
        'new_message',
        {
          title: 'New Message',
          description: `Message from ${req.user.name}: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`,
          icon: 'message-square',
          actionUrl: `/messages?application=${application._id}`,
          relatedIds: {
            conversationId,
            applicationId: application._id,
            jobId: application.jobId._id,
            fromUserId: req.user._id,
          },
        }
      );
    } catch (error) {
      console.error('Error creating notification for new message:', error);
    }

    sendMessageNotificationEmail(receiver, req.user, application.jobId, message, application._id)
      .then(() => {
        newMessage.emailSent = true;
        newMessage.emailSentAt = new Date();
        newMessage.save();
      })
      .catch((error) => {
        console.error('Failed to send email notification:', error.message);
      });

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message: newMessage },
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    const messages = await Message.getConversation(
      conversationId,
      parseInt(limit),
      parseInt(skip)
    );

    // Only participants may read the conversation
    if (messages.length > 0) {
      const firstMessage = messages[0];
      const isParticipant =
        firstMessage.senderId._id.toString() === req.user._id.toString() ||
        firstMessage.receiverId._id.toString() === req.user._id.toString();

      if (!isParticipant) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to view this conversation',
        });
      }
    }

    res.json({
      success: true,
      data: {
        messages: messages.reverse(),
        total: messages.length,
      },
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getUserConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Message.getUserConversations(userId);

    res.json({
      success: true,
      data: {
        conversations,
        total: conversations.length,
      },
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const markMessagesAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const result = await Message.updateMany(
      {
        conversationId,
        receiverId: userId,
        read: false,
      },
      {
        $set: {
          read: true,
          readAt: new Date(),
        },
      }
    );

    res.json({
      success: true,
      message: 'Messages marked as read',
      data: {
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;
    const count = await Message.getUnreadCount(userId);

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getConversationId = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const application = await Application.findById(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    const isApplicant = application.applicantId.toString() === req.user._id.toString();
    const isRecruiter = application.recruiterId.toString() === req.user._id.toString();

    if (!isApplicant && !isRecruiter) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access this conversation',
      });
    }

    const conversationId = Message.createConversationId(
      application.jobId,
      application.applicantId,
      application.recruiterId
    );

    res.json({
      success: true,
      data: {
        conversationId,
        applicationId: application._id,
        jobId: application.jobId,
        applicantId: application.applicantId,
        recruiterId: application.recruiterId,
      },
    });
  } catch (error) {
    console.error('Error getting conversation ID:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
