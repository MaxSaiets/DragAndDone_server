const Router = require('express')
const router = new Router() // головний роутер 
const userRouter = require('./userRouter')
const usersInfoRouter = require('./usersInfoRouter')
const taskRouter = require('./taskRoutes')
const teamRouter = require('./teamRoutes')
const activityLogRouter = require('./activityLogRoutes')
const eventRouter = require('./eventRoutes')
const chatRouter = require('./chatRoutes')
//под роутери
router.use('/user', userRouter)
router.use('/usersInfo', usersInfoRouter)
router.use('/tasks', taskRouter)
router.use('/teams', teamRouter)
router.use('/activity', activityLogRouter)
router.use('/events', eventRouter)
router.use('/chats', chatRouter)

module.exports = router

