//jsonwebtoken - для створення самого jwt токена
//bcrypt - для хеширования паролів і тп. щоб не зберігати у відкритому доступі
const ApiError = require('../error/ApiError')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { User, Team, TeamMember, Task, TaskAssignee } = require('../models')
const { Op } = require('sequelize')
const { v4: uuidv4 } = require('uuid')

const admin = require('firebase-admin');

const generateJwt = (id, email, role) => {
    return jwt.sign(
        {id, email, role}, 
        process.env.SECRET_KEY,
        { expiresIn: '24h', algorithm: 'HS256' } // опції, час життя
    )
}

class UserController {
    // Function to get or create a new user in the database
    async getOrsaveNewUserInDatabase(req, res, next) {
        const { email, token, userData } = req.body;

        if (!email || !token) {
            return next(ApiError.badRequest('Invalid email or token'));
        }

        try {
            const decodedToken = await admin.auth().verifyIdToken(token);
            const uid = decodedToken.uid;

            let user = await User.findOne({ where: { uid } });

            if (!user) {
                user = await User.create({ 
                    uid,
                    email, 
                    name: userData?.displayName || email.split('@')[0],
                    avatar: userData?.photoURL || null,
                    role: "user",
                    status: "active"
                });
            }

            return res.json({ user });
        } catch (error) {
            console.error("ERROR with getOrsaveNewUserInDatabase:", error);
            if (error.code === 'auth/id-token-expired') {
                return next(ApiError.unauthorized('Token has expired'));
            }
            return next(ApiError.internal('Error while verifying the token'));
        }
    }

   // Function to get a user from the database
    async getUserFromDatabase(req, res, next) {
        try {
            if (!req.user || !req.user.uid) {
                return next(ApiError.unauthorized('User not authenticated'));
            }

            const uid = req.user.uid;
            const user = await User.findOne({ where: { uid } });

            if (!user) { 
                return next(ApiError.notFound('User not found'));
            }

            return res.json({ 
                user: {
                    ...user.toJSON(),
                    role: user.role || 'USER'
                }
            });
        } catch (error) {
            console.error("ERROR with getUserFromDatabase:", error);
            return next(ApiError.internal('Error getting user from database'));
        }
    }

    async checkAuth(req, res, next){
        const token = generateJwt(req.user.id, req.user.email, req.user.role)
        return res.json({token})
    }

    async checkUserByEmail(req, res) {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email required' });
        const user = await User.findOne({ where: { email: { [Op.iLike]: email.trim() } } });
        if (user) return res.json({ exists: true, user });
        return res.json({ exists: false });
    }

    async updateUserStatus(req, res, next) {
        try {
            const { status } = req.body;
            const userId = req.user.uid;

            const user = await User.findByPk(userId);
            if (!user) {
                return next(ApiError.notFound('User not found'));
            }

            await user.update({ status });
            res.json({ message: 'Status updated successfully', user });
        } catch (error) {
            console.error('Error updating user status:', error);
            return next(ApiError.internal('Error updating user status'));
        }
    }

    async updateUserProfile(req, res, next) {
        try {
            const { displayName, photoURL } = req.body;
            const userId = req.user.uid;

            const user = await User.findByPk(userId);
            if (!user) {
                return next(ApiError.notFound('User not found'));
            }

            await user.update({ 
                displayName: displayName || user.displayName,
                photoURL: photoURL || user.photoURL
            });

            res.json({ message: 'Profile updated successfully', user });
        } catch (error) {
            console.error('Error updating user profile:', error);
            return next(ApiError.internal('Error updating user profile'));
        }
    }

    async searchUsers(req, res, next) {
        try {
            const { query } = req.query;
            if (!query) {
                return next(ApiError.badRequest('Search query is required'));
            }

            const users = await User.findAll({
                where: {
                    [Op.or]: [
                        { displayName: { [Op.iLike]: `%${query}%` } },
                        { email: { [Op.iLike]: `%${query}%` } }
                    ]
                },
                attributes: ['id', 'displayName', 'email', 'photoURL', 'status'],
                limit: 10
            });

            res.json(users);
        } catch (error) {
            console.error('Error searching users:', error);
            return next(ApiError.internal('Error searching users'));
        }
    }

    async getUserById(req, res, next) {
        try {
            const { id } = req.params;
            const user = await User.findByPk(id, {
                attributes: ['id', 'displayName', 'email', 'photoURL', 'status']
            });

            if (!user) {
                return next(ApiError.notFound('User not found'));
            }

            res.json(user);
        } catch (error) {
            console.error('Error getting user:', error);
            return next(ApiError.internal('Error getting user'));
        }
    }

