const { Product } = require('../models/models');
const sequelize = require('../db');

const { getDetailedProductsInfoWithBasketAndFavorites, getDetailedProductInfo, getRandomArray } = require('./commonFunctions/commonControllerFunctions');

class ProductsForAdsController {
    async getRandomProductsForAds(req, res) {
        try {
            const { itemsCount } = req.query;
            const userId = req.user?.id;
            let detailedProducts = [];  

            const randomProducts = await Product.findAll({
                order: sequelize.random(),
                limit: itemsCount
            });
            
            const randomDiscountPercents = getRandomArray(itemsCount, 60);
            
            if(userId){
                detailedProducts = await getDetailedProductsInfoWithBasketAndFavorites({productsItems: randomProducts, userId: userId, imgsCount: 1});
            }else{
                detailedProducts = await getDetailedProductInfo({productsItems: randomProducts, imgsCount: 1});
            }

            const productsWithDiscount = detailedProducts.map((product, index) => {
                const discountPercent = randomDiscountPercents[index];
                const discountAmount = (product.price * discountPercent / 100).toFixed(0);

                return {
                    ...product,
                    discount: discountAmount,
                    discountPercentage: discountPercent,
                    discountedPrice: product.price - discountAmount
                };
            });
            
            return res.json({products: productsWithDiscount});
        } catch (err) {
            console.error(err);
            return res.status(500).send('Error fetching basket products: ' + err.message);
        }
    }
} 

module.exports = new ProductsForAdsController();