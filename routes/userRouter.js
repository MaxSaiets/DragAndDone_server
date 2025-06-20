const Router = require('express')
const router = new Router() 
const userController = require('../controllers/userController')
const authMiddleware = require('../middleware/authMiddleware')

// методи для user
router.post('/getOrsaveNewUserInDatabase', userController.getOrsaveNewUserInDatabase)  
router.post('/getUserFromDatabase', authMiddleware, userController.getUserFromDatabase) 
router.get('/auth', authMiddleware, userController.checkAuth) // чи авторизований користувач по jwt токену
router.post('/checkUserByEmail', userController.checkUserByEmail);

module.exports = router

