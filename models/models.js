// // свезующа модель для (brand type) бо там звязок багато до багато
// const TypeBrand = sequelize.define('type_brand', {
//     id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
// })

const sequelize = require("../db")
const {DataTypes} = require("sequelize")

// USER
const User = sequelize.define("user", {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    uid: {type: DataTypes.STRING, allowNull: false},
    email: {type: DataTypes.STRING, unique: true, allowNull: false},
    emailVerified: { type: DataTypes.BOOLEAN },
    role: {type: DataTypes.STRING, defaultValue: "USER", allowNull: false},
    name: {type: DataTypes.STRING},
    photoURL: { type: DataTypes.STRING },
    phoneNumber: {type: DataTypes.INTEGER},
})

// DISCOUNTS 
const Discount = sequelize.define("discount", {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    percent: {type: DataTypes.INTEGER, allowNull: false},
    timeStart: {type: DataTypes.DATE, allowNull: false},
    timeLife: {type: DataTypes.INTEGER, allowNull: false},
})
const DiscountCard = sequelize.define("discount_card", {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    code: {type: DataTypes.INTEGER, allowNull: false},
    percent: {type: DataTypes.INTEGER, allowNull: false},
    timeLife: {type: DataTypes.INTEGER, allowNull: false},
})
const DiscountCardForProduct = sequelize.define("discountCard_for_product", {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    code: {type: DataTypes.INTEGER, allowNull: false},
    percent: {type: DataTypes.INTEGER, allowNull: false},
    timeLife: {type: DataTypes.INTEGER, allowNull: false},
})

// BASKETS
const Basket = sequelize.define("basket", {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
})
const BasketItem = sequelize.define("basket_item", {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 }
})
// FAVORITES
const FavoriteList = sequelize.define("favorite_list", {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
})
const FavoriteItem = sequelize.define("favorite_item", {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
})
// RECENTLY VIEWED
const RecentlyViewedList = sequelize.define("recently_viewed_list", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
});
const RecentlyViewedItem = sequelize.define("recently_viewed_item", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
});

// ORDERS
const Order = sequelize.define("order", {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    payMethod: {type: DataTypes.STRING, allowNull: false},
    placeOfDelivery: {type: DataTypes.STRING, allowNull: false},
    status: {type: DataTypes.STRING, allowNull: false},
})

// REVIEWS
const Review = sequelize.define("review", {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    description: {type: DataTypes.STRING, allowNull: false},
})

// RATING
const Rating = sequelize.define("rating", {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    rate: {type: DataTypes.INTEGER, allowNull: false},
})

// PRODUCTS
const Product = sequelize.define("product", {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    code: {type: DataTypes.STRING, unique: true, allowNull: false},
    title: {type: DataTypes.STRING, allowNull: false},
    price: {type: DataTypes.INTEGER, allowNull: false},
})
// product info
const ProductInfo = sequelize.define('product_info', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    title: {type: DataTypes.STRING, allowNull: false},
    description: {type: DataTypes.STRING, allowNull: false},
})


// CATEGORIES
const Category = sequelize.define('category', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    name: {type: DataTypes.STRING, unique: true, allowNull: false},
    // imageId: {type: DataTypes.INTEGER, allowNull: true},
})
const SubCategory = sequelize.define('subCategory', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    name: {type: DataTypes.STRING, unique: true, allowNull: false},
})
// type
const Type = sequelize.define('type', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    name: {type: DataTypes.STRING, unique: true, allowNull: false},
})
const TypeSubCategory = sequelize.define('type_subCategory', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    typeId: {type: DataTypes.INTEGER, allowNull: false},
    subCategoryId: {type: DataTypes.INTEGER, allowNull: false},
});

// brand
const Brand = sequelize.define('brand', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    name: {type: DataTypes.STRING, unique: true, allowNull: false},
})

// IMAGES
const Image = sequelize.define('image', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    imgName: {type: DataTypes.STRING(1000), allowNull: false},
    imgSrc: {type: DataTypes.STRING(1000), allowNull: false},
    imageableType: {type: DataTypes.STRING}, //type img
    // imageableId: {type: DataTypes.INTEGER}, //id img
})


// additional tables
// const TypeBrand = sequelize.define('type_brand', {
//     id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
//     typeId: {type: DataTypes.INTEGER, allowNull: false},
//     brandId: {type: DataTypes.INTEGER, allowNull: false}
// });

const ProductSubCategory = sequelize.define('product_subCategory', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    productId: {type: DataTypes.INTEGER},
    subCategoryId: {type: DataTypes.INTEGER},
})
const ProductCategory = sequelize.define('product_category', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    productId: {type: DataTypes.INTEGER},
    categoryId: {type: DataTypes.INTEGER},
})
const CategoryImage = sequelize.define('category_image', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    categoryId: {type: DataTypes.INTEGER},
    imageId: {type: DataTypes.INTEGER},
})
const SubCategoryImage = sequelize.define('subCategory_image', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    subCategoryId: {type: DataTypes.INTEGER},
    imageId: {type: DataTypes.INTEGER},
})

