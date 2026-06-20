const asyncHandler = require('../utils/asyncHandler');
const { User, Conversation, Message } = require('../models');
const { Op } = require('sequelize');
const socketIo = require('../socket');

// @desc    Get all conversations for a user
// @route   GET /api/messages/conversations
// @access  Private
exports.getConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.findAll({
    where: {
      [Op.or]: [{ user1Id: req.user.id }, { user2Id: req.user.id }]
    },
    include: [
      { model: User, as: 'user1', attributes: ['id', 'username', 'profilePic', 'fullName'] },
      { model: User, as: 'user2', attributes: ['id', 'username', 'profilePic', 'fullName'] }
    ],
    order: [['updatedAt', 'DESC']]
  });

  // Attach last message
  const convsWithLastMessage = await Promise.all(conversations.map(async (conv) => {
    const lastMessage = await Message.findOne({
      where: { conversationId: conv.id },
      order: [['createdAt', 'DESC']]
    });
    
    // Find unread count
    const unreadCount = await Message.count({
      where: {
        conversationId: conv.id,
        senderId: { [Op.ne]: req.user.id },
        isRead: false
      }
    });

    const plainConv = conv.get({ plain: true });
    plainConv.lastMessage = lastMessage;
    plainConv.unreadCount = unreadCount;
    
    // Determine the 'other' user. Compare using UUID strings safely.
    if (plainConv.user1.id.toString() === req.user.id.toString()) {
      plainConv.otherUser = plainConv.user2;
    } else {
      plainConv.otherUser = plainConv.user1;
    }
    
    return plainConv;
  }));
  
  // Sort by latest message or updatedAt
  convsWithLastMessage.sort((a, b) => {
    const dateA = a.lastMessage ? new Date(a.lastMessage.createdAt) : new Date(a.updatedAt);
    const dateB = b.lastMessage ? new Date(b.lastMessage.createdAt) : new Date(b.updatedAt);
    return dateB - dateA;
  });

  res.json(convsWithLastMessage);
});

// @desc    Get messages between logged in user and another user
// @route   GET /api/messages/:userId
// @access  Private
exports.getMessages = asyncHandler(async (req, res) => {
  const otherUserId = req.params.userId;
  
  // Validate UUID to prevent Postgres cast errors
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!otherUserId || !uuidRegex.test(otherUserId)) {
    return res.status(400).json({ message: 'Invalid user ID format' });
  }
  
  let conversation = await Conversation.findOne({
    where: {
      [Op.or]: [
        { user1Id: req.user.id, user2Id: otherUserId },
        { user1Id: otherUserId, user2Id: req.user.id }
      ]
    }
  });

  if (!conversation) {
    return res.json([]);
  }

  const messages = await Message.findAll({
    where: { conversationId: conversation.id },
    order: [['createdAt', 'ASC']]
  });

  res.json(messages);
});

// @desc    Send a message
// @route   POST /api/messages/:userId
// @access  Private
exports.sendMessage = asyncHandler(async (req, res) => {
  const receiverId = req.params.userId;
  const { text } = req.body;

  if (!text) {
    res.status(400);
    throw new Error('Message text is required');
  }

  let conversation = await Conversation.findOne({
    where: {
      [Op.or]: [
        { user1Id: req.user.id, user2Id: receiverId },
        { user1Id: receiverId, user2Id: req.user.id }
      ]
    }
  });

  if (!conversation) {
    conversation = await Conversation.create({
      user1Id: req.user.id,
      user2Id: receiverId
    });
  }

  const message = await Message.create({
    conversationId: conversation.id,
    senderId: req.user.id,
    text
  });

  // Update conversation timestamp explicitly
  conversation.changed('updatedAt', true);
  conversation.updatedAt = new Date();
  await conversation.save();

  // Socket.io Real-time Event
  try {
    const io = socketIo.getIo();
    const receiverSocketId = socketIo.getUserSocket(receiverId);
    
    // Emit to receiver if online
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('newMessage', message);
    }
  } catch (err) {
    console.error('Socket error in sendMessage:', err);
  }

  res.status(201).json(message);
});

// @desc    Mark messages as read
// @route   PUT /api/messages/:userId/read
// @access  Private
exports.markAsRead = asyncHandler(async (req, res) => {
  const otherUserId = req.params.userId;
  
  const conversation = await Conversation.findOne({
    where: {
      [Op.or]: [
        { user1Id: req.user.id, user2Id: otherUserId },
        { user1Id: otherUserId, user2Id: req.user.id }
      ]
    }
  });

  if (conversation) {
    await Message.update(
      { isRead: true },
      { 
        where: { 
          conversationId: conversation.id,
          senderId: otherUserId,
          isRead: false
        } 
      }
    );
  }

  res.json({ success: true });
});
