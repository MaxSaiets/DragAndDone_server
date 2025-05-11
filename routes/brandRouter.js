const Router = require('express')
const router = new Router() 
const brandController = require('../controllers/brandController')

const checkVerifyAdminMiddleware = require('../middleware/checkVerifyAdminMiddleware')

router.get('/fetchBrands', brandController.getAll);
router.post('/addNewBrand', checkVerifyAdminMiddleware, brandController.create);
router.delete('/deleteBrand/:id', checkVerifyAdminMiddleware, brandController.delete);

router.put('/updateBrand/:id', checkVerifyAdminMiddleware, brandController.update);

module.exports = router