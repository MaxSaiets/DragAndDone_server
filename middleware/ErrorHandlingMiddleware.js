const ApiError = require('../error/ApiError')

module.exports = function(err, req, res, next){ // коли викликаєтсья next то переходить до наступного middleware
    if(err instanceof ApiError){ 
        // якщо клас ошибки ApiError
        //чи є помилка err екземпляром класу ApiError. Тобто, вона перевіряє, 
        //чи насправді об'єкт err створений з використанням конструктора класу ApiError.
        //Якщо перевірка видає true - err є екземпляром класу ApiError то виконується
        return res.status(err.status).json({message: err.message})
    }
    // якщо ошибка не належить обеєку ApiError тобто ворс мажор
    return res.status(500).json({message: "Непередбачувана помилка!"})
}