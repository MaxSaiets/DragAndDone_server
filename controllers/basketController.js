const { Basket, BasketItem } = require('../models/models');

const { getDetailedProductInfoForBasketAndFavorites } = require('./commonFunctions/commonControllerFunctions');

class BasketController {
    async addProductToBasket(req, res) {
        try {
            const { productId, quantity = 1 } = req.body;
            const userId = req.user?.id;

            let basketItem;

            const [basket, created] = await Basket.findOrCreate({ where: { userId } });

            const existingBasketItem = await BasketItem.findOne({
                where: {
                    productId,
                    basketId: basket.id,
                    quantity: quantity
                }   
            });

            if (existingBasketItem) {
                return res.status(200).send('Product is already in the basket.');
            }else{
                basketItem = await BasketItem.create({
                    productId,
                    basketId: basket.id,
                    quantity
                });
            }
            
            const [detailedItem] = await getDetailedProductInfoForBasketAndFavorites({
                productsItems: [basketItem],
                userId: userId,
                imgsCount: 2
            });
            
            return res.json(detailedItem);
        } catch (err) {
            console.error(err);
            return res.status(500).send('Error adding product to basket: ' + err.message);
        }
    }

    async getBasketProducts(req, res) {
        try {
            const userId = req.user?.id;
            
            if(!userId){
                return res.json({ basket_items: [] });
            }

            const basket = await Basket.findOne({ 
                where: { userId },
                include: [BasketItem]
            });

            if(basket){
                const basketItems = await BasketItem.findAll({ where: { basketId: basket.id } });
    
                const detailedItems = await getDetailedProductInfoForBasketAndFavorites({productsItems: basketItems, userId});
                return res.json({ basket_items: detailedItems });
            }
        } catch (err) {
            console.error(err);
            return res.status(500).send('Error fetching basket products: ' + err.message);
        }
    }

    async removeProductFromBasket(req, res) {
        try {
            const { productId } = req.query;
            const userId = req.user?.id;

            if (!userId || !productId) {
                return res.status(400).json({ message: 'User ID and Product ID are required' });
            }

            const basket = await Basket.findOne({ where: { userId } });
            if (!basket) {
                return res.status(404).json({ message: 'Basket not found' });
            }

            const basketItem = await BasketItem.findOne({ where: { productId, basketId: basket.id } });

            if (basketItem) {
                await basketItem.destroy();
            }
            
            return res.json({ message: 'Basket item removed' });
        } catch (err) {
            console.error(err);
            return res.status(500).send('Error removing product from basket: ' + err.message);
        }
    }

    async updateProductQuantityInBasket(req, res) {
        try {
            const { productId, quantity } = req.body;
            const userId = req.user?.id;

            const basket = await Basket.findOne({ where: { userId } });
            if (!basket) {
                return res.status(404).json({ message: 'Basket not found' });
            }

            const basketItem = await BasketItem.findOne({ where: { productId, basketId: basket.id } });

            if (basketItem) {
                basketItem.quantity = quantity;
                await basketItem.save();

                const [detailedItem] = await getDetailedProductInfoForBasketAndFavorites({
                    productsItems: [basketItem],
                    userId: userId,
                    imgsCount: 2
                });
                
                return res.json(detailedItem);
            } else {
                return res.status(404).json({ message: 'Product not found in basket' });
            }
        } catch (err) {
            console.error(err);
            return res.status(500).send('Error updating product quantity in basket: ' + err.message);
        }
    }
} 

module.exports = new BasketController();