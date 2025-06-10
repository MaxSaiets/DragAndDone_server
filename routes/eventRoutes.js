const Router = require('express');
const router = new Router();
const eventController = require('../controllers/eventController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Event management
router.post('/', eventController.createEvent);
router.get('/', eventController.getEvents);
router.put('/:id', eventController.updateEvent);
router.delete('/:id', eventController.deleteEvent);

module.exports = router; 