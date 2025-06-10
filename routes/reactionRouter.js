const Router = require('express');
const reactionController = require('../controllers/reactionController');
const authMiddleware = require('../middleware/authMiddleware');

const router = new Router();

// Додавання реакції до коментаря
router.post('/:taskId/comments/:commentId/reactions', authMiddleware, reactionController.addReaction);

// Видалення реакції з коментаря
router.delete('/:taskId/comments/:commentId/reactions/:reaction', authMiddleware, reactionController.removeReaction);

module.exports = router; 