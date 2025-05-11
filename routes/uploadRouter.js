const Router = require('express')
const router = new Router() 

const uploadController = require('../controllers/uploadController')

router.post('/category', uploadController.uploadNewCategory)  
router.post('/user/:id', uploadController.uploadUser) 

module.exports = router