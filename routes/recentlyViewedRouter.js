const Router = require('express')
const router = new Router() 

const RecentlyViewedController = require('../controllers/recentlyViewedController');

const checkAuthMiddleware = require('../middleware/checkAuthMiddleware')

router.post('/addRecentlyViewedItem', checkAuthMiddleware, RecentlyViewedController.addRecentlyViewedProduct);
router.get('/fetchUsersRecentlyViewed', checkAuthMiddleware, RecentlyViewedController.getRecentlyViewedProducts);
router.delete('/deleteRecentlyViewdItem', checkAuthMiddleware, RecentlyViewedController.removeRecentlyViewedProduct);
router.delete('/deleteRecentlyViewdAll', checkAuthMiddleware, RecentlyViewedController.removeRecentlyViewedList);

module.exports = router 