const ApiError = require('../error/ApiError');

// Обробка помилок валідації
exports.handleValidationError = (err, req, res, next) => {
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(error => ({
      field: error.path,
      message: error.message
    }));
    return res.status(400).json({
      error: 'Validation Error',
      details: errors
    });
  }
  next(err);
};

// Обробка помилок унікальності
exports.handleUniqueConstraintError = (err, req, res, next) => {
  if (err.name === 'SequelizeUniqueConstraintError') {
    const errors = err.errors.map(error => ({
      field: error.path,
      message: error.message
    }));
    return res.status(409).json({
      error: 'Unique Constraint Error',
      details: errors
    });
  }
  next(err);
};

// Обробка помилок зовнішніх ключів
exports.handleForeignKeyError = (err, req, res, next) => {
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      error: 'Foreign Key Error',
      message: 'Referenced record does not exist'
    });
  }
  next(err);
};

// Обробка помилок авторизації
exports.handleAuthError = (err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
  }
  next(err);
};

// Обробка помилок доступу
exports.handleForbiddenError = (err, req, res, next) => {
  if (err instanceof ApiError && err.status === 403) {
    return res.status(403).json({
      error: 'Forbidden',
      message: err.message
    });
  }
  next(err);
};

// Обробка помилок "не знайдено"
exports.handleNotFoundError = (err, req, res, next) => {
  if (err instanceof ApiError && err.status === 404) {
    return res.status(404).json({
      error: 'Not Found',
      message: err.message
    });
  }
  next(err);
};

// Обробка помилок валідації запиту
exports.handleBadRequestError = (err, req, res, next) => {
  if (err instanceof ApiError && err.status === 400) {
    return res.status(400).json({
      error: 'Bad Request',
      message: err.message
    });
  }
  next(err);
};

// Обробка всіх інших помилок
exports.handleGenericError = (err, req, res, next) => {
  console.error('Unhandled error:', err);

  // Якщо це помилка API, використовуємо її статус і повідомлення
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: err.message
    });
  }

  // Інакше відправляємо загальну помилку сервера
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
};

// Обробка необроблених помилок
exports.handleUnhandledError = (err) => {
  console.error('Unhandled error:', err);
  // Тут можна додати логіку для збереження помилок в базу даних або відправки сповіщень
};

// Обробка необроблених відхилень промісів
exports.handleUnhandledRejection = (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Тут можна додати логіку для збереження помилок в базу даних або відправки сповіщень
}; 