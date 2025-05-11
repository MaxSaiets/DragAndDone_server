const Router = require('express')
const router = new Router() 

const ProductsForAdsController = require('../controllers/productsForAdsController');
const checkAuthMiddleware = require('../middleware/checkAuthMiddleware')

router.get('/fetchProductsForAdsBlock', checkAuthMiddleware, ProductsForAdsController.getRandomProductsForAds);

module.exports = router