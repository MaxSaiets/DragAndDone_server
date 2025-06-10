const { Task, Team, Comment, User, TeamMember, TaskAssignee, Subtask, File } = require('../models');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getIO } = require('../utils/socket');

// Налаштування multer для завантаження файлів
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../static/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and documents are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

// Отримання всіх завдань користувача
exports.getTasks = async (req, res) => {
  try {
    const userId = req.user.uid;
    console.log('Fetching tasks for user:', userId);

    // Отримуємо особисті завдання
    const userTasks = await Task.findAll({
      where: { userId },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['uid', 'name', 'avatar']
        },
        {
          model: Team,
          attributes: ['id', 'name', 'avatar']
        },
        {
          model: User,
          as: 'assignees',
          attributes: ['uid', 'name', 'avatar']
        }
      ],
      order: [['order', 'ASC']]
    });

    // Отримуємо команди користувача
    const userTeams = await TeamMember.findAll({
      where: { userId },
      include: [{
        model: Team,
        as: 'team',
        attributes: ['id']
      }]
    });

    const teamIds = userTeams.map(member => member.team.id);
    console.log('User team IDs:', teamIds);

    // Отримуємо завдання команд
    const teamTasks = await Task.findAll({
      where: {
        teamId: {
          [Op.in]: teamIds
        }
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['uid', 'name', 'avatar']
        },
        {
          model: Team,
          attributes: ['id', 'name', 'avatar']
        },
        {
          model: User,
          as: 'assignees',
          attributes: ['uid', 'name', 'avatar']
        }
      ],
      order: [['order', 'ASC']]
    });

    // Об'єднуємо завдання
    const allTasks = [...userTasks, ...teamTasks];
    console.log(`Found ${allTasks.length} tasks (${userTasks.length} personal, ${teamTasks.length} team)`);

    res.json(allTasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

// Створення нового завдання
exports.createTask = async (req, res) => {
  try {
    const { title, description, status, priority, dueDate, teamId, assignees } = req.body;
    const userId = req.user.uid;

    // Створюємо завдання
    const task = await Task.create({
      title,
      description,
      status: status || 'todo',
      priority: priority || 'medium',
      dueDate,
      userId,
      teamId,
      order: 0
    });

    // Додаємо виконавців, якщо вони вказані
    if (assignees && assignees.length > 0) {
      await TaskAssignee.bulkCreate(
        assignees.map(assigneeId => ({
          taskId: task.id,
          userId: assigneeId
        }))
      );
    }

    // Отримуємо створене завдання з усіма зв'язками
    const createdTask = await Task.findByPk(task.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['uid', 'name', 'avatar']
        },
        {
          model: Team,
          attributes: ['id', 'name', 'avatar']
        },
        {
          model: User,
          as: 'assignees',
          attributes: ['uid', 'name', 'avatar']
        }
      ]
    });

    res.status(201).json(createdTask);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
};

// Оновлення завдання
exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, dueDate, teamId, assignees } = req.body;
    // const userId = req.user.uid; // not needed for permission anymore

    // Find the task
    const task = await Task.findOne({ where: { id } });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Update the task
    await task.update({
      title,
      description,
      status,
      priority,
      dueDate,
      teamId
    });

    // Update assignees
    if (assignees) {
      // Remove old assignees
      await TaskAssignee.destroy({ where: { taskId: id } });
      // Add new assignees
      if (assignees.length > 0) {
        await TaskAssignee.bulkCreate(
          assignees.map(assigneeId => ({
            taskId: id,
            userId: assigneeId
          }))
        );
      }
    }

    // Get the updated task
    const updatedTask = await Task.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['uid', 'name', 'avatar']
        },
        {
          model: Team,
          attributes: ['id', 'name', 'avatar']
        },
        {
          model: User,
          as: 'assignees',
          attributes: ['uid', 'name', 'avatar']
        }
      ]
    });

    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
};

