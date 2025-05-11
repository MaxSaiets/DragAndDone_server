const { User } = require("../../models/models");
const ApiError = require("../../error/ApiError");
const admin = require('firebase-admin');

async function verifyAdminToken(req) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        throw ApiError.badRequest('Token not provided');
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;

    const user = await User.findOne({ where: { uid } });

    if(!user || user.role !== "ADMIN") {
        throw ApiError.forbidden('Forbidden: Only admins can make this request');
    }

    return user;
}

module.exports = verifyAdminToken;