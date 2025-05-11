const { Product, Image, FavoriteList, FavoriteItem, Basket, BasketItem } = require('../../models/models');

async function getDetailedProductInfoForBasketAndFavorites({productsItems, userId, imgsCount = 2}) {
    const productIds = productsItems.map(item => item.productId);
    
    try {
        const [products] = await Promise.all([
            Product.findAll({ 
                where: { id: productIds },
                include: [{
                    model: Image,
                    attributes: ['imgSrc'],
                    as: 'images'
                }]
            }),
        ]);
        
        let favoriteProductIds = [];
        let basketProductIds = [];
    
        if (userId) {
            const favoriteList = await FavoriteList.findOne({ where: { userId } });
            if (favoriteList) {
                const favoriteItems = await FavoriteItem.findAll({ where: { favoriteListId: favoriteList.id } });
                favoriteProductIds = favoriteItems.map(item => item.productId);
            }

            const basket = await Basket.findOne({ where: { userId } });
            if (basket) {
                const basketItems = await BasketItem.findAll({ where: { basketId: basket.id } });
                basketProductIds = basketItems.map(item => item.productId);
            }
        }

        return productsItems.map(item => {
            const product = products.find(prod => prod.id === item.productId);
            const isFavorite = favoriteProductIds.includes(product.id);
            const isInBasket = basketProductIds.includes(product.id);

            const images = product.images ? product.images.slice(0, imgsCount).map(image => image.imgSrc) : [];

            return {
                id: product.id,
                code: product.code,
                title: product.title,
                price: product.price,
                quantity: item.quantity,
                images: images,
                isFavorite,
                isInBasket,
            };
        });
    } catch (error) {
        console.error("Error fetching product details: ", error);
        throw error;
    }
}

async function getDetailedProductsInfoWithBasketAndFavorites({productsItems, userId, imgsCount = 2}) {
    const productIds = productsItems.map((item) => {
        return item.id;
    })
    
    try {
        const [products] = await Promise.all([
            Product.findAll({ 
                where: { id: productIds },
                include: [{
                    model: Image,
                    attributes: ['imgSrc'],
                    as: 'images'
                }]
            }),
        ]);

        let favoriteProductIds = [];
        let basketProductIds = [];
    
        if (userId) {
            const favoriteList = await FavoriteList.findOne({ where: { userId } });
            if (favoriteList) {
                const favoriteItems = await FavoriteItem.findAll({ where: { favoriteListId: favoriteList.id } });
                favoriteProductIds = favoriteItems.map(item => item.productId);
            }

            const basket = await Basket.findOne({ where: { userId } });
            if (basket) {
                const basketItems = await BasketItem.findAll({ where: { basketId: basket.id } });
                basketProductIds = basketItems.map(item => item.productId);
            }
        }

        return productsItems.map(item => {
            const product = products.find(product => product.id === item.id);

            const isFavorite = favoriteProductIds.includes(product.id);
            const isInBasket = basketProductIds.includes(product.id);

            const images = product.images ? product.images.slice(0, imgsCount).map(image => image.imgSrc) : [];

            return {
                id: product.id,
                code: product.code,
                title: product.title,
                price: product.price,
                images: images,
                isFavorite,
                isInBasket,
            };
        });
    } catch (error) {
        console.error("Error fetching product details: ", error);
        throw error;
    }
}

async function getDetailedProductInfo({productsItems, imgsCount = 2}) {
    const productIds = productsItems.map(item => item.id);
    
    try {
        const [products] = await Promise.all([
            Product.findAll({ 
                where: { id: productIds },
                include: [{
                    model: Image,
                    attributes: ['imgSrc'],
                    as: 'images'
                }]
            }),
        ]);

        return productsItems.map(item => {
            const product = products.find(prod => prod.id === item.id);
            const isFavorite = false;
            const isInBasket = false;

            const images = product.images ? product.images.slice(0, imgsCount).map(image => image.imgSrc) : [];

            return {
                id: product.id,
                code: product.code,
                title: product.title,
                price: product.price,
                images: images,
                isFavorite,
                isInBasket,
            };
        });
    } catch (error) {
        console.error("Error fetching product details: ", error);
        throw error;
    }
}

function getRandomArray(size, max) {
    const numbers = Array.from({ length: max }, (v, k) => k + 1);
    const randomArray = [];

    for (let i = numbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }

    for (let i = 0; i < size; i++) {
        randomArray.push(numbers[i]);
    }

    return randomArray;
}


module.exports = {
    getDetailedProductInfoForBasketAndFavorites,
    getDetailedProductsInfoWithBasketAndFavorites,
    getDetailedProductInfo,
    getRandomArray,
};