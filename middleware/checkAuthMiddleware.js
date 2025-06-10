const { User } = require("../models");
const admin = require('firebase-admin');

async function checkAuthMiddleware(req, res, next) {
    if(req.method === 'OPTIONS'){
        next()
    }
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return next();
    }

    const token = authHeader.split(' ')[1];

    try{
        const decodedToken = await admin.auth().verifyIdToken(token);
        const uid = decodedToken.uid;
        
        const user = await User.findOne({ where: { uid } });
        
        req.user = user;
        
        next();
    }catch (error) {
        next();
    }
    
}

module.exports = checkAuthMiddleware;