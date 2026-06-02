import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    // Conversation identifier: combines job + applicant + recruiter
    conversationId: {
      type: String,
      required: true,
      index: true,
    },

    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
    },

    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },

    read: {
      type: Boolean,
      default: false,
    },

    readAt: {
      type: Date,
    },

    emailSent: {
      type: Boolean,
      default: false,
    },

    emailSentAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, receiverId: 1 });
messageSchema.index({ receiverId: 1, read: 1 }); // For unread count

messageSchema.virtual('participants', function() {
  return [this.senderId, this.receiverId];
});

messageSchema.methods.markAsRead = async function() {
  if (!this.read) {
    this.read = true;
    this.readAt = new Date();
    await this.save();
  }
  return this;
};

messageSchema.statics.getConversation = async function(conversationId, limit = 50, skip = 0) {
  return this.find({ conversationId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('senderId', 'name email profileImage')
    .populate('receiverId', 'name email profileImage')
    .lean();
};

messageSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({
    receiverId: userId,
    read: false,
  });
};

messageSchema.statics.getUserConversations = async function(userId) {
  const conversations = await this.aggregate([
    {
      $match: {
        $or: [
          { senderId: new mongoose.Types.ObjectId(userId) },
          { receiverId: new mongoose.Types.ObjectId(userId) },
        ],
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $group: {
        _id: '$conversationId',
        lastMessage: { $first: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$receiverId', new mongoose.Types.ObjectId(userId)] },
                  { $eq: ['$read', false] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $sort: { 'lastMessage.createdAt': -1 },
    },
  ]);

  await this.populate(conversations, [
    {
      path: 'lastMessage.senderId',
      select: 'name email profileImage role',
    },
    {
      path: 'lastMessage.receiverId',
      select: 'name email profileImage role',
    },
    {
      path: 'lastMessage.jobId',
      select: 'title company',
    },
    {
      path: 'lastMessage.applicationId',
      select: 'status',
    },
  ]);

  return conversations;
};

messageSchema.statics.createConversationId = function(jobId, applicantId, recruiterId) {
  // Sort IDs to ensure consistent conversationId regardless of who sends first
  const ids = [applicantId.toString(), recruiterId.toString()].sort();
  return `${jobId}-${ids[0]}-${ids[1]}`;
};

const Message = mongoose.model('Message', messageSchema);

export default Message;
