const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authenticate = require('../middleware/authMiddleware');
const multer = require('multer');
const upload = multer({ dest: 'static/chat_uploads/' });

console.log('chatController in routes:', chatController);
console.log('createChat function:', chatController.createChat);

// Async handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Чати
router.post('/', authenticate, asyncHandler(chatController.createChat));
router.get('/', authenticate, asyncHandler(chatController.getChats));
router.get('/:chatId', authenticate, asyncHandler(chatController.getChatById));
router.delete('/:chatId', authenticate, asyncHandler(chatController.deleteChat));

// Учасники
router.post('/:chatId/users', authenticate, asyncHandler(chatController.addUserToChat));
router.delete('/:chatId/users/:userId', authenticate, asyncHandler(chatController.removeUserFromChat));

// Повідомлення
router.post('/:chatId/messages', authenticate, asyncHandler(chatController.sendMessage));
router.put('/:chatId/messages/:messageId', authenticate, asyncHandler(chatController.editMessage));
router.delete('/:chatId/messages/:messageId', authenticate, asyncHandler(chatController.deleteMessage));

// Файли
router.post('/:chatId/messages/:messageId/files', authenticate, upload.single('file'), asyncHandler(chatController.uploadFile));
router.delete('/:chatId/messages/:messageId/files/:fileId', authenticate, asyncHandler(chatController.deleteFile));

module.exports = router; 