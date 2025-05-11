const fs = require('fs').promises;
const path = require('path');
const {
    Category,
    SubCategory,
    Type,
    Brand,
    Image,
    CategoryImage,
    SubCategoryImage,
    ProductImage,
    Product,
} = require('../../models/models');

const { uploadImage } = require('./firebaseDownload');

async function createProductsFromJSON() {
    const jsonFilePath = path.join(__dirname, '../../utils/productsExampleJSON/productsExample.json');

    try {
        // Читання JSON файлу
        const fileData = await fs.readFile(jsonFilePath, 'utf8');
        const jsonData = JSON.parse(fileData);

        // CREATE BRANDS
        const allBrands = [...new Set(jsonData.categories.flatMap(cat => cat.subcategories.flatMap(sub => sub.brands)))];
        await Promise.all(allBrands.map(async (brand) => {
            await Brand.create({ name: brand });
        }));

        await Promise.all(jsonData.categories.map(async (categ) => {
            const category = await Category.create({
                name: categ.name,
            });

            await createCategoryImage(category);

            // CREATE SUBCATEGORIES
            await Promise.all(categ.subcategories.map(async (subcateg) => {
                const subCategory = await SubCategory.create({
                    name: subcateg.name,
                    categoryId: category.id
                });

                await createSubCategoryImage(subCategory);

                // CREATE TYPES
                await Promise.all(subcateg.types.map(async (typ) => {
                    const [type] = await Type.findOrCreate({
                        where: { name: typ },
                        defaults: { name: typ }
                    });
                    await type.addSubCategories([subCategory]);
                }));

                // CREATE PRODUCTS
                await Promise.all(subcateg.products.map(async (prod) => {
                    const product = await Product.create({
                        title: prod.name,
                        price: prod.price,
                        code: await generateUniqueCode(),
                    });

                    await createProductImages(product);

                    await product.addCategories(category.id);

                    const subCategory = await SubCategory.findOne({ where: { name: subcateg.name } });
                    await product.addSubCategories(subCategory.id);

                    const type = await Type.findOne({ where: { name: subcateg.types[Math.floor(Math.random() * subcateg.types.length)] } });
                    await product.addTypes(type.id);

                    const brand = await Brand.findOne({ where: { name: subcateg.brands[Math.floor(Math.random() * subcateg.brands.length)] } });
                    await product.addBrands(brand.id);
                }));
            }));
        }));

    } catch (error) {
        console.error('Помилка:', error);
    }
}

async function createCategoryImage(category) {
    const { imageUrl, imageName } = await getRandomImage();
    const result = await uploadImageWithRetry(imageUrl, 'categoryImg');

    const imageCategory = await Image.create({
        imgName: result[0].name,
        imgSrc: result[0].url,
        imageableType: 'category',
    });

    await CategoryImage.create({ categoryId: category.id, imageId: imageCategory.id });
}

async function createSubCategoryImage(subCategory) {
    const { imageUrl, imageName } = await getRandomImage();
    const result = await uploadImageWithRetry(imageUrl, 'subCategoriesImg');

    const imageSubCategory = await Image.create({
        imgName: result[0].name,
        imgSrc: result[0].url,
        imageableType: 'subCategory',
    });

    await SubCategoryImage.create({ subCategoryId: subCategory.id, imageId: imageSubCategory.id });
}

async function createProductImages(product) {
    const { imageUrl, imageName } = await getRandomImage();
    const results = await uploadImageWithRetry(imageUrl, 'productPreviewImg');

    const previewImageName = results[0].name;
    const previewImageUrl = results[0].url;

    let fullPreviewImageName, fullPreviewImageUrl, fullBigPreviewImageName, fullBigPreviewImageUrl;

    if (results.length > 1) {
        fullPreviewImageName = results[1].name;
        fullPreviewImageUrl = results[1].url;
        fullBigPreviewImageName = results[2].name;
        fullBigPreviewImageUrl = results[2].url;
    }

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

    const randomNumberOfImages = Math.floor(Math.random() * 5) + 1;

    for (let i = 0; i < randomNumberOfImages; i++) {
        const { imageUrl, imageName } = await getRandomImage();
        const result = await uploadImageWithRetry(imageUrl, 'productImg');

        const nameBigPreview = result[0].name;
        const urlBigPreview = result[0].url;
        const nameBigImg = result[1].name;
        const urlBigImg = result[1].url;

        const imageBigPreview = await Image.create({
            imgName: nameBigPreview,
            imgSrc: urlBigPreview,
            imageableType: 'productImgBigPreview',
        });
        await ProductImage.create({ productId: product.id, imageId: imageBigPreview.id });

        const imageBigImg = await Image.create({
            imgName: nameBigImg,
            imgSrc: urlBigImg,
            imageableType: 'productBigImg',
        });

        await ProductImage.create({ productId: product.id, imageId: imageBigImg.id });
    }
}

async function getRandomImage() {
    const imageDirectory = "C:/Users/Макс/OneDrive/Рабочий стол/PictureForWork";

    try {
        const files = await fs.readdir(imageDirectory);
        const imageFiles = files.filter(file => /\.(jpg|jpeg|png)$/i.test(file));

        if (imageFiles.length === 0) {
            throw new Error('No images found in the directory');
        }

        const randomIndex = Math.floor(Math.random() * imageFiles.length);
        const randomImage = imageFiles[randomIndex];

        return {
            imageUrl: path.join(imageDirectory, randomImage),
            imageName: randomImage
        };
    } catch (error) {
        console.error('Error getting random image:', error);
        return null;
    }
}

async function uploadImageWithRetry(imageUrl, folder) {
    const maxRetries = 10;
    const retryDelay = 2000; // 2 seconds
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            return await uploadImage(imageUrl, folder);
        } catch (error) {
            if (attempt >= maxRetries - 1) {
                throw error;
            }
            console.error(`Upload failed, retrying in ${retryDelay / 1000} seconds...`, error);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            attempt++;
        }
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

module.exports = {
    createProductsFromJSON,
};