const socketIO = require('socket.io');
const { User, Task, Team, ActivityLog } = require('../models');
const { v4: uuidv4 } = require('uuid');

let io;

const initializeSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: [process.env.CLIENT_URL || "http://localhost:3000", "http://localhost:8000"],
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on('connection', async (socket) => {
    console.log('User connected:', socket.id);
    const userId = socket.handshake.auth.userId;

    if (userId) {
      // Оновлюємо статус користувача
      await User.update(
        {
          isOnline: true,
          socketId: socket.id,
          lastSeen: new Date()
        },
        {
          where: { id: userId }
        }
      );

      // Повідомляємо всіх про зміну статусу
      io.emit('userStatusChanged', { userId, isOnline: true });
    }

    // Приєднання до кімнати команди
    socket.on('joinTeam', async (teamId) => {
      socket.join(`team-${teamId}`);
      console.log(`User ${socket.id} joined team ${teamId}`);

      // Логуємо активність
      if (userId) {
        // Перевіряємо, чи teamId схожий на UUID (36 символів, містить '-')
        const isUUID = typeof teamId === 'string' && teamId.length === 36 && teamId.includes('-');
        await ActivityLog.create({
          id: uuidv4(),
          userId,
          teamId: isUUID ? teamId : null,
          action: 'team_joined',
          details: {}
        });
      }
    });

    // Відключення від кімнати команди
    socket.on('leaveTeam', async (teamId) => {
      socket.leave(`team-${teamId}`);
      console.log(`User ${socket.id} left team ${teamId}`);

      // Логуємо активність
      if (userId) {
        const isUUID = typeof teamId === 'string' && teamId.length === 36 && teamId.includes('-');
        await ActivityLog.create({
          id: uuidv4(),
          userId,
          teamId: isUUID ? teamId : null,
          action: 'team_left',
          details: {}
        });
      }
    });

    // Обробка створення нового завдання
    socket.on('newTask', async (data) => {
      io.to(`team-${data.teamId}`).emit('taskCreated', data);

      // Створюємо сповіщення для всіх учасників команди
      const notification = {
        id: uuidv4(),
        userId: data.assignedTo,
        type: 'task_created',
        title: 'New Task Assigned',
        message: `You have been assigned to task: ${data.title}`,
        data: { taskId: data.id },
        isRead: false,
        createdAt: new Date()
      };

      // Відправляємо сповіщення призначеному користувачу
      io.to(`user-${data.assignedTo}`).emit('notification', notification);

      // Логуємо активність
      if (userId) {
        await ActivityLog.create({
          id: uuidv4(),
          userId,
          teamId: data.teamId,
          action: 'task_created',
          details: { taskId: data.id }
        });
      }
    });

    // Обробка оновлення завдання
    socket.on('updateTask', async (data) => {
      io.to(`team-${data.teamId}`).emit('taskUpdated', data);

      // Створюємо сповіщення
      const notification = {
        id: uuidv4(),
        userId: data.assignedTo,
        type: 'task_updated',
        title: 'Task Updated',
        message: `Task "${data.title}" has been updated`,
        data: { taskId: data.id },
        isRead: false,
        createdAt: new Date()
      };

      // Відправляємо сповіщення
      io.to(`user-${data.assignedTo}`).emit('notification', notification);

      // Логуємо активність
      if (userId) {
        await ActivityLog.create({
          id: uuidv4(),
          userId,
          teamId: data.teamId,
          action: 'task_updated',
          details: { taskId: data.id }
        });
      }
    });

    // Обробка нового коментаря
    socket.on('newComment', async (data) => {
      io.to(`team-${data.teamId}`).emit('commentAdded', data);

      // Створюємо сповіщення для власника завдання
      if (data.taskOwnerId && data.taskOwnerId !== data.userId) {
        const notification = {
          id: uuidv4(),
          userId: data.taskOwnerId,
          type: 'comment_added',
          title: 'New Comment',
          message: `New comment on task: ${data.taskTitle}`,
          data: { taskId: data.taskId, commentId: data.comment.id },
          isRead: false,
          createdAt: new Date()
        };

        // Відправляємо сповіщення
        io.to(`user-${data.taskOwnerId}`).emit('notification', notification);
      }

      // Логуємо активність
      if (userId) {
        await ActivityLog.create({
          id: uuidv4(),
          userId,
          teamId: data.teamId,
          action: 'comment_added',
          details: { taskId: data.taskId, commentId: data.comment.id }
        });
      }
    });

    // --- SUBTASK EVENTS ---
    socket.on('newSubtask', async (data) => {
      io.to(`team-${data.teamId}`).emit('subtaskCreated', data);
      if (userId) {
        await ActivityLog.create({
          id: uuidv4(),
          userId,
          teamId: data.teamId,
          action: 'subtask_created',
          details: { taskId: data.taskId, subtaskId: data.id }
        });
      }
    });
    socket.on('updateSubtask', async (data) => {
      io.to(`team-${data.teamId}`).emit('subtaskUpdated', data);
      if (userId) {
        await ActivityLog.create({
          id: uuidv4(),
          userId,
          teamId: data.teamId,
          action: 'subtask_updated',
          details: { taskId: data.taskId, subtaskId: data.id }
        });
      }
    });
    socket.on('deleteSubtask', async (data) => {
      io.to(`team-${data.teamId}`).emit('subtaskDeleted', data);
      if (userId) {
        await ActivityLog.create({
          id: uuidv4(),
          userId,
          teamId: data.teamId,
          action: 'subtask_deleted',
          details: { taskId: data.taskId, subtaskId: data.id }
        });
      }
    });
    // --- FILE EVENTS ---
    socket.on('newFile', async (data) => {
      io.to(`team-${data.teamId}`).emit('fileUploaded', data);
      if (userId) {
        await ActivityLog.create({
          id: uuidv4(),
          userId,
          teamId: data.teamId,
          action: 'file_uploaded',
          details: { taskId: data.taskId, fileId: data.id, fileName: data.name }
        });
      }
    });
    socket.on('deleteFile', async (data) => {
      io.to(`team-${data.teamId}`).emit('fileDeleted', data);
      if (userId) {
        await ActivityLog.create({
          id: uuidv4(),
          userId,
          teamId: data.teamId,
          action: 'file_deleted',
          details: { taskId: data.taskId, fileId: data.id, fileName: data.name }
        });
      }
    });

    // --- CHAT SOCKET LOGIC ---
    socket.on('chat:join', (chatId) => {
      socket.join(`chat-${chatId}`);
      console.log(`User ${socket.id} joined chat ${chatId}`);
    });
    socket.on('chat:leave', (chatId) => {
      socket.leave(`chat-${chatId}`);
      console.log(`User ${socket.id} left chat ${chatId}`);
    });
    socket.on('chat:message:new', (message) => {
      io.to(`chat-${message.chatId}`).emit('chat:message:new', message);
    });
    socket.on('chat:message:edit', (message) => {
      io.to(`chat-${message.chatId}`).emit('chat:message:edit', message);
    });
    socket.on('chat:message:delete', ({ chatId, messageId }) => {
      io.to(`chat-${chatId}`).emit('chat:message:delete', { chatId, messageId });
    });
    socket.on('chat:user:add', (data) => {
      io.to(`chat-${data.chatId}`).emit('chat:user:add', data);
    });
    socket.on('chat:user:remove', (data) => {
      io.to(`chat-${data.chatId}`).emit('chat:user:remove', data);
    });
    socket.on('chat:file:upload', (fileMessage) => {
      io.to(`chat-${fileMessage.chatId}`).emit('chat:file:upload', fileMessage);
    });

    // Обробка відключення
    socket.on('disconnect', async () => {
      console.log('User disconnected:', socket.id);
      
      if (userId) {
        // Оновлюємо статус користувача
        await User.update(
          {
            isOnline: false,
            lastSeen: new Date()
          },
          {
            where: { id: userId }
          }
        );

        // Повідомляємо всіх про зміну статусу
        io.emit('userStatusChanged', { userId, isOnline: false });
      }
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

module.exports = {
  initializeSocket,
  getIO
}; 