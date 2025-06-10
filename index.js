require('dotenv').config()
require('./firebase') // Імпортуємо Firebase перед іншими імпортами
const express = require('express')
const cors = require('cors')
const path = require('path')
const http = require('http')
const { initializeSocket } = require('./utils/socket')
const { sequelize } = require('./models')
const errorHandler = require('./middleware/ErrorHandlingMiddleware')
const { User, Task, Team } = require('./models')

// Ініціалізація Express
const app = express()
const server = http.createServer(app)

// Middleware
app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, 'static/uploads')))

// Ініціалізація Socket.IO
const io = initializeSocket(server)

// Імпорт роутів
const taskRoutes = require('./routes/taskRoutes')
const teamRoutes = require('./routes/teamRoutes')
const commentRoutes = require('./routes/commentRoutes')
const subtaskRoutes = require('./routes/subtaskRoutes')
const userRoutes = require('./routes/userRouter')
const eventRoutes = require('./routes/eventRoutes')
const chatRoutes = require('./routes/chatRoutes')
const activityLogRoutes = require('./routes/activityLogRoutes')

// API Routes
app.use('/api/tasks', taskRoutes)
app.use('/api/teams', teamRoutes)
app.use('/api/comments', commentRoutes)
app.use('/api/subtasks', subtaskRoutes)
app.use('/api/user', userRoutes)
app.use('/api/events', eventRoutes)
app.use('/api/chats', chatRoutes)
app.use('/api/activity', activityLogRoutes)

// Error handling
app.use(errorHandler)

