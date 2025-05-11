const Router = require('express')
const router = new Router() 

const checkAuthMiddleware = require('../middleware/checkAuthMiddleware')

const FavoriteController = require('../controllers/favoriteController')

router.post('/addFavoriteItem', checkAuthMiddleware, FavoriteController.addFavoriteProduct);
router.get('/fetchUserFavorites', checkAuthMiddleware, FavoriteController.getFavoriteProducts);
router.delete('/deleteFavoriteItem', checkAuthMiddleware, FavoriteController.removeFavoriteProduct);
router.delete('/removeFavoriteList', checkAuthMiddleware, FavoriteController.removeFavoriteList);

module.exports = router