// Видалення завдання
exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    // const userId = req.user.uid; // not needed for permission anymore

    // Find the task
    const task = await Task.findOne({ where: { id } });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Delete all related data
    await Promise.all([
      TaskAssignee.destroy({ where: { taskId: id } }),
      Comment.destroy({ where: { taskId: id } }),
      Subtask.destroy({ where: { taskId: id } }),
      File.destroy({ where: { taskId: id } })
    ]);

    // Delete the task
    await task.destroy();

    // Emit socket event
    const io = getIO();
    if (task.teamId) {
      io.to(`team-${task.teamId}`).emit('taskDeleted', id);
    } else {
      io.to(`user-${task.userId}`).emit('taskDeleted', id);
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
};

// Status mapping function
const mapTaskStatus = (status) => {
  const statusMap = {
    'todo': 'todo',
    'inProgress': 'in_progress',
    'done': 'done'
  };
  return statusMap[status] || status;
};

// Update task status
exports.updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.uid;

    // Map the status to the correct format
    const mappedStatus = mapTaskStatus(status);

    // Find the task and check permissions
    const task = await Task.findOne({
      where: { id },
      include: [
        {
          model: Team,
          include: [{
            model: TeamMember,
            as: 'teamMembers',
            where: { userId },
            required: false
          }]
        }
      ]
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check access rights
    const isOwner = task.userId === userId;
    const isTeamMember = task.Team && task.Team.teamMembers && task.Team.teamMembers.length > 0;

    if (!isOwner && !isTeamMember) {
      return res.status(403).json({ error: 'Not authorized to update this task' });
    }

    // Update the task status
    await task.update({ status: mappedStatus });

    // Get the updated task with all associations
    const updatedTask = await Task.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['uid', 'name', 'avatar']
        },
        {
          model: Team,
          attributes: ['id', 'name', 'avatar']
        },
        {
          model: User,
          as: 'assignees',
          attributes: ['uid', 'name', 'avatar']
        }
      ]
    });

    // Emit socket event
    const io = getIO();
    if (task.teamId) {
      io.to(`team-${task.teamId}`).emit('task:updated', updatedTask);
    } else {
      io.to(`user-${task.userId}`).emit('task:updated', updatedTask);
    }

    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ error: 'Failed to update task status' });
  }
};

// Check if task exists
const checkTaskExists = async (taskId) => {
  const task = await Task.findByPk(taskId);
  return !!task;
};

