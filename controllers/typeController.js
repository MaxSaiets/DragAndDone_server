const { Type, TypeSubCategory, Product, SubCategory, Category } = require('../models/models')
const ApiError = require('../error/ApiError')

const { updateCatalog } = require('../utils/catalogService/catalogService')

class TypeController {
    async getAll(req, res, next) {
        try {
            const types = await Type.findAll({
                include: [{
                    model: SubCategory,
                    attributes: ['id', 'name'],
                    through: { attributes: [] }
                }]
            });
            return res.json(types);
        } catch (e) {
            next(ApiError.badRequest(e.message));
        }
    }

    async create(req, res, next) {
        try {
            const { name, subCategories} = req.body
            const type = await Type.create({name})

            if (subCategories && subCategories.length > 0) {
                const subCategoryRecords = await SubCategory.findAll({
                    where: {
                        id: subCategories
                    }
                });
                
                await type.addSubCategories(subCategoryRecords);
            }
            
            await updateCatalog();

            return res.json({type})
        } catch (e) {
            next(ApiError.badRequest(e.message))
        }
    }

    async delete(req, res, next) {
        try {
            const {id} = req.params
            const type = await Type.destroy({where: {id}})
            await TypeSubCategory.destroy({where: {typeId: id}})

            await updateCatalog();

            return res.json({type})
        } catch (e) {
            next(ApiError.badRequest(e.message))
        }
    }

    async update(req, res, next) {
        try {
            const { id } = req.params;
            const { name, subCategories } = req.body;
            
            const type = await Type.findByPk(id);
            
            if (!type) {
                throw ApiError.badRequest(`Brand with id ${id} not found`);
            }
    
            if (name) {
                type.name = name;
                await type.save();
            }
    
            if (subCategories) {
                const subCategoryRecords = await SubCategory.findAll({
                    where: { id: subCategories }
                });
                await type.setSubCategories(subCategoryRecords); // Оновлення підкатегорій
            }

            await updateCatalog();
            
            return res.json({type})
        } catch (e) {
            return next(ApiError.badRequest(e.message))
        }
    }

    async getCategoryTypes(req, res, next) {
        try {
            const {categoryData} = req.body;
    
            const products = await Product.findAll({
                include: [{
                    model: Category,
                    where: { id: categoryData.id }
                }, {
                    model: SubCategory
                }, {
                    model: Type
                }]
            });
    
            const data = {};
    
            for (const product of products) {
                const { subCategories, types } = product.dataValues;
    
                for (const subCategory of subCategories) {
                    if (!data[subCategory.name]) {
                        data[subCategory.name] = new Set();
                    }
    
                    for (const type of types) {
                        data[subCategory.name].add(type.name);
                    }
                }
            }
    
            const uniqueData = Object.keys(data).map(key => ({ [key]: Array.from(data[key]) }));
    
            return res.json(uniqueData);
        } catch (e) {
            next(ApiError.badRequest(e.message));
        }
    }
}

module.exports = new TypeController()