// Team socket events
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Task events
  socket.on('task:create', async (task) => {
    try {
      console.log('Received task:create event:', task);
      if (!task.teamId) {
        console.log('Task has no teamId, skipping broadcast');
        return;
      }

      const team = await Team.findByPk(task.teamId, {
        include: [{
          model: User,
          as: 'teamUsers',
          attributes: ['uid'],
          through: { attributes: [] }
        }]
      });

      if (!team) {
        console.log('Team not found:', task.teamId);
        return;
      }

      console.log('Broadcasting task to team members:', team.teamUsers.map(m => m.uid));
      team.teamUsers.forEach(member => {
        if (member.uid !== task.userId) { // Не відправляємо подію створювачу
          console.log('Sending task:created to user:', member.uid);
          io.to(member.uid).emit('task:created', task);
        }
      });
    } catch (error) {
      console.error('Error in task:create handler:', error);
    }
  });

  socket.on('task:update', async (task) => {
    try {
      console.log('Received task:update event:', task);
      if (!task.teamId) {
        console.log('Task has no teamId, skipping broadcast');
        return;
      }

      const team = await Team.findByPk(task.teamId, {
        include: [{
          model: User,
          as: 'teamUsers',
          attributes: ['uid'],
          through: { attributes: [] }
        }]
      });

      if (!team) {
        console.log('Team not found:', task.teamId);
        return;
      }

      console.log('Broadcasting task update to team members:', team.teamUsers.map(m => m.uid));
      team.teamUsers.forEach(member => {
        if (member.uid !== task.userId) { // Не відправляємо подію тому, хто оновив
          console.log('Sending task:updated to user:', member.uid);
          io.to(member.uid).emit('task:updated', task);
        }
      });
    } catch (error) {
      console.error('Error in task:update handler:', error);
    }
  });

  socket.on('task:delete', async (taskId, userId, teamId) => {
    try {
      console.log('Received task:delete event:', { taskId, userId, teamId });
      
      // Якщо teamId не передано, спробуємо знайти його в базі даних
      if (!teamId) {
        const task = await Task.findByPk(taskId);
        if (task) {
          teamId = task.teamId;
          userId = task.userId;
        }
      }

      if (!teamId) {
        console.log('Task has no teamId, skipping broadcast');
        return;
      }

      const team = await Team.findByPk(teamId, {
        include: [{
          model: User,
          as: 'teamUsers',
          attributes: ['uid'],
          through: { attributes: [] }
        }]
      });

      if (!team) {
        console.log('Team not found:', teamId);
        return;
      }

      console.log('Broadcasting task deletion to team members:', team.teamUsers.map(m => m.uid));
      
      // Відправляємо подію в кімнату команди
      io.to(teamId).emit('task:deleted', taskId);
      
      // Також відправляємо подію кожному учаснику окремо
      team.teamUsers.forEach(member => {
        if (member.uid !== userId) { // Не відправляємо подію тому, хто видалив
          console.log('Sending task:deleted to user:', member.uid);
          io.to(member.uid).emit('task:deleted', taskId);
        }
      });
    } catch (error) {
      console.error('Error in task:delete handler:', error);
    }
  });

  // Join team room
  socket.on('joinTeam', (teamId) => {
    console.log(`Client ${socket.id} joining team room: ${teamId}`);
    socket.join(teamId);
    // Також додаємо користувача до його персональної кімнати
    if (socket.handshake.auth.userId) {
      socket.join(socket.handshake.auth.userId);
      console.log(`Client ${socket.id} joined personal room: ${socket.handshake.auth.userId}`);
    }
  });

  // Leave team room
  socket.on('leaveTeam', (teamId) => {
    console.log(`Client ${socket.id} leaving team room: ${teamId}`);
    socket.leave(teamId);
  });

  // Team events
  socket.on('team:update', async (team) => {
    try {
      console.log('Received team:update event from client:', socket.id, 'Team:', team)
      if (team.deleted) {
        // Якщо команда видалена, повідомляємо всіх користувачів
        console.log('Broadcasting team deletion to all clients')
        io.emit('team:updated', team)
      } else {
        // Оновлюємо команду для всіх її учасників
        console.log('Broadcasting team update to team members:', team.teamUsers.map(u => u.uid))
        team.teamUsers.forEach(user => {
          io.to(user.uid).emit('team:updated', team)
        })
      }
    } catch (error) {
      console.error('Error handling team update:', error)
    }
  })

  socket.on('team:addMember', async (data) => {
    try {
      const { teamId, member } = data
      console.log('Received team:addMember event from client:', socket.id, 'Data:', data)
      
      // Отримуємо команду з бази даних
      const team = await Team.findByPk(teamId, {
        include: [{ model: User, as: 'teamUsers' }]
      })

      if (team) {
        console.log('Broadcasting member addition to team members:', team.teamUsers.map(u => u.uid))
        // Повідомляємо всіх учасників команди про нового учасника
        team.teamUsers.forEach(user => {
          io.to(user.uid).emit('team:memberAdded', { teamId, member })
        })
        // Повідомляємо нового учасника
        io.to(member.uid).emit('team:memberAdded', { teamId, member })
      } else {
        console.error('Team not found:', teamId)
      }
    } catch (error) {
      console.error('Error handling team member add:', error)
    }
  })

  socket.on('team:removeMember', async (data) => {
    try {
      const { teamId, userId } = data
      console.log('Received team:removeMember event from client:', socket.id, 'Data:', data)
      
      // Отримуємо команду з бази даних
      const team = await Team.findByPk(teamId, {
        include: [{ model: User, as: 'teamUsers' }]
      })

      if (team) {
        console.log('Broadcasting member removal to team members:', team.teamUsers.map(u => u.uid))
        // Повідомляємо всіх учасників команди про видалення учасника
        team.teamUsers.forEach(user => {
          io.to(user.uid).emit('team:memberRemoved', { teamId, userId })
        })
        // Повідомляємо видаленого учасника
        io.to(userId).emit('team:memberRemoved', { teamId, userId })
      } else {
        console.error('Team not found:', teamId)
      }
    } catch (error) {
      console.error('Error handling team member removal:', error)
    }
  })

  socket.on('team:updateMemberRole', async (data) => {
    try {
      const { teamId, userId, newRole } = data
      console.log('Received team:updateMemberRole event from client:', socket.id, 'Data:', data)
      
      // Отримуємо команду з бази даних
      const team = await Team.findByPk(teamId, {
        include: [{ model: User, as: 'teamUsers' }]
      })

      if (team) {
        console.log('Broadcasting role update to team members:', team.teamUsers.map(u => u.uid))
        // Повідомляємо всіх учасників команди про зміну ролі
        team.teamUsers.forEach(user => {
          io.to(user.uid).emit('team:memberRoleUpdated', { teamId, userId, newRole })
        })
      } else {
        console.error('Team not found:', teamId)
      }
    } catch (error) {
      console.error('Error handling team member role update:', error)
    }
  })

  // Comment events
  socket.on('comment:add', async (data) => {
    try {
      console.log('Received comment:add event:', data)
      const { taskId, comment } = data
      const task = await Task.findByPk(taskId)
      if (task && task.teamId) {
        // Broadcast new comment to all team members
        io.to(task.teamId).emit('comment:added', { taskId, comment })
      }
    } catch (error) {
      console.error('Error handling comment addition:', error)
    }
  })

  socket.on('comment:update', async (data) => {
    try {
      console.log('Received comment:update event:', data)
      const { taskId, comment } = data
      const task = await Task.findByPk(taskId)
      if (task && task.teamId) {
        // Broadcast comment update to all team members
        io.to(task.teamId).emit('comment:updated', { taskId, comment })
      }
    } catch (error) {
      console.error('Error handling comment update:', error)
    }
  })

  socket.on('comment:delete', async (data) => {
    try {
      console.log('Received comment:delete event:', data)
      const { taskId, commentId } = data
      const task = await Task.findByPk(taskId)
      if (task && task.teamId) {
        // Broadcast comment deletion to all team members
        io.to(task.teamId).emit('comment:deleted', { taskId, commentId })
      }
    } catch (error) {
      console.error('Error handling comment deletion:', error)
    }
  })

  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, 'Reason:', reason)
  })
})

async function start() {
    try {
        await sequelize.authenticate()
        console.log('Database connection established successfully.')

        // Sync all models with force: true to recreate all tables
        // await sequelize.sync({ force: true })
        sequelize.sync({ alter: true })
        console.log('Database synced successfully')

        const PORT = process.env.PORT || 3001
        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`)
        })
    } catch (error) {
        console.error('Error starting server:', error)
        process.exit(1)
    }
}

start()
