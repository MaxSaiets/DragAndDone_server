const Router = require('express')
const router = new Router() 

const subCategoriesController = require('../controllers/subCategoriesController')

const checkVerifyAdminMiddleware = require('../middleware/checkVerifyAdminMiddleware')

router.get('/subCategories', subCategoriesController.getSubCategories)
router.post('/addSubCategories', checkVerifyAdminMiddleware, subCategoriesController.addSubCategories)

router.delete('/deleteSubCategory/:id', checkVerifyAdminMiddleware, subCategoriesController.deleteSubCategory) 

router.get('/getSubCategoriesIcons', subCategoriesController.getSubCategoriesIcons) 
router.delete('/deleteImgSubCategory/:id', checkVerifyAdminMiddleware, subCategoriesController.deleteImgSubCategory) 

router.put('/updateSubCategory/:id', checkVerifyAdminMiddleware, subCategoriesController.updateSubCategory)

module.exports = router