const {
    Product,
    Category,
    SubCategory,
    Type,
    Brand, 
    Image,
    ProductBrand,
    ProductImage,
    Basket,
    BasketItem,
    FavoriteList,
    FavoriteItem,
    RecentlyViewed,
} = require('../models/models')
const { Op } = require('sequelize');
const sequelize = require('../db');

class ProductController {
    async getAll(req, res) {
        // const productAssociations = Object.values(Product.associations);
        // console.log('Associations related to Product:');
        // productAssociations.forEach(association => {
        //     if (association.as && association.target && association.target.name && association.associationType) {
        //         console.log(`- Name: ${association.as}, Target: ${association.target.name}, Type: ${association.associationType}`);
        //     } else {
        //         console.log('Invalid association:', association);
        //     }
        // });
    
        try {
            const products = await Product.findAll({
                include: Object.values(Product.associations)
            })
    
            return res.json(products)
        } catch (error) {
            return res.status(500).json({error: error.message})
        }
    }

    async getProductDataById(req, res) {
        const { id } = req.params;
        const userId = req.user?.id;

        try {
            const product = await Product.findOne({
                where: { id },
                include: [
                    {
                        model: Image,
                        as: 'images',
                        required: false,
                        attributes: ['imgName', 'imgSrc', 'imageableType'],
                        where: {
                            [Op.or]: [
                                { imageableType: 'productFullPreview' },
                                { imageableType: 'productFullBigPreview' },
                                { imageableType: 'productImgBigPreview' },
                                { imageableType: 'productBigImg' }
                            ]
                        },
                        order: [
                            ['imageableType', 'ASC'],
                            ['createdAt', 'ASC']
                        ]
                    },
                    Brand,
                    Type,
                    SubCategory,
                ]
            });

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

            const imageMap = {};
            product.images.forEach(image => {
                const { imgName, imgSrc, imageableType } = image;
    
                const validImgSrc = imgSrc || 'https://firebasestorage.googleapis.com/v0/b/reactmarket-79722.appspot.com/o/utils%2F404.png?alt=media&token=161921ed-2e18-4cec-acff-2f8a171abaeb';
    
                if (!imageMap[imgName]) {
                    imageMap[imgName] = {
                        imgName: imgName,
                        imgSrc: validImgSrc,
                        imgBigSrc: imageableType === 'productFullBigPreview' ? validImgSrc : 'https://firebasestorage.googleapis.com/v0/b/reactmarket-79722.appspot.com/o/utils%2F404.png?alt=media&token=161921ed-2e18-4cec-acff-2f8a171abaeb',
                    };
                } else {
                    if (imageableType === 'productBigImg' || imageableType === 'productFullBigPreview') {
                        imageMap[imgName].imgBigSrc = validImgSrc;
                    }
                }
            });
    
            const images = Object.values(imageMap);

            const productWithFlags = {
                id: product.id,
                code: product.code,
                title: product.title,
                price: product.price,
                images: images,
                isFavorite: favoriteProductIds.includes(product.id),
                isInBasket: basketProductIds.includes(product.id)
            };
        
            return res.json(productWithFlags);
        } catch (error) {
            console.error("Error fetching product data: ", error);
            return res.status(500).json({ error: error.message });
        }
    }

    async create(req, res) {
        try { 
            let {title,
                price,
                categories,
                subCategories,
                types,
                brands,
                previewImageName,
                previewImageUrl,
                fullPreviewImageName,
                fullPreviewImageUrl,
                fullBigPreviewImageName,
                fullBigPreviewImageUrl,
                additionalImages,
            } = req.body;

                const product = await Product.create({
                    title,
                    price,
                    code: await generateUniqueCode(),
                });
                
                const previewImage = await Image.create({
                    imgName: previewImageName,
                    imgSrc: previewImageUrl,
                    imageableType: 'productPreview',
                });

                const previewFullImage = await Image.create({
                    imgName: fullPreviewImageName,
                    imgSrc: fullPreviewImageUrl,
                    imageableType: 'productFullPreview',
                });

                const previewFullBigImage = await Image.create({
                    imgName: fullBigPreviewImageName,
                    imgSrc: fullBigPreviewImageUrl,
                    imageableType: 'productFullBigPreview',
                });
                  
                await ProductImage.create({ productId: product.id, imageId: previewImage.id });
                await ProductImage.create({ productId: product.id, imageId: previewFullImage.id });
                await ProductImage.create({ productId: product.id, imageId: previewFullBigImage.id });
                  
                if(additionalImages &&  Array.isArray(additionalImages)){
                    for (const imageFile of additionalImages) {
                        const imageBigPreview = await Image.create({
                            imgName: imageFile.nameBigPreview,
                            imgSrc: imageFile.urlBigPreview,
                            imageableType: 'productImgBigPreview',
                        });
                  
                        await ProductImage.create({ productId: product.id, imageId: imageBigPreview.id });
                        
                        const imageBigImg = await Image.create({
                            imgName: imageFile.nameBigImg,
                            imgSrc: imageFile.urlBigImg,
                            imageableType: 'productBigImg',
                        });
                  
                        await ProductImage.create({ productId: product.id, imageId: imageBigImg.id });
                    }
                }
        
                await product.addCategories(categories.map(category => category.id));
                await product.addSubCategories(subCategories.map(subCategory => subCategory.id));
                await product.addTypes(types.map(type => type.id));
                await product.addBrands(brands.map(brand => brand.id));
                
                return res.json({product});
        } catch (err) {
            console.error(err);
            return res.status(500).send('Error creating product: ' + err.message);
        }
    }

