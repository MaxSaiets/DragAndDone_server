// Multer
const { uploadCategory, uploadUser } = require('../multerConfig');
const { User, Category, Image, CategoryImage } = require('../models/models')
const ApiError = require('../error/ApiError')

const verifyAdminToken = require('../utils/users/verifyAdminToken')

class UploadController {
    async uploadNewCategory(req, res, next) {
        try {
            verifyAdminToken(req);
        } catch (error) {
            return res.status(403).json({ error: 'Invalid admin token' });
        }
        
            uploadCategory.single('file')(req, res, async function(err) {
            const existingImageId = req.body.iconId;

            if (err) {
                console.error(err);
                return res.status(500).send('Something broke!');
            }
            
            try {
                const nameOfCategory = req.body.nameOfCategory;

                const category = await Category.create({
                    name: nameOfCategory,
                });

                let imageId;

                if (existingImageId && existingImageId !== "undefined") { // "undefined" because existingImageId is a string
                    imageId = existingImageId;
                } else if (req.file) {
                    const file = req.file;

                    if (!file) {
                        return res.status(400).json({ error: 'No file uploaded' });
                    }
                    
                    let image = await Image.findOne({ where: { imgName: file.filename } });

                    try {
                        image = await Image.create({
                            imgName: file.filename,
                            imgSrc: file.path,
                            imageableType: 'category',
                        });
                    } catch (error) {
                        console.error('Error creating image:', error);
                        return res.status(500).send('Error creating image');
                    }

                    imageId = image.id;
                } else {
                    return res.status(400).json({ error: 'No file uploaded or existing image provided' });
                }

                await CategoryImage.create({ categoryId: category.id, imageId: imageId });

                return res.json({ message: 'Category uploaded successfully', category });
            } catch (err) {
                console.error(err);
                return res.status(500).send('Error creating category');
            }
            });
    };
    
    async uploadUser(req, res, next) {
        uploadUser.single('file')(req, res, async function(err) {
            if (err) {
                console.error(err);
                return res.status(500).send('Something broke!');
            }
            const userId = req.params.id;
            const file = req.file;
        
            if (!file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }
        
            try {
                const user = await User.findByPk(userId);
        
                if (!user) {
                return res.status(404).json({ error: 'User not found' });
                }
        
                let image = await Image.findOne({ where: { imgName: file.filename } });
        
                if (!image) {
                image = await Image.create({
                    imgName: file.filename,
                    imgSrc: file.path,
                    imageableType: 'user',
                });
                }
        
                await user.update({ imageId: image.id });
        
                return res.json({ message: 'User avatar uploaded successfully', user });
            } catch (err) {
                console.error(err);
                return res.status(500).send('Error uploading user avatar');
            }
        });
    };

}

module.exports = new UploadController()