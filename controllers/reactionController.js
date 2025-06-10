const { Task, Comment } = require('../models');
const { User } = require('../models');

class ReactionController {
  async addReaction(req, res) {
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

      // Отримуємо оновлений коментар з даними користувача
      const updatedComment = await Comment.findByPk(commentId, {
        include: [
          {
            model: User,
            attributes: ['id', 'displayName', 'photoURL']
          }
        ]
      });

      return res.json(updatedComment);
    } catch (error) {
      console.error('Error adding reaction:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async removeReaction(req, res) {
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

      // Отримуємо оновлений коментар з даними користувача
      const updatedComment = await Comment.findByPk(commentId, {
        include: [
          {
            model: User,
            attributes: ['id', 'displayName', 'photoURL']
          }
        ]
      });

      return res.json(updatedComment);
    } catch (error) {
      console.error('Error removing reaction:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
}

module.exports = new ReactionController(); 