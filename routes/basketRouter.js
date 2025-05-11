const Router = require('express')
const router = new Router() 

const BasketController = require('../controllers/basketController');
const checkAuthMiddleware = require('../middleware/checkAuthMiddleware')

router.post('/addItemToBasket', checkAuthMiddleware, BasketController.addProductToBasket);
router.get('/fetchUserBasket', checkAuthMiddleware, BasketController.getBasketProducts);
router.delete('/deleteBasketItem', checkAuthMiddleware, BasketController.removeProductFromBasket);
router.put('/updateQuantityItemInBasket', checkAuthMiddleware, BasketController.updateProductQuantityInBasket);

module.exports = router