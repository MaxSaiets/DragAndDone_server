const Router = require('express')
const router = new Router() 

const typeController = require('../controllers/typeController')

const checkVerifyAdminMiddleware = require('../middleware/checkVerifyAdminMiddleware')

router.get('/fetchTypes', typeController.getAll);

router.post('/getCategoryTypes', typeController.getCategoryTypes);

router.post('/addNewType', checkVerifyAdminMiddleware, typeController.create);
router.post('/addNewType', typeController.create);
router.delete('/deleteType/:id', checkVerifyAdminMiddleware, typeController.delete);
router.put('/updateType/:id', checkVerifyAdminMiddleware, typeController.update);

    
module.exports = router