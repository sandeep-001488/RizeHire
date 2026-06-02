import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ['new_application', 'new_message', 'status_change'],
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    icon: {
      type: String,
      enum: ['mail', 'message-square', 'check-circle', 'alert-circle'],
      required: true,
    },

    actionUrl: {
      type: String,
      required: true,
    },

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

    read: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });

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

notificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({
    userId,
    read: false,
  });
};

notificationSchema.statics.getNotifications = async function(userId, skip = 0, limit = 20) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('relatedIds.fromUserId', 'name profileImage')
    .lean();
};

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

notificationSchema.statics.deleteNotification = async function(notificationId) {
  return this.findByIdAndDelete(notificationId);
};

notificationSchema.statics.clearAllUnread = async function(userId) {
  return this.updateMany(
    { userId, read: false },
    { read: true, readAt: new Date() }
  );
};

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
