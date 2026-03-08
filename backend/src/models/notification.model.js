import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    // Notification recipient
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Notification type
    type: {
      type: String,
      enum: ['new_application', 'new_message', 'status_change'],
      required: true,
    },

    // Display title
    title: {
      type: String,
      required: true,
    },

    // Description/message
    description: {
      type: String,
      required: true,
    },

    // Icon type for UI
    icon: {
      type: String,
      enum: ['mail', 'message-square', 'check-circle', 'alert-circle'],
      required: true,
    },

    // URL to redirect to when clicked
    actionUrl: {
      type: String,
      required: true,
    },

    // Related IDs for context
    relatedIds: {
      applicationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Application',
      },
      conversationId: {
        type: String,
      },
      jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
      },
      fromUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },

    // Read status
    read: {
      type: Boolean,
      default: false,
      index: true,
    },

    // When marked as read
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

// Index for efficient queries
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });

// Static method to create notification
notificationSchema.statics.createNotification = async function(userId, type, data) {
  try {
    const notification = new this({
      userId,
      type,
      title: data.title,
      description: data.description,
      icon: data.icon,
      actionUrl: data.actionUrl,
      relatedIds: data.relatedIds || {},
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Static method to get unread count for a user
notificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({
    userId,
    read: false,
  });
};

// Static method to get all notifications for a user (paginated)
notificationSchema.statics.getNotifications = async function(userId, skip = 0, limit = 20) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('relatedIds.fromUserId', 'name profileImage')
    .lean();
};

// Static method to mark as read
notificationSchema.statics.markAsRead = async function(notificationId) {
  return this.findByIdAndUpdate(
    notificationId,
    {
      read: true,
      readAt: new Date(),
    },
    { new: true }
  );
};

// Static method to delete notification
notificationSchema.statics.deleteNotification = async function(notificationId) {
  return this.findByIdAndDelete(notificationId);
};

// Static method to clear all unread notifications for a user
notificationSchema.statics.clearAllUnread = async function(userId) {
  return this.updateMany(
    { userId, read: false },
    { read: true, readAt: new Date() }
  );
};

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
