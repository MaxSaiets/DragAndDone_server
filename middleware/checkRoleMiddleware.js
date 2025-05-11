// запускаєм функцію передаєм туди роль і дивлячись які ролі 
// передаються різні middleware
const jwt = require('jsonwebtoken')

module.exports = function(role){
    return function(req, res, next){
        if(req.method === 'OPTIONS'){
            next()
        }
        try{
            const token = req.headers.authorization.split(' ')[1] // Bearer token - тип токена потім сам токен (так пишуть) тобто треба розлепить і по 1 індексу отримати сам токен
            if(!token){
                return res.status(401).json({message: 'Не авторизований!(authMiddleware.js)'})
            }
            const decode = jwt.verify(token, process.env.SECRET_KEY)
            if(decode.role !== role){
                return res.status(403).json({message: 'У вас немає доступу-прав'})
            }
            req.user = decode
            next()
        } catch(err){
            res.status(401).json({message: 'Користувач не авторизований'})
        }     
    } 
}