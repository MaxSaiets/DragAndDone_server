// middlewares/authMiddleware.js
const { User } = require('../models');
const admin = require('firebase-admin');

module.exports = async function(req, res, next) {
    if (req.method === 'OPTIONS') {
        return next();
    }
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Not authorized' });
        }
        const token = authHeader.split(' ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);

        // Знаходимо користувача в БД по Firebase UID
        let user = await User.findOne({ where: { uid: decodedToken.uid } });
        if (!user) {
            // Якщо немає — створюємо
            user = await User.create({
                uid: decodedToken.uid,
                email: decodedToken.email,
                name: decodedToken.name || decodedToken.email.split('@')[0],
                avatar: decodedToken.picture || null
            });
        }

        // Передаємо у req.user тільки необхідні дані
        req.user = {
            id: user.id,
            uid: user.uid,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            role: user.role
        };

        next();
    } catch (e) {
        console.error('Auth error:', e);
        res.status(401).json({ message: 'Not authorized' });
    }
};
