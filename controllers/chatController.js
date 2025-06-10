const { Chat, ChatUser, Message, MessageFile, User, Team } = require('../models');
const { Op } = require('sequelize');
const { getIO } = require('../utils/socket');

console.log('Models in chatController:', { Chat, ChatUser, Message, MessageFile, User, Team });

const chatController = {
  createChat: async (req, res) => {
  try {
      const { name, isGroup = false, userIds = [] } = req.body;
      const ownerId = req.user.id;
      if (!name || (!isGroup && userIds.length !== 1)) {
        return res.status(400).json({ error: 'Invalid chat data' });
    }
      const chat = await Chat.create({ name, isGroup, ownerId });
      await ChatUser.create({ chatId: chat.id, userId: ownerId, role: 'admin' });
      for (const uid of userIds) {
        if (uid !== ownerId) {
          await ChatUser.create({ chatId: chat.id, userId: uid, role: 'member' });
        }
      }
      const fullChat = await Chat.findByPk(chat.id, {
        include: [{ model: ChatUser, as: 'users' }]
    });
      res.status(201).json(fullChat);
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({ error: error.message });
  }
  },

  getChats: async (req, res) => {
    try {
      const userId = req.user.uid;
      const chatUsers = await ChatUser.findAll({ where: { userId } });
      const chatIds = chatUsers.map(cu => cu.chatId);
      const chats = await Chat.findAll({
        where: { id: chatIds },
        include: [{ model: ChatUser, as: 'users' }],
        order: [['updatedAt', 'DESC']]
      });
      res.json(chats);
    } catch (error) {
      console.error('Error getting chats:', error);
      res.status(500).json({ error: error.message });
    }
  },

  getChatById: async (req, res) => {
    try {
      const { chatId } = req.params;
      const chat = await Chat.findByPk(chatId, {
        include: [{ model: ChatUser, as: 'users' }]
      });
      if (!chat) return res.status(404).json({ error: 'Chat not found' });
      res.json(chat);
    } catch (error) {
      console.error('Error getting chat by id:', error);
      res.status(500).json({ error: error.message });
    }
  },

  deleteChat: async (req, res) => {
    try {
      const { chatId } = req.params;
      const userId = req.user.id;
      const chat = await Chat.findByPk(chatId);
      if (!chat) return res.status(404).json({ error: 'Chat not found' });
      if (chat.ownerId !== userId) return res.status(403).json({ error: 'Only owner can delete chat' });
      await Chat.destroy({ where: { id: chatId } });
      await ChatUser.destroy({ where: { chatId } });
      await Message.destroy({ where: { chatId } });
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting chat:', error);
      res.status(500).json({ error: error.message });
    }
  },

  addUserToChat: async (req, res) => {
    try {
      const { chatId } = req.params;
      const { userId } = req.body;
      const currentUserId = req.user.id;
      const admin = await ChatUser.findOne({ where: { chatId, userId: currentUserId, role: 'admin' } });
      if (!admin) return res.status(403).json({ error: 'Only admin can add users' });
      const exists = await ChatUser.findOne({ where: { chatId, userId } });
      if (exists) return res.status(400).json({ error: 'User already in chat' });
      const chatUser = await ChatUser.create({ chatId, userId, role: 'member' });
      const io = getIO();
      io.to(`chat-${chatId}`).emit('chat:user:added', { chatId, userId });
      res.status(201).json(chatUser);
    } catch (error) {
      console.error('Error adding user to chat:', error);
      res.status(500).json({ error: error.message });
    }
  },

  removeUserFromChat: async (req, res) => {
    try {
      const { chatId, userId } = req.params;
      const currentUserId = req.user.id;
      const admin = await ChatUser.findOne({ where: { chatId, userId: currentUserId, role: 'admin' } });
      if (currentUserId !== userId && !admin) return res.status(403).json({ error: 'Only admin or self can remove' });
      await ChatUser.destroy({ where: { chatId, userId } });
      const io = getIO();
      io.to(`chat-${chatId}`).emit('chat:user:removed', { chatId, userId });
      res.json({ success: true });
    } catch (error) {
      console.error('Error removing user from chat:', error);
      res.status(500).json({ error: error.message });
    }
  },

  sendMessage: async (req, res) => {
    try {
      const { chatId } = req.params;
      const { content, type = 'text', metadata, replyTo } = req.body;
      const userId = req.user.id;
      const chatUser = await ChatUser.findOne({ where: { chatId, userId } });
      if (!chatUser) return res.status(403).json({ error: 'Not a chat member' });
      const message = await Message.create({ chatId, userId, content, type, metadata, replyTo });
      const fullMessage = await Message.findByPk(message.id, { include: [{ model: User, as: 'user' }] });
      const io = getIO();
      io.to(`chat-${chatId}`).emit('chat:message:new', fullMessage);
      res.status(201).json(fullMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ error: error.message });
    }
  },

  editMessage: async (req, res) => {
    try {
      const { chatId, messageId } = req.params;
      const { content } = req.body;
      const userId = req.user.id;
      const message = await Message.findByPk(messageId);
      if (!message) return res.status(404).json({ error: 'Message not found' });
      if (message.userId !== userId) return res.status(403).json({ error: 'Can only edit own messages' });
      await message.update({ content });
      const io = getIO();
      io.to(`chat-${chatId}`).emit('chat:message:edit', { ...message.toJSON(), content });
      res.json(message);
    } catch (error) {
      console.error('Error editing message:', error);
      res.status(500).json({ error: error.message });
    }
  },

  deleteMessage: async (req, res) => {
    try {
      const { chatId, messageId } = req.params;
      const userId = req.user.id;
      const message = await Message.findByPk(messageId);
      if (!message) return res.status(404).json({ error: 'Message not found' });
      if (message.userId !== userId) return res.status(403).json({ error: 'Can only delete own messages' });
      await message.destroy();
      const io = getIO();
      io.to(`chat-${chatId}`).emit('chat:message:delete', { chatId, messageId });
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting message:', error);
      res.status(500).json({ error: error.message });
    }
  },

  uploadFile: async (req, res) => {
    try {
      const { chatId, messageId } = req.params;
      const userId = req.user.id;
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const file = await MessageFile.create({
        messageId,
        url: `/uploads/${req.file.filename}`,
        type: req.file.mimetype,
        name: req.file.originalname,
        size: req.file.size
      });
      const io = getIO();
      io.to(`chat-${chatId}`).emit('chat:file:uploaded', { chatId, messageId, file });
      res.status(201).json(file);
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ error: error.message });
    }
  },

  deleteFile: async (req, res) => {
    try {
      const { chatId, messageId, fileId } = req.params;
      const userId = req.user.id;
      const file = await MessageFile.findByPk(fileId);
      if (!file) return res.status(404).json({ error: 'File not found' });
      await file.destroy();
      const io = getIO();
      io.to(`chat-${chatId}`).emit('chat:file:deleted', { chatId, messageId, fileId });
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ error: error.message });
    }
  },

  getUserChats: async (req, res) => {
  try {
    const { userId } = req.query;
    const { type, teamId } = req.query;

    const where = {};
    if (type) where.type = type;
    if (teamId) where.teamId = teamId;

    const chatUsers = await ChatUser.findAll({
      where: { userId },
      include: [{
        model: Chat,
        where,
        include: [
          {
            model: User,
            through: { attributes: ['role', 'nickname', 'status', 'lastRead'] },
            attributes: ['id', 'name', 'email', 'photoURL']
          },
          {
            model: Team,
            attributes: ['id', 'name']
          },
          {
            model: Message,
            limit: 1,
            order: [['createdAt', 'DESC']],
            include: [{
              model: User,
              attributes: ['id', 'name', 'photoURL']
            }]
          }
        ]
      }]
    });

    const chats = chatUsers.map(cu => ({
      ...cu.chat.toJSON(),
      unreadCount: cu.chat.messages.length > 0 ? 
        cu.chat.messages[0].createdAt > cu.lastRead ? 1 : 0 : 0
    }));

    res.json(chats);
  } catch (error) {
    console.error('Error getting user chats:', error);
    res.status(500).json({ error: error.message });
  }
  },

  getMessages: async (req, res) => {
  try {
    const { chatId } = req.query;
    const { limit = 50, before, after } = req.query;
    const userId = req.user.id;

    // Check if user is in chat
    const chatUser = await ChatUser.findOne({
      where: { chatId, userId }
    });

    if (!chatUser) {
      return res.status(403).json({ error: 'User is not a member of this chat' });
    }

    const where = { chatId };
    if (before) {
      where.createdAt = { [Op.lt]: new Date(before) };
    }
    if (after) {
      where.createdAt = { [Op.gt]: new Date(after) };
    }

    const messages = await Message.findAll({
      where,
      include: [{
        model: User,
        attributes: ['id', 'name', 'photoURL']
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    // Update last read
    await chatUser.update({ lastRead: new Date() });

    res.json(messages);
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ error: error.message });
  }
  },

  updateChatSettings: async (req, res) => {
  try {
    const { chatId } = req.params;
    const { settings } = req.body;
    const userId = req.user.id;

    // Check if user has permission
    const chatUser = await ChatUser.findOne({
      where: { chatId, userId }
    });

    if (!chatUser || !['admin', 'moderator'].includes(chatUser.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const chat = await Chat.findByPk(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    await chat.update({ settings });
    res.json(chat);
  } catch (error) {
    console.error('Error updating chat settings:', error);
    res.status(500).json({ error: error.message });
  }
  },

  updateMessage: async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const message = await Message.findByPk(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user is the message author
    if (message.userId !== userId) {
      return res.status(403).json({ error: 'Cannot edit another user\'s message' });
    }

    await message.update({
      content,
      edited: true,
      editedAt: new Date()
    });

    res.json(message);
  } catch (error) {
    console.error('Error updating message:', error);
    res.status(500).json({ error: error.message });
  }
  }
};

console.log('chatController before export:', chatController);

module.exports = chatController; 