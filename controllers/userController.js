//jsonwebtoken - для створення самого jwt токена
//bcrypt - для хеширования паролів і тп. щоб не зберігати у відкритому доступі
const ApiError = require('../error/ApiError')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { User, Basket} = require('../models/models')

const admin = require('firebase-admin');

const generateJwt = (id, email, role) => {
    return jwt.sign(
        {id, email, role}, 
        process.env.SECRET_KEY,
        { expiresIn: '24h', algorithm: 'HS256' } // опції, час життя
    )
}

class UserController {
    // Function to get or create a new user in the database
    async getOrsaveNewUserInDatabase(req, res, next) {
        const { email, token, userData } = req.body;

        if (!email || !token) {
            return next(ApiError.badRequest('Invalid email or token'));
        }

        try {
            const decodedToken = await admin.auth().verifyIdToken(token);
            const uid = decodedToken.uid;

            let user = await User.findOne({ where: { uid } });

            if (!user) {
                // user = await User.create({ email, role: "ADMIN", uid, name: userData.name, photoURL: userData.photoURL });
                user = await User.create({ email, role: "ADMIN", uid });
            }

            return res.json({ user });
        } catch (error) {
            console.log("ERROR with getOrsaveNewUserInDatabase", error);
            return next(ApiError.internal('Error while verifying the token'));
        }
    }

   // Function to get a user from the database
    async getUserFromDatabase(req, res, next) {
        const bearerHeader = req.headers.authorization;
        if (!bearerHeader) {
            return next(ApiError.badRequest('Token not provided'));
        }

        const bearer = bearerHeader.split(' ');
        const token = bearer[1];

        try {
            const decodedToken = await admin.auth().verifyIdToken(token);

            const uid = decodedToken.uid;

            const user = await User.findOne({ where: { uid } });

            if (!user) { 
                return next(ApiError.internal('User not found'));
            }
            return res.json({ user });
        } catch (error) {
            console.log("ERROR with getUserFromDatabase", error);
            return next(ApiError.internal('Error while verifying the token'));
        }
    }

    async checkAuth(req, res, next){
        const token = generateJwt(req.user.id, req.user.email, req.user.role)
        return res.json({token})
    }
}

module.exports = new UserController()


//const query = req.query
/* const {id} = req.query //Деструктуризация(щоб витянути одразу id) можна також query.id
if(!id){
    return next(ApiError.badRequest('Не вказаний id'))
}
res.json (id) */