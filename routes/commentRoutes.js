const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const auth = require('../middleware/authMiddleware');

// Отримати всі коментарі для завдання
router.get('/task/:taskId', auth, commentController.getTaskComments);

// Додати новий коментар
router.post('/', auth, commentController.createComment);

// Редагувати коментар
router.put('/:id', auth, commentController.updateComment);

// Видалити коментар
router.delete('/:id', auth, commentController.deleteComment);

// Додати реакцію на коментар
router.post('/:id/reactions', auth, commentController.addReaction);

// Видалити реакцію з коментаря
router.delete('/:id/reactions', auth, commentController.removeReaction);

module.exports = router; 