const { FavoriteList, FavoriteItem } = require('../models/models');

const { getDetailedProductInfoForBasketAndFavorites } = require('./commonFunctions/commonControllerFunctions');

class FavoriteController {
    async addFavoriteProduct(req, res) {
        try {
            const { productId } = req.body;
            const userId = req.user?.id;

            let favoriteItem;
            const [favoriteList, created] = await FavoriteList.findOrCreate({ where: { userId } });

            const existingFavoriteItem = await FavoriteItem.findOne({
                where: {
                    productId,
                    favoriteListId: favoriteList.id
                }   
            });

            if (existingFavoriteItem) {
                return res.status(200).send('Product is already in the favorites list.');
            }else{
                favoriteItem = await FavoriteItem.create({
                    productId,
                    favoriteListId: favoriteList.id
                });
            }
            const [detailedItem] = await getDetailedProductInfoForBasketAndFavorites({
                productsItems: [favoriteItem],
                userId: userId,
                imgsCount: 2
            });         

            return res.json(detailedItem);
        } catch (err) {
            console.error(err);
            return res.status(500).send('Error adding product to favorites: ' + err.message);
        }
    }

    async getFavoriteProducts(req, res) {
        try { 
            const { productDataCount, fetchAllProducts } = req.query;
            const userId = req.user?.id;

            if(!userId){
                return res.json({ favorite_items: [] });
            }

            const favoriteList = await FavoriteList.findOne({
                where: { userId },
                include: [{
                    model: FavoriteItem,
                    limit: fetchAllProducts === true ? undefined : productDataCount
                }]
            });

            if(!favoriteList) {
                return res.status(200).json({favorite_items: [], message: 'Favorite list not found' });
            }

            const favoritesItems = await FavoriteItem.findAll({ where: { favoriteListId: favoriteList.id } });

            const detailedItems = await getDetailedProductInfoForBasketAndFavorites({productsItems: favoritesItems, userId});
            
            return res.json({ favorite_items: detailedItems });
        } catch (err) {
            console.error(err);
            return res.status(500).send('Error fetching favorite products: ' + err.message);
        }
    } 

    async removeFavoriteProduct(req, res) {
        try {
            const { productId } = req.query;
            const userId = req.user?.id;

            if (!userId || !productId) {
                return res.status(400).json({ message: 'User ID and Product ID are required' });
            }

            const favoriteList = await FavoriteList.findOne({
                where: {
                    userId
                }
            });

            if (!favoriteList) {
                return res.status(404).json({ message: 'Favorite list not found' });
            }

            const favoriteItem = await FavoriteItem.findOne({
                where: {
                    favoriteListId: favoriteList.id,
                    productId
                }
            });

            if (favoriteItem) {
                await favoriteItem.destroy();
                return res.json({ message: 'Product removed from basket' });
            } else {
                return res.status(404).json({ message: 'Product not found in favoriteList' });
            }
        } catch (err) {
            console.error(err);
            return res.status(500).send('Error removing product from favorites: ' + err.message);
        }
    }

    async removeFavoriteList(req, res) {
        try {
            const userId = req.user?.id;
    
            if (!userId) {
                return res.status(400).json({ message: 'User ID is required' });
            }

            const favoriteList = await FavoriteList.findOne({
                where: {
                    userId
                }
            });

            if (!favoriteList) {
                return res.status(404).json({ message: 'Favorite list not found' });
            }

            await FavoriteItem.destroy({
                where: {
                    favoriteListId: favoriteList.id
                }
            });

            await favoriteList.destroy();

            return res.json({ message: 'Favorite list removed' });
        } catch (err) {
            console.error(err);
            return res.status(500).send('Error removing product from favorites: ' + err.message);
        }
    }
}

module.exports = new FavoriteController();