    async delete(req, res) {
        try {
            const {id} = req.params
            const product = await Product.destroy({
                where: {id}
            })
            
            if (!product) {
                return res.status(404).json({error: 'Product not found'});
            }

            return res.json(product)
        } catch (error) {
            return res.status(500).json({error: error.message})
        }
    }

    async update(req, res) {
        try {
            const {id} = req.params
            const {title, price, discount, categories, subCategories, types, brands, mainImage} = req.body

            const product = await Product.update({title, price, discount}, {
                where: {id}
            })

            await product.setCategories(categories)
            await product.setSubCategories(subCategories)
            await product.setTypes(types)
            await product.setBrands(brands)
            await product.setImage(mainImage)

            return res.json(product)
        } catch (error) {
            return res.status(500).json({error: error.message})
        }
    }

    async fetchProductsData(req, res) {
        const { name, page = 1, brandsRequest, filters = {} } = req.body;
        const userId = req.user?.id;
        const limit = 10;
        const offset = (page - 1) * limit;
    
        const sequelizeFilters = await convertFiltersToSequelize(filters);
    
        try {
            const subCategories = await SubCategory.findAll({ where: { name } });
    
            let totalProductsCount;
            let products;
            let minPrice;
            let maxPrice;
            let productBrands;
            let types;
    
            let allProducts;
    
            if (subCategories.length > 0) {
                products = await fetchProductsBySubCategory(subCategories, brandsRequest, limit, offset, sequelizeFilters);
    
                totalProductsCount = await countProducts(SubCategory, subCategories, sequelizeFilters);
    
                // Return all products
                allProducts = await fetchProductsBySubCategory(subCategories, null, null, null, sequelizeFilters);
    
                ({ minPrice, maxPrice } = await fetchMinMaxPrice(SubCategory, subCategories));
    
            } else {
                types = await Type.findAll({ where: { name } });
                products = await fetchProductsByType(types, brandsRequest, limit, offset, sequelizeFilters);
                totalProductsCount = await countProducts(Type, types, sequelizeFilters);
    
                // Return all products
                allProducts = await fetchProductsByType(types, null, null, null, sequelizeFilters);
    
                ({ minPrice, maxPrice } = await fetchMinMaxPrice(Type, types));
            }
    
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
    
            const productsWithFlags = products.map(product => {
                const isFavorite = favoriteProductIds.includes(product.id);
                const isInBasket = basketProductIds.includes(product.id);
                const images = product.images.slice(0, 4).filter((_, index) => index === 0 || index === 3).map(image => image.dataValues.imgSrc);
    
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
    
            productBrands = await fetchBrandsWithProductCount(sequelizeFilters, products);
    
            const pageCount = Math.ceil(totalProductsCount / limit);

            return res.json({
                products: productsWithFlags,
                totalProductsCount,
                minPrice,
                maxPrice,
                brands: productBrands,
                pageCount
            });
        } catch (error) {
            console.log("Error fetching products: ", error);
            return res.status(500).json({ error: error.message });
        }
    }

    async getFilteredProducts(req, res) {
        const { category, subcategory, type, brand, productsCount, minPrice, maxPrice } = req.query;
        const userId = req.user?.id;
        try {
            const filters = {};
    
            const minPriceNumber = minPrice ? parseFloat(minPrice) : undefined;
            const maxPriceNumber = maxPrice ? parseFloat(maxPrice) : undefined;

            if (minPrice || maxPrice) {
                filters.price = {};
                if (minPrice) {
                    filters.price[Op.gte] = minPriceNumber;
                }
                if (maxPrice) {
                    filters.price[Op.lte] = maxPriceNumber;
                }
            }

            const products = await Product.findAll({
                where: filters,
                include: [
                    {
                        model: Category, 
                        attributes: ['name'],
                        where: category ? { name: category } : undefined
                    },
                    { 
                        model: SubCategory, 
                        attributes: ['name'],
                        where: subcategory ? { name: subcategory } : undefined // фільтруємо по підкатегорії
                    },
                    { 
                        model: Type, 
                        attributes: ['name'],
                        where: type ? { name: type } : undefined // фільтруємо по типу
                    },
                    { 
                        model: Brand, 
                        attributes: ['name'],
                        where: brand ? { name: brand } : undefined // фільтруємо по бренду
                    },
                    { 
                        model: Image, 
                        attributes: ['imgName', 'imgSrc']
                    }
                ],
                order: sequelize.random(),
                limit: productsCount ? parseInt(productsCount) : undefined, // перевірка на productsCount
            });

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
        
            const productsWithFlags = products.map(product => {
                const isFavorite = favoriteProductIds.includes(product.id) || false;
                const isInBasket = basketProductIds.includes(product.id) || false;
                const images = product.images.slice(0, 4).filter((_, index) => index === 0 || index === 3).map(image => image.dataValues.imgSrc);

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

            return res.json({ products: productsWithFlags });
            
        } catch (error) {
            console.log("Error fetching products: ", error);
            return res.status(500).json({ error: error.message });
        }
    }
}
 
async function fetchProductsBySubCategory(subCategories, brands, limit, offset, sequelizeFilters) {
    
    const include = [
        { model: SubCategory, where: { id: subCategories.map(subCategory => subCategory.id) } },
        Type,
        Image
    ];

    if (Array.isArray(brands) && brands.length > 0) {
        include.push({ model: Brand, where: { name: { [Op.in]: brands } } });
    }
    
    return await Product.findAll({
        where: sequelizeFilters,
        include,
        limit,
        offset
    });
}
 
async function fetchProductsByType(types, brands, limit, offset, sequelizeFilters) {
    const include = [
        { model: Type, where: { id: types.map(type => type.id) } },
        SubCategory,
        Image
    ];

    if (Array.isArray(brands) && brands.length > 0) {
        include.push({ model: Brand, where: { name: { [Op.in]: brands } } });
    }

    return await Product.findAll({
        where: sequelizeFilters,
        include,
        limit,
        offset
    });
}

async function convertFiltersToSequelize(filters) {
    const sequelizeFilters = {};
    for (const key in filters) {
        const filter = filters[key];
        if (key === 'price' && Array.isArray(filter) && filter[0] !== undefined) {
            sequelizeFilters[key] = { [Op.between]: filter[0] };
        }
        // if (filter.between) {
        //     sequelizeFilters[key] = { [Op.between]: filter.between };
        // }
        // if (filter.gt) {
        //     sequelizeFilters[key] = { [Op.gt]: filter.gt };
        // } 
        // if (filter.gte) {
        //     sequelizeFilters[key] = { [Op.gte]: filter.gte };
        // }
        // if (filter.lt) {
        //     sequelizeFilters[key] = { [Op.lt]: filter.lt };
        // }
        // if (filter.lte) {
        //     sequelizeFilters[key] = { [Op.lte]: filter.lte };
        // }
        // if (filter.ne) {
        //     sequelizeFilters[key] = { [Op.ne]: filter.ne };
        // }   
        // if (filter.eq) { 
        //     sequelizeFilters[key] = { [Op.eq]: filter.eq };
        // }
        // if (filter.in) {
        //     sequelizeFilters[key] = { [Op.in]: filter.in };
        // }
        // if (filter.notIn) {
        //     sequelizeFilters[key] = { [Op.notIn]: filter.notIn };
        // }
    }
    return sequelizeFilters;
}

async function countProducts(model, items, sequelizeFilters) {
    return await Product.count({
        where: sequelizeFilters,
        include: [{ model, where: { id: items.map(item => item.id) } }]
    });
}

async function fetchMinMaxPrice(Model, items) {
    try {
        const result = await Product.findAll({
            include: [{
                model: Model,
                where: { id: items.map(item => item.id) },
                through: { attributes: [] },
                attributes: [],  // Важливо не включати атрибути з включеного моделі для уникнення помилок
            }],
            attributes: [
                [sequelize.fn('min', sequelize.col('price')), 'minPrice'],
                [sequelize.fn('max', sequelize.col('price')), 'maxPrice'],
                `${Model.tableName}.id`
            ],
            group: [`${Model.tableName}.id`],  // Групування за id моделі
            raw: true,
        });

        if (result && result.length > 0) {
            return result[0];
        } else {
            console.error('Error fetching min and max price: result is undefined or empty');
            return { minPrice: 0, maxPrice: 0 };
        }
    } catch (error) {
        console.error("Error fetching min and max price: ", error);
        throw error; // Викидайте помилку для коректної обробки
    }
}

async function fetchBrandsWithProductCount(sequelizeFilters, selectedProducts) {
    try {
        const brands = await Brand.findAll({
            include: [{ model: Product, where: sequelizeFilters }]
        });

        const brandsWithProductCount = {};

        for (let brand of brands) {
            const productCount = await ProductBrand.count({
                where: { 
                    brandId: brand.id,
                    productId: { [Op.in]: selectedProducts.map(product => product.id) }
                }
            });
            if (productCount > 0) {
                brandsWithProductCount[brand.name] = productCount;
            }
        }

        return brandsWithProductCount;
    } catch (error) {
        console.error("Помилка отримання кількості товарів для брендів: ", error);
        return {};
    }

}

const generateUniqueCode = async () => {
    let code;
    let isUnique = false;
    while (!isUnique) {
        code = Math.random().toString(36).substring(2, 10).toUpperCase();
        const existingProduct = await Product.findOne({ where: { code } });
        if (!existingProduct) {
            isUnique = true;
        }
    }
    return code;
};

module.exports = new ProductController()
