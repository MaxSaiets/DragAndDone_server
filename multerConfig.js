// for file upload
const multer = require('multer');

// Configure multer
const categoryStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './static/categories')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname)
    }
})

const userStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './static/users')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + ext)
    }
})

const productStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './static/products')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname)
        // cb(null, Date.now() + ext)
    }
})
const uploadSubCategoryStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './static/subCategories')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname)
    }
})

const uploadCategory = multer({ storage: categoryStorage })
const uploadUser = multer({ storage: userStorage })
const uploadProduct = multer({ storage: productStorage })
const uploadSubCategory = multer({ storage: uploadSubCategoryStorage })

module.exports = { uploadCategory, uploadUser, uploadProduct, uploadSubCategory};