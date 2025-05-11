const Router = require('express')
const router = new Router() 

const categoriesInfoController = require('../controllers/categoriesInfoController')

const checkVerifyAdminMiddleware = require('../middleware/checkVerifyAdminMiddleware')

router.get('/categoriesData', categoriesInfoController.getCategoriesData)  
router.post('/addCategory', checkVerifyAdminMiddleware, categoriesInfoController.addCategory)
router.put('/updateCategory/:id', checkVerifyAdminMiddleware, categoriesInfoController.updateCategory)

router.delete('/deleteCategory/:id', checkVerifyAdminMiddleware, categoriesInfoController.deleteCategory) 
router.delete('/deleteImgCategory/:id', checkVerifyAdminMiddleware, categoriesInfoController.deleteImgCategory) 

router.get('/getCategoriesIcons', categoriesInfoController.getCategoriesIcons) 
router.get('/getCategoriesNameId', categoriesInfoController.getCategoriesNameId) 

module.exports = router