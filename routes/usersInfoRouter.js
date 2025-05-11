const Router = require('express')
const router = new Router() 
const usersInfoController = require('../controllers/usersInfoController')

router.get('/allUsers', usersInfoController.allUsers)  
router.post('/createNewUser', usersInfoController.createUser)  
router.put('/updateUser/:id', usersInfoController.updateUser) 
router.delete('/deleteUser/:id', usersInfoController.deleteUser) 

module.exports = router