    // Отримання інформації про користувача
    async getUserInfo(req, res) {
        try {
            const userId = req.user.uid;

            const user = await User.findByPk(userId, {
                include: [
                    {
                        model: Team,
                        as: 'teams',
                        through: {
                            attributes: ['role', 'joinedAt']
                        }
                    },
                    {
                        model: Task,
                        as: 'createdTasks',
                        include: [
                            {
                                model: Team,
                                attributes: ['id', 'name', 'avatar']
                            }
                        ]
                    },
                    {
                        model: Task,
                        as: 'assignedTasks',
                        through: {
                            attributes: ['assignedAt']
                        },
                        include: [
                            {
                                model: Team,
                                attributes: ['id', 'name', 'avatar']
                            }
                        ]
                    }
                ]
            });

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json(user);
        } catch (error) {
            console.error('Error fetching user info:', error);
            res.status(500).json({ error: 'Failed to fetch user info' });
        }
    }

    // Оновлення інформації про користувача
    async updateUserInfo(req, res) {
        try {
            const userId = req.user.uid;
            const { name, avatar, preferences } = req.body;

            const user = await User.findByPk(userId);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Оновлюємо інформацію
            await user.update({
                name,
                avatar,
                preferences: {
                    ...user.preferences,
                    ...preferences
                }
            });

            // Отримуємо оновлену інформацію
            const updatedUser = await User.findByPk(userId, {
                include: [
                    {
                        model: Team,
                        as: 'teams',
                        through: {
                            attributes: ['role', 'joinedAt']
                        }
                    },
                    {
                        model: Task,
                        as: 'createdTasks',
                        include: [
                            {
                                model: Team,
                                attributes: ['id', 'name', 'avatar']
                            }
                        ]
                    },
                    {
                        model: Task,
                        as: 'assignedTasks',
                        through: {
                            attributes: ['assignedAt']
                        },
                        include: [
                            {
                                model: Team,
                                attributes: ['id', 'name', 'avatar']
                            }
                        ]
                    }
                ]
            });

            res.json(updatedUser);
        } catch (error) {
            console.error('Error updating user info:', error);
            res.status(500).json({ error: 'Failed to update user info' });
        }
    }

    // Отримання статистики користувача
    async getUserStats(req, res) {
        try {
            const userId = req.user.uid;

            // Отримуємо кількість команд
            const teamCount = await TeamMember.count({
                where: { userId }
            });

            // Отримуємо кількість створених завдань
            const createdTasksCount = await Task.count({
                where: { userId }
            });

            // Отримуємо кількість призначених завдань
            const assignedTasksCount = await TaskAssignee.count({
                where: { userId }
            });

            // Отримуємо кількість завершених завдань
            const completedTasksCount = await Task.count({
                where: {
                    userId,
                    status: 'done'
                }
            });

            // Отримуємо кількість завдань за статусом
            const tasksByStatus = await Task.findAll({
                where: { userId },
                attributes: [
                    'status',
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count']
                ],
                group: ['status']
            });

            // Отримуємо кількість завдань за пріоритетом
            const tasksByPriority = await Task.findAll({
                where: { userId },
                attributes: [
                    'priority',
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count']
                ],
                group: ['priority']
            });

            res.json({
                teamCount,
                createdTasksCount,
                assignedTasksCount,
                completedTasksCount,
                tasksByStatus,
                tasksByPriority
            });
        } catch (error) {
            console.error('Error fetching user stats:', error);
            res.status(500).json({ error: 'Failed to fetch user stats' });
        }
    }

    // Отримання активності користувача
    async getUserActivity(req, res) {
        try {
            const userId = req.user.uid;
            const { startDate, endDate } = req.query;

            // Формуємо умови для фільтрації за датою
            const dateFilter = {};
            if (startDate && endDate) {
                dateFilter.createdAt = {
                    [Op.between]: [new Date(startDate), new Date(endDate)]
                };
            }

            // Отримуємо створені завдання
            const createdTasks = await Task.findAll({
                where: {
                    userId,
                    ...dateFilter
                },
                include: [
                    {
                        model: Team,
                        attributes: ['id', 'name', 'avatar']
                    }
                ],
                order: [['createdAt', 'DESC']]
            });

            // Отримуємо призначені завдання
            const assignedTasks = await Task.findAll({
                include: [
                    {
                        model: TaskAssignee,
                        where: { userId },
                        ...dateFilter
                    },
                    {
                        model: Team,
                        attributes: ['id', 'name', 'avatar']
                    }
                ],
                order: [['createdAt', 'DESC']]
            });

            // Отримуємо активність в командах
            const teamActivity = await TeamMember.findAll({
                where: {
                    userId,
                    ...dateFilter
                },
                include: [
                    {
                        model: Team,
                        attributes: ['id', 'name', 'avatar']
                    }
                ],
                order: [['createdAt', 'DESC']]
            });

            res.json({
                createdTasks,
                assignedTasks,
                teamActivity
            });
        } catch (error) {
            console.error('Error fetching user activity:', error);
            res.status(500).json({ error: 'Failed to fetch user activity' });
        }
    }
}

module.exports = new UserController()


//const query = req.query
/* const {id} = req.query //Деструктуризация(щоб витянути одразу id) можна також query.id
if(!id){
    return next(ApiError.badRequest('Не вказаний id'))
}
res.json (id) */