// Отримання завдання за ID
exports.getTaskById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    console.log('Fetching task by ID:', id, 'for user:', userId);
    
    const include = req.query.include ? req.query.include.split(',') : [];
    console.log('Include options:', include);

    const includeOptions = [];
    
    if (include.includes('comments')) {
      includeOptions.push({
        model: Comment,
        include: [{
          model: User,
          attributes: ['uid', 'name', 'email', 'avatar']
        }],
        order: [['createdAt', 'DESC']]
      });
    }
    
    if (include.includes('subtasks')) {
      includeOptions.push({
        model: Subtask,
        include: [{
          model: User,
          attributes: ['uid', 'name', 'email', 'avatar']
        }],
        order: [['createdAt', 'ASC']]
      });
    }
    
    if (include.includes('files')) {
      includeOptions.push({
        model: File,
        include: [{
          model: User,
          attributes: ['uid', 'name', 'email', 'avatar']
        }]
      });
    }
    
    if (include.includes('creator')) {
      includeOptions.push({
        model: User,
        as: 'creator',
        attributes: ['uid', 'name', 'email', 'avatar']
      });
    }
    
    if (include.includes('assignees')) {
      includeOptions.push({
        model: User,
        as: 'assignees',
        attributes: ['uid', 'name', 'email', 'avatar'],
        through: { attributes: [] }
      });
    }
    
    if (include.includes('team')) {
      includeOptions.push({
        model: Team,
        include: [{
          model: TeamMember,
          as: 'teamMembers',
          include: [{
            model: User,
            as: 'user',
            attributes: ['uid', 'name', 'email', 'avatar']
          }]
        }]
      });
    }

    console.log('Query options:', JSON.stringify({
      where: { id },
      include: includeOptions.map(opt => opt.model.name)
    }, null, 2));

    const task = await Task.findOne({
      where: { id },
      include: includeOptions
    });

    if (!task) {
      console.log('Task not found:', id);
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check if user has access to the task
    const isCreator = task.userId === userId;
    const isTeamMember = task.Team && task.Team.teamMembers && task.Team.teamMembers.some(member => member.userId === userId);

    if (!isCreator && !isTeamMember) {
      console.log('User not authorized to view task:', userId);
      return res.status(403).json({ error: 'Access denied' });
    }

    // Ensure arrays are initialized
    const responseTask = {
      ...task.toJSON(),
      comments: task.Comments || [],
      subtasks: task.Subtasks || [],
      files: task.Files || []
    };

    console.log('Task found and authorized:', id);
    res.json(responseTask);
  } catch (error) {
    console.error('Error in getTaskById:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update task order
exports.updateTaskOrder = async (req, res) => {
  try {
    const { tasks } = req.body;
    console.log('Updating task order:', tasks);

    for (const task of tasks) {
      await Task.update(
        { order: task.order },
        { where: { id: task.id } }
      );
    }

    res.json({ message: 'Task order updated successfully' });
  } catch (error) {
    console.error('Error updating task order:', error);
    res.status(500).json({ error: error.message });
  }
};

// Upload task attachment
exports.uploadAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { taskId } = req.params;
    const task = await Task.findByPk(taskId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const attachment = {
      id: uuidv4(),
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    };

    const attachments = task.attachments || [];
    attachments.push(attachment);

    await task.update({ attachments });

    res.json(attachment);
  } catch (error) {
    console.error('Error uploading attachment:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete task attachment
exports.deleteAttachment = async (req, res) => {
  try {
    const { taskId, attachmentId } = req.params;
    const task = await Task.findByPk(taskId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const attachments = task.attachments || [];
    const attachment = attachments.find(a => a.id === attachmentId);

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    // Видаляємо файл
    fs.unlinkSync(attachment.path);

    // Видаляємо з масиву вкладень
    const updatedAttachments = attachments.filter(a => a.id !== attachmentId);
    await task.update({ attachments: updatedAttachments });

    res.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get task statistics
exports.getTaskStats = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { startDate, endDate } = req.query;

    const where = { userId };
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const tasks = await Task.findAll({ where });

    const stats = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      pending: tasks.filter(t => t.status === 'pending').length,
      byPriority: {
        high: tasks.filter(t => t.priority === 'high').length,
        medium: tasks.filter(t => t.priority === 'medium').length,
        low: tasks.filter(t => t.priority === 'low').length
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Error getting task stats:', error);
    res.status(500).json({ error: error.message });
  }
};

// Upload files
exports.uploadFiles = async (req, res) => {
  try {
    upload.array('files')(req, res, async (err) => {
      if (err) {
        console.error('Error uploading files:', err);
        return res.status(400).json({ error: err.message });
      }

      const { id } = req.params;
      const userId = req.user.uid;
      const task = await Task.findByPk(id);
      if (!task) return res.status(404).json({ error: 'Task not found' });

      const files = await Promise.all(req.files.map(async file => {
        const dbFile = await File.create({
          name: file.originalname,
          path: `/uploads/${file.filename}`,
          size: file.size,
          type: file.mimetype,
          userId,
          taskId: id
        });
        return dbFile;
      }));

      console.log('Files uploaded successfully:', files.length);
      res.json(files);
    });
  } catch (error) {
    console.error('Error in file upload:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete file
exports.deleteFile = async (req, res) => {
  try {
    const { taskId, fileId } = req.params;
    const file = await File.findOne({ where: { id: fileId, taskId } });
    if (!file) return res.status(404).json({ error: 'File not found' });

    // Remove file from disk
    const filePath = path.join(__dirname, '../static/uploads', path.basename(file.path));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await file.destroy();
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: error.message });
  }
};

// Add a comment to a task
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, parentCommentId } = req.body;
    const userId = req.user.uid;
    console.log('Adding comment to task:', id, text, parentCommentId);

    const task = await Task.findOne({
      where: { id },
      include: [
        {
          model: Team,
          include: [{
            model: TeamMember,
            as: 'teamMembers',
            where: { userId },
            required: false
          }]
        }
      ]
    });
    
    if (!task) {
      console.log('Task not found:', id);
      return res.status(404).json({ error: 'Task not found' });
    }

    // Перевіряємо права доступу
    const isCreator = task.userId === userId;
    const isTeamMember = task.teamId ? task.Team.teamMembers.length > 0 : false;

    if (!isCreator && !isTeamMember) {
      console.log('User not authorized to add comment');
      return res.status(403).json({ error: 'Not authorized' });
    }

    const comment = await Comment.create({
      text,
      userId,
      taskId: id,
      parentId: parentCommentId || null
    });

    // Завантажуємо коментар з інформацією про користувача
    const createdComment = await Comment.findOne({
      where: { id: comment.id },
      include: [{
        model: User,
        attributes: ['uid', 'name', 'avatar']
      }]
    });

    // Emit socket event
    const io = getIO();
    if (task.teamId) {
      io.to(`team-${task.teamId}`).emit('taskUpdated', {
        ...task.toJSON(),
        comments: [...(task.comments || []), createdComment]
      });
    } else {
      io.to(`user-${task.userId}`).emit('taskUpdated', {
        ...task.toJSON(),
        comments: [...(task.comments || []), createdComment]
      });
    }

    console.log('Comment added successfully');
    res.status(201).json(createdComment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: error.message });
  }
};

// Edit a comment
exports.editComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const { text } = req.body;
    console.log('Editing comment:', id, commentId, text);

    const task = await Task.findByPk(id);
    
    if (!task) {
      console.log('Task not found:', id);
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.userId !== req.user.user_id && !(req.user.teams || []).includes(task.teamId)) {
      console.log('User not authorized to edit comment');
      return res.status(403).json({ error: 'Not authorized' });
    }

    const comment = task.comments.find(c => c.id === commentId);
    if (!comment) {
      // Check in replies
      for (const c of task.comments) {
        if (c.replies) {
          const reply = c.replies.find(r => r.id === commentId);
          if (reply) {
            if (reply.userId !== req.user.user_id) {
              return res.status(403).json({ error: 'Not authorized to edit this comment' });
            }
            reply.text = text;
            reply.edited = true;
            await task.save();
            return res.json(reply);
          }
        }
      }
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.userId !== req.user.user_id) {
      return res.status(403).json({ error: 'Not authorized to edit this comment' });
    }

    comment.text = text;
    comment.edited = true;
    await task.save();
    console.log('Comment edited successfully');
    res.json(comment);
  } catch (error) {
    console.error('Error editing comment:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete a comment
exports.deleteComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    console.log('Deleting comment:', id, commentId);

    const task = await Task.findByPk(id);
    
    if (!task) {
      console.log('Task not found:', id);
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.userId !== req.user.user_id && !(req.user.teams || []).includes(task.teamId)) {
      console.log('User not authorized to delete comment');
      return res.status(403).json({ error: 'Not authorized' });
    }

    const commentIndex = task.comments.findIndex(c => c.id === commentId);
    if (commentIndex !== -1) {
      const comment = task.comments[commentIndex];
      if (comment.userId !== req.user.user_id) {
        return res.status(403).json({ error: 'Not authorized to delete this comment' });
      }
      task.comments.splice(commentIndex, 1);
    } else {
      // Check in replies
      for (const c of task.comments) {
        if (c.replies) {
          const replyIndex = c.replies.findIndex(r => r.id === commentId);
          if (replyIndex !== -1) {
            const reply = c.replies[replyIndex];
            if (reply.userId !== req.user.user_id) {
              return res.status(403).json({ error: 'Not authorized to delete this comment' });
            }
            c.replies.splice(replyIndex, 1);
            break;
          }
        }
      }
    }

    await task.save();
    console.log('Comment deleted successfully');
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: error.message });
  }
};

