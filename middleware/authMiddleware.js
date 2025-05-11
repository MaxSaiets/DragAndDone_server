// Декодировка токена і перевірка на валідность, якщо токен не валідний то повертаєтсья
// помилка про те що користувач не авторизований
const jwt = require('jsonwebtoken')

module.exports = function(req, res, next){
    if(req.method === 'OPTIONS'){
        next()
    }
    try{
        const token = req.headers.authorization.split(' ')[1] // Bearer token - тип токена потім сам токен (так пишуть) тобто треба розпилить і по 1 індексу отримати сам токен
        if(!token){
            return res.status(401).json({message: 'Не авторизований!(authMiddleware.js)'})
        }
        const decode = jwt.verify(token, process.env.SECRET_KEY)
        req.user = decode
        next()
    } catch(err){
        res.status(401).json({message: 'Користувач не авторизований'})
    }
}