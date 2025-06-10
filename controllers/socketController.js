const { User } = require('../models');
const { getIO } = require('../utils/socket');

// Підключення користувача до WebSocket
exports.connectUser = async (socket, userId) => {
  try {
    // Оновлюємо статус користувача на "онлайн"
    await User.update(
      { status: 'online' },
      { where: { id: userId } }
    );

    // Приєднуємо користувача до його персональної кімнати
    socket.join(`user-${userId}`);

    // Відправляємо сповіщення про підключення
    const io = getIO();
    io.emit('user_status_change', {
      userId,
      status: 'online'
    });

    console.log(`User ${userId} connected to WebSocket`);
  } catch (error) {
    console.error('Error connecting user to WebSocket:', error);
  }
};

// Відключення користувача від WebSocket
exports.disconnectUser = async (socket, userId) => {
  try {
    // Оновлюємо статус користувача на "офлайн"
    await User.update(
      { status: 'offline' },
      { where: { id: userId } }
    );

    // Відправляємо сповіщення про відключення
    const io = getIO();
    io.emit('user_status_change', {
      userId,
      status: 'offline'
    });

    console.log(`User ${userId} disconnected from WebSocket`);
  } catch (error) {
    console.error('Error disconnecting user from WebSocket:', error);
  }
};

// Відправка сповіщення конкретному користувачу
exports.sendNotification = async (userId, notification) => {
  try {
    const io = getIO();
    io.to(`user-${userId}`).emit('notification', notification);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

// Відправка сповіщення всім користувачам
exports.broadcastNotification = async (notification) => {
  try {
    const io = getIO();
    io.emit('notification', notification);
  } catch (error) {
    console.error('Error broadcasting notification:', error);
  }
};

// Відправка сповіщення всім користувачам команди
exports.sendTeamNotification = async (teamId, notification) => {
  try {
    const io = getIO();
    io.to(`team-${teamId}`).emit('notification', notification);
  } catch (error) {
    console.error('Error sending team notification:', error);
  }
};

// Підключення користувача до кімнати команди
exports.joinTeamRoom = async (socket, teamId) => {
  try {
    socket.join(`team-${teamId}`);
    console.log(`User joined team room: ${teamId}`);
  } catch (error) {
    console.error('Error joining team room:', error);
  }
};

// Відключення користувача від кімнати команди
exports.leaveTeamRoom = async (socket, teamId) => {
  try {
    socket.leave(`team-${teamId}`);
    console.log(`User left team room: ${teamId}`);
  } catch (error) {
    console.error('Error leaving team room:', error);
  }
};

// Відправка оновлення завдання
exports.sendTaskUpdate = async (taskId, update) => {
  try {
    const io = getIO();
    io.emit('task_update', {
      taskId,
      ...update
    });
  } catch (error) {
    console.error('Error sending task update:', error);
  }
};

// Відправка оновлення команди
exports.sendTeamUpdate = async (teamId, update) => {
  try {
    const io = getIO();
    io.to(`team-${teamId}`).emit('team_update', {
      teamId,
      ...update
    });
  } catch (error) {
    console.error('Error sending team update:', error);
  }
}; 