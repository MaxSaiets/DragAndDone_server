const { Subtask, Task, User } = require('../models');
const { getIO } = require('../utils/socket');
const { v4: uuidv4 } = require('uuid');

// Отримати всі підзавдання для завдання
exports.getTaskSubtasks = async (req, res) => {
  try {
    const { taskId } = req.params;
    
    const subtasks = await Subtask.findAll({
      where: { taskId },
      include: [
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'displayName', 'photoURL']
        }
      ],
      order: [['order', 'ASC']]
    });

    res.json(subtasks);
  } catch (error) {
    console.error('Error getting subtasks:', error);
    res.status(500).json({ message: error.message });
  }
};

// Створити нове підзавдання
exports.createSubtask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title, description, assignedTo, dueDate } = req.body;
    const userId = req.user.uid;

    const task = await Task.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Перевіряємо права на створення
    if (task.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized to create subtasks' });
    }

    const subtask = await Subtask.create({
      id: uuidv4(),
      taskId,
      title,
      description,
      assignedTo,
      dueDate,
      progress: 0,
      order: 0
    });

    // Отримуємо повну інформацію про підзавдання
    const fullSubtask = await Subtask.findByPk(subtask.id, {
      include: [
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'displayName', 'photoURL']
        }
      ]
    });

    // Відправляємо сповіщення призначеному користувачу
    if (assignedTo) {
      const io = getIO();
      io.to(`user-${assignedTo}`).emit('notification', {
        type: 'subtask_assigned',
        title: 'New Subtask Assigned',
        message: `You have been assigned to subtask: ${title}`,
        data: { taskId, subtaskId: subtask.id }
      });
    }

    res.status(201).json(fullSubtask);
  } catch (error) {
    console.error('Error creating subtask:', error);
    res.status(500).json({ message: error.message });
  }
};

// Оновити підзавдання
exports.updateSubtask = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.user.uid;

    const subtask = await Subtask.findByPk(id);
    if (!subtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

    // Перевіряємо права на редагування
    const task = await Task.findByPk(subtask.taskId);
    if (task.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized to edit this subtask' });
    }

    await subtask.update(updates);

    // Отримуємо оновлене підзавдання з повною інформацією
    const updatedSubtask = await Subtask.findByPk(id, {
      include: [
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'displayName', 'photoURL']
        }
      ]
    });

    // Відправляємо сповіщення про зміни
    if (updates.assignedTo && updates.assignedTo !== subtask.assignedTo) {
      const io = getIO();
      io.to(`user-${updates.assignedTo}`).emit('notification', {
        type: 'subtask_assigned',
        title: 'Subtask Assigned',
        message: `You have been assigned to subtask: ${subtask.title}`,
        data: { taskId: subtask.taskId, subtaskId: subtask.id }
      });
    }

    res.json(updatedSubtask);
  } catch (error) {
    console.error('Error updating subtask:', error);
    res.status(500).json({ message: error.message });
  }
};

// Видалити підзавдання
exports.deleteSubtask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    const subtask = await Subtask.findByPk(id);
    if (!subtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

    // Перевіряємо права на видалення
    const task = await Task.findByPk(subtask.taskId);
    if (task.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this subtask' });
    }

    await subtask.destroy();
    res.json({ message: 'Subtask deleted successfully' });
  } catch (error) {
    console.error('Error deleting subtask:', error);
    res.status(500).json({ message: error.message });
  }
};

// Оновити прогрес підзавдання
exports.updateProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const { progress } = req.body;
    const userId = req.user.uid;

    const subtask = await Subtask.findByPk(id);
    if (!subtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

    // Перевіряємо права на оновлення
    const task = await Task.findByPk(subtask.taskId);
    if (task.userId !== userId && subtask.assignedTo !== userId) {
      return res.status(403).json({ message: 'Not authorized to update this subtask' });
    }

    await subtask.update({ progress });

    // Отримуємо оновлене підзавдання з повною інформацією
    const updatedSubtask = await Subtask.findByPk(id, {
      include: [
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'displayName', 'photoURL']
        }
      ]
    });

    res.json(updatedSubtask);
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ message: error.message });
  }
};

// Додати залежність
exports.addDependency = async (req, res) => {
  try {
    const { id } = req.params;
    const { dependencyId } = req.body;
    const userId = req.user.uid;

    const subtask = await Subtask.findByPk(id);
    if (!subtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

    // Перевіряємо чи існує залежність
    const dependency = await Subtask.findByPk(dependencyId);
    if (!dependency) {
      return res.status(404).json({ message: 'Dependency subtask not found' });
    }

    // Перевіряємо права на редагування
    const task = await Task.findByPk(subtask.taskId);
    if (task.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized to edit this subtask' });
    }

    // Оновлюємо залежності
    const dependencies = subtask.dependencies || [];
    if (!dependencies.includes(dependencyId)) {
      dependencies.push(dependencyId);
      await subtask.update({ dependencies });
    }

    // Отримуємо оновлене підзавдання з повною інформацією
    const updatedSubtask = await Subtask.findByPk(id, {
      include: [
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'displayName', 'photoURL']
        }
      ]
    });

    res.json(updatedSubtask);
  } catch (error) {
    console.error('Error adding dependency:', error);
    res.status(500).json({ message: error.message });
  }
};

// Видалити залежність
exports.removeDependency = async (req, res) => {
  try {
    const { id } = req.params;
    const { dependencyId } = req.body;
    const userId = req.user.uid;

    const subtask = await Subtask.findByPk(id);
    if (!subtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

    // Перевіряємо права на редагування
    const task = await Task.findByPk(subtask.taskId);
    if (task.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized to edit this subtask' });
    }

    // Оновлюємо залежності
    const dependencies = subtask.dependencies || [];
    const updatedDependencies = dependencies.filter(depId => depId !== dependencyId);
    await subtask.update({ dependencies: updatedDependencies });

    // Отримуємо оновлене підзавдання з повною інформацією
    const updatedSubtask = await Subtask.findByPk(id, {
      include: [
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'displayName', 'photoURL']
        }
      ]
    });

    res.json(updatedSubtask);
  } catch (error) {
    console.error('Error removing dependency:', error);
    res.status(500).json({ message: error.message });
  }
}; 