const { User} = require('../models/models')
const ApiError = require('../error/ApiError')
const bcrypt = require('bcrypt')


class UsersInfoController {
    async allUsers(req, res){
        try {
            const allUsers = await User.findAll();
            return res.json(allUsers);
        } catch (error) {
            next(ApiError.internal('Internal server error'));
        }
    }
    async createUser(req, res) {
        try {
            const { email, password, role, firstName, lastName, birthDate, phoneNumber } = req.body;

            if (!email || !password) {
                return next(ApiError.badRequest('Bad email or password'));
            }

            const candidate = await User.findOne({ where: { email } });
            if (candidate) {
                return next(ApiError.badRequest('Користувач з таким email уже існує!'));
            }

            const hashPassword = await bcrypt.hash(password, 5);
            const validBirthDate = new Date(birthDate);

            const newUser = await User.create({ email, role, password: hashPassword, firstName, lastName, birthDate: validBirthDate, phoneNumber });
            return res.json(newUser);
        } catch (error) {
            next(ApiError.internal('Internal server error'));
        }
    }
    async updateUser(req, res) {
        try {
            const { id } = req.params;
            const { email, password, role, firstName, lastName, birthDate, phoneNumber } = req.body;
            const validBirthDate = new Date(birthDate);

            const user = await User.findByPk(id);
            if (user) {
                await user.update({ email, password, role, firstName, lastName, birthDate: validBirthDate, phoneNumber });
                return res.json(user);
            } else {
                return res.status(404).json({ message: 'User not found' });
            }
        } catch (error) {
            next(ApiError.internal('Internal server error'));
        }
    }
    async deleteUser(req, res) {
        try {
            const { id } = req.params;
    
            const user = await User.findByPk(id);
    
            if (user) {
                await user.destroy();
                return res.json({ message: 'User deleted successfully' });
            } else {
                return res.status(404).json({ message: 'User not found' });
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
}

module.exports = new UsersInfoController()