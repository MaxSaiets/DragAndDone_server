const Router = require('express')
const router = new Router() 

const productController = require('../controllers/productController')

const checkVerifyAdminMiddleware = require('../middleware/checkVerifyAdminMiddleware')
const checkAuthMiddleware = require('../middleware/checkAuthMiddleware')

router.get('/fetchProducts', productController.getAll);
router.get('/fetchProductData/:id', checkAuthMiddleware, productController.getProductDataById);
router.post('/addNewProduct', checkVerifyAdminMiddleware, productController.create);
router.delete('/deleteProduct/:id', checkVerifyAdminMiddleware, productController.delete);
router.put('/updateProduct/:id', checkVerifyAdminMiddleware, productController.update);

router.post('/fetchProductsData', checkAuthMiddleware, productController.fetchProductsData);

router.get('/getFilteredProducts', checkAuthMiddleware, productController.getFilteredProducts);

module.exports = router