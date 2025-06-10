const Router = require('express')
const router = new Router() 
const taskController = require('../controllers/taskController');
const authMiddleware = require('../middleware/authMiddleware')

// Get all tasks
router.get('/', authMiddleware, taskController.getTasks);

// Get task by ID
router.get('/:id', authMiddleware, taskController.getTaskById);

// Create a new task
router.post('/', authMiddleware, taskController.createTask);

// Update a task
router.put('/:id', authMiddleware, taskController.updateTask);

// Delete a task
router.delete('/:id', authMiddleware, taskController.deleteTask);

// Update task status
router.patch('/:id/status', authMiddleware, taskController.updateTaskStatus);

// Update task order
router.patch('/order', authMiddleware, taskController.updateTaskOrder);

// Upload files
router.post('/:id/files', authMiddleware, taskController.uploadFiles);

// Delete file
router.delete('/:taskId/files/:fileId', authMiddleware, taskController.deleteFile);

// Comments
router.post('/:id/comments', authMiddleware, taskController.addComment);
router.put('/:id/comments/:commentId', authMiddleware, taskController.editComment);
router.delete('/:id/comments/:commentId', authMiddleware, taskController.deleteComment);

// Reactions
router.post('/:taskId/comments/:commentId/reactions', authMiddleware, taskController.addReaction);
router.delete('/:taskId/comments/:commentId/reactions/:reaction', authMiddleware, taskController.removeReaction);

// Subtasks
router.post('/:id/subtasks', authMiddleware, taskController.addSubtask);
router.put('/:id/subtasks/:subtaskId', authMiddleware, taskController.updateSubtask);
router.delete('/:id/subtasks/:subtaskId', authMiddleware, taskController.deleteSubtask);

module.exports = router; 