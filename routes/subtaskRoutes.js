const express = require('express');
const router = express.Router();
const subtaskController = require('../controllers/subtaskController');
const auth = require('../middleware/authMiddleware');

// Отримати всі підзавдання для завдання
router.get('/task/:taskId', auth, subtaskController.getTaskSubtasks);

// Створити нове підзавдання
router.post('/task/:taskId', auth, subtaskController.createSubtask);

// Оновити підзавдання
router.put('/:id', auth, subtaskController.updateSubtask);

// Видалити підзавдання
router.delete('/:id', auth, subtaskController.deleteSubtask);

// Оновити прогрес підзавдання
router.patch('/:id/progress', auth, subtaskController.updateProgress);

// Додати залежність
router.post('/:id/dependencies', auth, subtaskController.addDependency);

// Видалити залежність
router.delete('/:id/dependencies', auth, subtaskController.removeDependency);

module.exports = router; 