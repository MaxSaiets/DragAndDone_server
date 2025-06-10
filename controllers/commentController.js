const { Comment, User, Task, Team, TeamMember } = require('../models');
const { getIO } = require('../utils/socket');
const { v4: uuidv4 } = require('uuid');

// Отримання коментарів для завдання
exports.getTaskComments = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.uid;

    // Перевіряємо чи існує завдання і чи має користувач права на перегляд коментарів
    const task = await Task.findOne({
      where: { id: taskId },
      include: [
        {
          model: Team,
          include: [{
            model: TeamMember,
            where: { userId },
            required: false
          }]
        }
      ]
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Перевіряємо права доступу
    const isCreator = task.userId === userId;
    const isTeamMember = task.Team && task.Team.TeamMembers && task.Team.TeamMembers.length > 0;

    if (!isCreator && !isTeamMember) {
      return res.status(403).json({ error: 'Not authorized to view task comments' });
    }

    // Отримуємо коментарі
    const comments = await Comment.findAll({
      where: { taskId },
      include: [
        {
          model: User,
          attributes: ['uid', 'name', 'avatar']
        },
        {
          model: Comment,
          as: 'replies',
          include: [{
            model: User,
            attributes: ['uid', 'name', 'avatar']
          }]
        }
      ],
      order: [
        ['createdAt', 'DESC'],
        [{ model: Comment, as: 'replies' }, 'createdAt', 'ASC']
      ]
    });

    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
};

// Створення нового коментаря
exports.createComment = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { text, parentId } = req.body;
    const userId = req.user.uid;

    // Перевіряємо чи існує завдання і чи має користувач права на коментування
    const task = await Task.findOne({
      where: { id: taskId },
      include: [
        {
          model: Team,
          include: [{
            model: TeamMember,
            where: { userId },
            required: false
          }]
        }
      ]
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Перевіряємо права доступу
    const isCreator = task.userId === userId;
    const isTeamMember = task.Team && task.Team.TeamMembers && task.Team.TeamMembers.length > 0;

    if (!isCreator && !isTeamMember) {
      return res.status(403).json({ error: 'Not authorized to comment on this task' });
    }

    // Перевіряємо чи існує батьківський коментар, якщо вказано
    if (parentId) {
      const parentComment = await Comment.findOne({
        where: {
          id: parentId,
          taskId
        }
      });

      if (!parentComment) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }
    }

    // Створюємо коментар
    const comment = await Comment.create({
      text,
      userId,
      taskId,
      parentId
    });

    // Отримуємо створений коментар з усіма зв'язками
    const createdComment = await Comment.findByPk(comment.id, {
      include: [
        {
          model: User,
          attributes: ['uid', 'name', 'avatar']
        },
        {
          model: Comment,
          as: 'replies',
          include: [{
            model: User,
            attributes: ['uid', 'name', 'avatar']
          }]
        }
      ]
    });

    res.status(201).json(createdComment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
};

// Оновлення коментаря
exports.updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.user.uid;

    // Перевіряємо чи існує коментар і чи має користувач права на його редагування
    const comment = await Comment.findOne({
      where: { id },
      include: [{
        model: Task,
        include: [{
          model: Team,
          include: [{
            model: TeamMember,
            where: { userId },
            required: false
          }]
        }]
      }]
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Перевіряємо права доступу
    const isCreator = comment.userId === userId;
    const isTeamAdmin = comment.Task.Team && 
                       comment.Task.Team.TeamMembers && 
                       comment.Task.Team.TeamMembers.length > 0 && 
                       comment.Task.Team.TeamMembers[0].role === 'admin';

    if (!isCreator && !isTeamAdmin) {
      return res.status(403).json({ error: 'Not authorized to update this comment' });
    }

    // Оновлюємо коментар
    await comment.update({
      text,
      edited: true
    });

    // Отримуємо оновлений коментар
    const updatedComment = await Comment.findByPk(id, {
      include: [
        {
          model: User,
          attributes: ['uid', 'name', 'avatar']
        },
        {
          model: Comment,
          as: 'replies',
          include: [{
            model: User,
            attributes: ['uid', 'name', 'avatar']
          }]
        }
      ]
    });

    res.json(updatedComment);
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
};

// Видалення коментаря
exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    // Перевіряємо чи існує коментар і чи має користувач права на його видалення
    const comment = await Comment.findOne({
      where: { id },
      include: [{
        model: Task,
        include: [{
          model: Team,
          include: [{
            model: TeamMember,
            where: { userId },
            required: false
          }]
        }]
      }]
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Перевіряємо права доступу
    const isCreator = comment.userId === userId;
    const isTeamAdmin = comment.Task.Team && 
                       comment.Task.Team.TeamMembers && 
                       comment.Task.Team.TeamMembers.length > 0 && 
                       comment.Task.Team.TeamMembers[0].role === 'admin';

    if (!isCreator && !isTeamAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    // Видаляємо всі відповіді на коментар
    await Comment.destroy({
      where: { parentId: id }
    });

    // Видаляємо коментар
    await comment.destroy();

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};

// Додавання реакції на коментар
exports.addReaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { reaction } = req.body;
    const userId = req.user.uid;

    const comment = await Comment.findByPk(id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const reactions = comment.reactions || {};
    if (!reactions[reaction]) {
      reactions[reaction] = [];
    }

    // Перевіряємо чи користувач вже додав цю реакцію
    if (reactions[reaction].includes(userId)) {
      return res.status(400).json({ error: 'User already reacted with this emoji' });
    }

    reactions[reaction].push(userId);
    await comment.update({ reactions });

    res.json({ reactions });
  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({ error: 'Failed to add reaction' });
  }
};

// Видалення реакції з коментаря
exports.removeReaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { reaction } = req.body;
    const userId = req.user.uid;

    const comment = await Comment.findByPk(id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const reactions = comment.reactions || {};
    if (!reactions[reaction]) {
      return res.status(400).json({ error: 'Reaction not found' });
    }

    // Видаляємо реакцію користувача
    reactions[reaction] = reactions[reaction].filter(id => id !== userId);
    
    // Якщо більше немає реакцій цього типу, видаляємо ключ
    if (reactions[reaction].length === 0) {
      delete reactions[reaction];
    }

    await comment.update({ reactions });
    res.json({ reactions });
  } catch (error) {
    console.error('Error removing reaction:', error);
    res.status(500).json({ error: 'Failed to remove reaction' });
  }
}; 