// Add a reaction to a comment
exports.addReaction = async (req, res) => {
  try {
    const { taskId, commentId } = req.params;
    const { reaction } = req.body;
    const userId = req.user.uid;

    const task = await Task.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const comment = await Comment.findByPk(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Перевіряємо чи коментар належить до завдання
    if (comment.taskId !== taskId) {
      return res.status(400).json({ message: 'Comment does not belong to this task' });
    }

    // Отримуємо поточні реакції або створюємо новий об'єкт
    const reactions = comment.reactions || {};
    if (!reactions[reaction]) {
      reactions[reaction] = [];
    }

    // Перевіряємо чи користувач вже додав цю реакцію
    if (!reactions[reaction].includes(userId)) {
      reactions[reaction].push(userId);
      await comment.update({ reactions });
    }

    return res.json({ reactions, userId });
  } catch (error) {
    console.error('Error adding reaction:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Remove a reaction from a comment
exports.removeReaction = async (req, res) => {
  try {
    const { taskId, commentId, reaction } = req.params;
    const userId = req.user.uid;

    const task = await Task.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const comment = await Comment.findByPk(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Перевіряємо чи коментар належить до завдання
    if (comment.taskId !== taskId) {
      return res.status(400).json({ message: 'Comment does not belong to this task' });
    }

    const reactions = comment.reactions || {};
    if (reactions[reaction]) {
      reactions[reaction] = reactions[reaction].filter(id => id !== userId);
      if (reactions[reaction].length === 0) {
        delete reactions[reaction];
      }
      await comment.update({ reactions });
    }

    return res.json({ reactions });
  } catch (error) {
    console.error('Error removing reaction:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Add a subtask
exports.addSubtask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    const userId = req.user.uid;
    console.log('Adding subtask to task:', id, title);

    const task = await Task.findOne({
      where: { id },
      include: [
        {
          model: Team,
          include: [{
            model: TeamMember,
            as: 'teamMembers',
            where: { userId },
            required: false
          }]
        }
      ]
    });
    
    if (!task) {
      console.log('Task not found:', id);
      return res.status(404).json({ error: 'Task not found' });
    }

    // Перевіряємо права доступу
    const isCreator = task.userId === userId;
    const isTeamMember = task.teamId ? task.Team.teamMembers.length > 0 : false;

    if (!isCreator && !isTeamMember) {
      console.log('User not authorized to add subtask');
      return res.status(403).json({ error: 'Not authorized' });
    }

    const subtask = await Subtask.create({
      title,
      completed: false,
      order: 0,
      userId,
      taskId: id
    });

    // Emit socket event
    const io = getIO();
    if (task.teamId) {
      io.to(`team-${task.teamId}`).emit('taskUpdated', {
        ...task.toJSON(),
        subtasks: [...(task.subtasks || []), subtask]
      });
    } else {
      io.to(`user-${task.userId}`).emit('taskUpdated', {
        ...task.toJSON(),
        subtasks: [...(task.subtasks || []), subtask]
      });
    }

    console.log('Subtask added successfully');
    res.status(201).json(subtask);
  } catch (error) {
    console.error('Error adding subtask:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update a subtask
exports.updateSubtask = async (req, res) => {
  try {
    const { id, subtaskId } = req.params;
    const updates = req.body;
    console.log('Updating subtask:', id, subtaskId, updates);

    // Find the subtask directly
    const subtask = await Subtask.findOne({ where: { id: subtaskId, taskId: id } });
    if (!subtask) {
      return res.status(404).json({ error: 'Subtask not found' });
    }

    if (updates.completed && !subtask.completed) {
      updates.completedAt = new Date();
      updates.completedBy = {
        id: req.user.user_id,
        name: req.user.name,
        email: req.user.email,
        avatar: req.user.avatar
      };
    }

    await subtask.update(updates);
    console.log('Subtask updated successfully');
    res.json(subtask);
  } catch (error) {
    console.error('Error updating subtask:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete a subtask
exports.deleteSubtask = async (req, res) => {
  try {
    const { id, subtaskId } = req.params;
    console.log('Deleting subtask:', id, subtaskId);

    // Find and delete the subtask directly
    const deleted = await Subtask.destroy({ where: { id: subtaskId, taskId: id } });
    if (!deleted) {
      return res.status(404).json({ error: 'Subtask not found' });
    }
    console.log('Subtask deleted successfully');
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting subtask:', error);
    res.status(500).json({ error: error.message });
  }
}; 