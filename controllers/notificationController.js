const { Notification, User } = require('../models');
const { getIO } = require('../utils/socket');
const { v4: uuidv4 } = require('uuid');

// Отримати всі сповіщення користувача
exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { limit = 50, offset = 0, unreadOnly = false } = req.query;

    const where = { userId };
    if (unreadOnly === 'true') {
      where.read = false;
    }

    const notifications = await Notification.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [{
        model: User,
        attributes: ['id', 'displayName', 'photoURL']
      }]
    });

    const total = await Notification.count({ where });
    const unreadCount = await Notification.count({ where: { ...where, read: false } });

    res.json({
      notifications,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      },
      unreadCount
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({ message: error.message });
  }
};

// Позначити сповіщення як прочитане
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    const notification = await Notification.findByPk(id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized to update this notification' });
    }

    await notification.update({ read: true });
    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: error.message });
  }
};

// Позначити всі сповіщення як прочитані
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.uid;

    await Notification.update(
      { read: true },
      { where: { userId, read: false } }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: error.message });
  }
};

// Видалити сповіщення
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    const notification = await Notification.findByPk(id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this notification' });
    }

    await notification.destroy();
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: error.message });
  }
};

// Створити нове сповіщення
exports.createNotification = async (req, res) => {
  try {
    const { userId, type, title, message, data } = req.body;

    const notification = await Notification.create({
      id: uuidv4(),
      userId,
      type,
      title,
      message,
      data,
      read: false
    });

    // Відправляємо сповіщення через WebSocket
    const io = getIO();
    io.to(`user-${userId}`).emit('notification', notification);

    res.status(201).json(notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ message: error.message });
  }
}; 