const ProductImage = sequelize.define('product_image', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    productId: {type: DataTypes.INTEGER},
    imageId: {type: DataTypes.INTEGER},
})
const ProductBrand = sequelize.define('product_brand', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    productId: {type: DataTypes.INTEGER},
    brandId: {type: DataTypes.INTEGER},
})
const ProductType = sequelize.define('product_type', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    productId: {type: DataTypes.INTEGER},
    typeId: {type: DataTypes.INTEGER},
})


// RELATIONS

// Basket
User.hasOne(Basket, { foreignKey: 'userId' });
Basket.belongsTo(User, { foreignKey: 'userId' });

Basket.hasMany(BasketItem, { foreignKey: 'basketId' });
BasketItem.belongsTo(Basket, { foreignKey: 'basketId' });

Product.hasMany(BasketItem, { foreignKey: 'productId' });
BasketItem.belongsTo(Product, { foreignKey: 'productId' });

// FAVORITELIST
User.hasOne(FavoriteList, { foreignKey: 'userId' });
FavoriteList.belongsTo(User, { foreignKey: 'userId' });

FavoriteList.hasMany(FavoriteItem, { foreignKey: 'favoriteListId' });
FavoriteItem.belongsTo(FavoriteList, { foreignKey: 'favoriteListId' });

Product.hasMany(FavoriteItem, { foreignKey: 'productId' });
FavoriteItem.belongsTo(Product, { foreignKey: 'productId' });

// RECENTLY VIEWED
User.hasOne(RecentlyViewedList, { foreignKey: 'userId' });
RecentlyViewedList.belongsTo(User, { foreignKey: 'userId' });

RecentlyViewedList.hasMany(RecentlyViewedItem, { foreignKey: 'recentlyViewedListId' });
RecentlyViewedItem.belongsTo(RecentlyViewedList, { foreignKey: 'recentlyViewedListId' });

Product.hasMany(RecentlyViewedItem, { foreignKey: 'productId' });
RecentlyViewedItem.belongsTo(Product, { foreignKey: 'productId' });


// ORDERS
User.hasMany(Order, {foreignKey: 'userId'});
Order.belongsTo(User, {foreignKey: 'userId'});

Product.hasMany(Order, {foreignKey: 'productId'});
Order.belongsTo(Product, {foreignKey: 'productId'});

// RATING
User.hasMany(Rating, {foreignKey: 'userId'});
Rating.belongsTo(User, {foreignKey: 'userId'});

Product.hasMany(Rating, {foreignKey: 'productId'});
Rating.belongsTo(Product, {foreignKey: 'productId'});


// REWIEWS
User.hasMany(Review, {foreignKey: 'userId'});
Review.belongsTo(User, {foreignKey: 'userId'});

Product.hasMany(Review, {foreignKey: 'productId'});
Review.belongsTo(Product, {foreignKey: 'productId'});

// DISCOUNTS
User.hasMany(DiscountCard, {foreignKey: 'userId'});
DiscountCard.belongsTo(User, {foreignKey: 'userId'});

User.hasMany(DiscountCardForProduct, {foreignKey: 'userId'});
DiscountCardForProduct.belongsTo(User, {foreignKey: 'userId'});

Product.hasMany(DiscountCardForProduct, {foreignKey: 'productId'});
DiscountCardForProduct.belongsTo(Product, {foreignKey: 'productId'});

// PRUDUCTS 
Product.hasMany(Discount, {foreignKey: 'productId'});
Discount.belongsTo(Product, {foreignKey: 'productId'});

Product.belongsToMany(Image, { through: ProductImage });
Image.belongsToMany(Product, { through: ProductImage });

Product.belongsToMany(Brand, { through: ProductBrand }); //through - назва проміжної таблиці, створюєтсья автоматично
Brand.belongsToMany(Product, { through: ProductBrand });

Product.belongsToMany(Type, { through: ProductType });
Type.belongsToMany(Product, { through: ProductType });

Type.belongsToMany(SubCategory, { through: TypeSubCategory });
SubCategory.belongsToMany(Type, { through: TypeSubCategory });

// categories
Product.belongsToMany(SubCategory, {through: ProductSubCategory});
SubCategory.belongsToMany(Product, {through: ProductSubCategory});

Product.belongsToMany(Category, {through: ProductCategory});
Category.belongsToMany(Product, {through: ProductCategory});

Category.hasMany(SubCategory, {foreignKey: 'categoryId'});
SubCategory.belongsTo(Category, {foreignKey: 'categoryId'});


// img
Category.belongsToMany(Image, { through: CategoryImage });
Image.belongsToMany(Category, { through: CategoryImage });

SubCategory.belongsToMany(Image, { through: SubCategoryImage });
Image.belongsToMany(SubCategory, { through: SubCategoryImage });

// product info
Product.hasMany(ProductInfo, {foreignKey: 'productId'});
ProductInfo.belongsTo(Product, {foreignKey: 'productId'});


module.exports = {
    User,
    Discount,
    DiscountCard,
    DiscountCardForProduct,
    Basket,
    BasketItem,
    FavoriteList,
    FavoriteItem,
    RecentlyViewedList,
    RecentlyViewedItem,
    Order,
    Review,
    Rating,
    Product,
    ProductInfo,
    Category,
    SubCategory,
    Type,
    Brand,
    Image,
    CategoryImage,
    SubCategoryImage,
    ProductImage,
    ProductCategory,
    ProductSubCategory,
    ProductType,
    ProductBrand,
    TypeSubCategory,
}