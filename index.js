require('dotenv').config()
const express = require('express') //фреймворк для створення веб-додатків і веб-серверів
const sequelize = require('./db')
const cors = require('cors') // щоб можна було отправляти запроси из браузера
const fileUpload = require('express-fileupload') // щоб можна було файли в post get
const router = require('./routes/index') // основний роутер
const errorHandler = require('./middleware/ErrorHandlingMiddleware')
const path = require('path')

const { generateCatalog } = require('./utils/catalogService/catalogService');

const { createProductsFromJSON } = require('./controllers/commonFunctions/createProductsFromJSON');

//port
const port = process.env.PORT || 9000

const app = express()

app.use(cors());

app.use(express.static(path.resolve(__dirname, 'static'))) // явно указати серверу що файли з папки static треба роздавати як static
// app.use(fileUpload({})) // для роботи з файлами

app.use('/api', express.json(), router) // /api - url по якому повинен оброблятися router // app.use(express.json()) // щоб наше приложение могло парсить json формат

app.use(errorHandler) // повинен підключаться в останю чергу // останній middleware, тому не траба передавати next

//отрправка запроса якщо перейти в браузере localhost:9000 
// app.get('/', (req, res) => {
//     res.status(200).json({message: 'WORKING!'})
// })

const start = async () => {
    try { 
        await sequelize.authenticate() //підключення до БД
        await sequelize.sync() //провіряє стан БД із схемою даних

        //await sequelize.sync({ force: true }) // force true - видаляє всі дані з БД і створює нові таблиці
        //await createProductsFromJSON(); // Generation of products from JSON file

        // Generation of a cached catalog 
        await generateCatalog();

        app.listen(port, () => console.log(`Server started on port: ${port}`))
    } catch (e){
        console.log(e)
    }
}

start()
