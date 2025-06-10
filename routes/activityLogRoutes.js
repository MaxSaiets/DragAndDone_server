const Router = require('express');
const router = new Router();
const activityLogController = require('../controllers/activityLogController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Activity log management
router.post('/', activityLogController.addLog);
router.get('/user/:userId', activityLogController.getUserLogs);
router.get('/stats', activityLogController.getStats);

module.exports = router; 