const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const authMiddleware = require('../middleware/authMiddleware');

// Застосовуємо middleware автентифікації до всіх маршрутів
router.use(authMiddleware);

// Отримати всі команди користувача
router.get('/', teamController.getTeams);

// Отримати деталі команди
router.get('/:teamId', teamController.getTeamDetails);

// Отримати учасників команди
router.get('/:teamId/members', teamController.getMembers);

// Створити нову команду
router.post('/', teamController.createTeam);

// Оновити команду
router.put('/:id', teamController.updateTeam);

// Видалити команду
router.delete('/:id', teamController.deleteTeam);

// Додати учасника до команди
router.post('/:teamId/members', teamController.addTeamMember);

// Оновити роль учасника
router.put('/:teamId/members/:userId/role', teamController.updateTeamMemberRole);

// Видалити учасника з команди
router.delete('/:teamId/members/:userId', teamController.removeTeamMember);

module.exports = router; 