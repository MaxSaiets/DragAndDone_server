const uuid = require('uuid') //для генерації рандомних id які не повторюются  
const path = require('path')

const {Device, DeviceInfo} = require('../models/models')
const ApiError = require('../error/ApiError')
const { type } = require('os')

class DeviceController {
    async create(req, res, next){
        try{
            let {name, price, brandId, typeId, info} = req.body // info массив характеристик
            const {img} = req.files
            let fileName = uuid.v4() + ".jpg" //uuid.v4() генерація рандомного id
    
            // модуль path - стандартна в node.js, resolve - адаптує вказаний путь к операційній системі
            //mv - переміщення файла, __dirnama - текущий путь к папке з корнтролєрами
            // '..'- вернуться на директорию назад, static - папка
            img.mv(path.resolve(__dirname, '..', 'static', fileName)) 
            const device = await Device.create({name, price, brandId, typeId, img: fileName})
            
            if(info){
                info = JSON.parse(info) // розпарсуємо, приходить як json рядок
                info.forEach(element => {
                    DeviceInfo.create({
                        title: element.title,
                        description: element.description,
                        deviceId: device.id
                    })
                });
            }
     
            return res.json(device)
        } catch (e){
            next(ApiError.badRequest(e.message))
        }
    }

    async getAll(req, res){
        let {brandId, typeId, limit, page} = req.query
        page = page || 1 // якщо не вказана сторінка
        limit = limit || 9
        let offset = page * limit - limit // отступ, якщо перешли на 2 сторінку то треба виводити мінус перші diveces

        let devices
        if(!brandId && !typeId){
            devices = await Device.findAndCountAll({limit, offset})
        }
        if(brandId && !typeId){
            devices = await Device.findAndCountAll({where:{brandId}, limit, offset})
        }
        if(!brandId && typeId){
            devices = await Device.findAndCountAll({where:{typeId}, limit, offset})
        }
        if(brandId && typeId){
            devices = await Device.findAndCountAll({where:{brandId, typeId}, limit, offset})
        }

        return res.json(devices)
    }

    async getOne(req, res){
        const {id} = req.params // параметр із deviceRouter ('/:id')
        const device = await Device.findOne(
            {
                where: {id},
                include: [{model: DeviceInfo, as: 'info'}] // модель яку хочем подгрузити і назву поля
                // ця інформація треба коли відкриваємо вікно товару, але краще одразу подгружати
            },
        )
        return res.json(device)
    }
}

module.exports = new DeviceController()