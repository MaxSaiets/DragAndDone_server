const { User } = require("../models/models");
const ApiError = require("../error/ApiError");
const admin = require('firebase-admin');

async function checkVerifyAdminMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return next(ApiError.badRequest('Token not provided'));
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        const uid = decodedToken.uid;

        const user = await User.findOne({ where: { uid } });

        if(!user || user.role !== "ADMIN") {
            return next(ApiError.forbidden('Forbidden: Only admins can make this request'));
        }

        req.user = user;
        next();
    } catch (error) {
        next(ApiError.internal('Internal server error'));
    }
}

module.exports = checkVerifyAdminMiddleware;