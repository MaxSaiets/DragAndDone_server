const {Sequelize} = require('sequelize') // це Node.js ORM взаємодіяти з реляційними базами даних, такими як MySQL, PostgreSQL, SQLite

module.exports = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        dialect: 'postgres',
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        // logging: false // відключає логування запитів
    }
)
