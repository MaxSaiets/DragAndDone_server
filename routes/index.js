const Router = require('express')
const router = new Router() // головний роутер 
const userRouter = require('./userRouter')
const typeRouter = require('./typeRouter')
const brandRouter = require('./brandRouter')
const usersInfoRouter = require('./usersInfoRouter')
const categoryRouter = require('./categoryRouter')
const subCategoryRouter = require('./subCategoryRouter')
const productRouter = require('./productRouter')
const favoritesRouter = require('./favoritesRouter')
const basketRouter = require('./basketRouter')
const recentlyViewedRouter = require('./recentlyViewedRouter')
const productsForAdsRouter = require('./productsForAdsRouter')
const uploadRouter = require('./uploadRouter')

//под роутери
router.use('/user', userRouter)

router.use('/brand', brandRouter)
router.use('/type', typeRouter)

router.use('/usersInfo', usersInfoRouter)
router.use('/categories', categoryRouter)

router.use('/subCategories', subCategoryRouter)

router.use('/products', productRouter)

router.use('/upload', uploadRouter)

router.use('/favorites', favoritesRouter)

router.use('/basket', basketRouter)

router.use('/recentlyViewed', recentlyViewedRouter)

router.use('/productsAds', productsForAdsRouter)

module.exports = router

