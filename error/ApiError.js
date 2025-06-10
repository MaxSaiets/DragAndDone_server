class ApiError extends Error {
    constructor(status, message) {
        super();
        this.status = status;
        this.message = message;
    }

    static badRequest(message) {
        return new ApiError(400, message); // 400 - Bad Request
    }

    static notFound(message) {
        return new ApiError(404, message); // 404 - Not Found
    }

    static internal(message) {
        return new ApiError(500, message); // 500 - Internal Server Error
    }

    static forbidden(message) {
        return new ApiError(403, message); // 403 - Forbidden
    }
}

module.exports = ApiError;