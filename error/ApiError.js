class ApiError extends Error{ // розширяєм клас Error
    constructor(status, message){
        super(); // викликаєм родительський конструктор
        this.status = status
        this.message = message
    }

    // статична функція - це функція яку можна викликати без створення обєкта
    static badRequest(message){
        return new ApiError(404, message)
    }

    static internal(message){ // internal - внутрішня (500 - ошибка з сервером)
        return new ApiError(500, message)
    }

    static forbidden(message){ // відсутній доступ
        return new ApiError(403, message)
    }
}

module.exports = ApiError