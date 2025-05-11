const { Category, SubCategory, Image, Type } = require('../../models/models');

let cachedCatalog = null;

async function generateCatalog() {
    const categories = await Category.findAll({
        attributes: ['id',['name', 'categoryName']],
        include: [{
            model: Image,
            as: 'images',
            through: { attributes: [] },
            attributes: ['imgSrc'],
        }]
    });

    const subCategoriesWithTypes = await SubCategory.findAll({
        attributes: ['id', 'categoryId',['name', 'subCategoryName']],
        include: [
            {
                model: Type,
                attributes: ['id',['name', 'typeName']],
                through: {
                    attributes: []
                }
            }, {
                model: Image,
                as: 'images',
                through: { attributes: [] },
                attributes: ['imgSrc'],
            }
        ]
    });

    const formattedCategories = categories.map(category => {
        return {
            id: category.id,
            categoryName: category.dataValues.categoryName,
            categoryImage: category.dataValues.images[0]?.imgSrc || null,
            subCategories: subCategoriesWithTypes
                .filter(subCategory => subCategory.categoryId === category.id)
                .map(subCategory => ({
                    subCategoryName: subCategory.dataValues.subCategoryName,
                    subCategoryImage: subCategory.images[0]?.imgSrc || null,
                    types: subCategory.types.map(type => ({
                        typeName: type.dataValues.typeName
                    }))
                }))
        };
    });

    return formattedCategories;
}

async function updateCatalog() {
    cachedCatalog = await generateCatalog();
}

function getCachedCatalog() {
    return cachedCatalog;
}

module.exports = { generateCatalog, updateCatalog, getCachedCatalog };