const { Team, Task, User, TeamMember } = require('../models');
const { Op } = require('sequelize');
const ApiError = require('../error/ApiError');
const { v4: uuidv4 } = require('uuid');
const { getIO } = require('../utils/socket');

// Отримати всі команди користувача
exports.getTeams = async (req, res) => {
  try {
    const userId = req.user.uid;
    console.log('Отримання команд для користувача:', userId);

    const teams = await Team.findAll({
      include: [
        {
          model: User,
          as: 'teamUsers',
          attributes: ['uid', 'name', 'avatar'],
          through: {
            attributes: ['role', 'joinedAt']
          }
        },
        {
          model: User,
          as: 'teamOwner',
          attributes: ['uid', 'name', 'avatar']
        }
      ],
      where: {
        [Op.or]: [
          { ownerId: userId },
          {
            '$teamUsers.uid$': userId
          }
        ]
      }
    });

    console.log(`Знайдено ${teams.length} команд`);
    res.json(teams);
  } catch (error) {
    console.error('Помилка отримання команд:', error);
    res.status(500).json({ error: 'Не вдалося отримати команди' });
  }
};

// Отримати деталі команди
exports.getTeamDetails = async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.uid;

    const team = await Team.findOne({
      where: { id: teamId },
      include: [
        {
          model: User,
          as: 'teamUsers',
          attributes: ['uid', 'name', 'avatar', 'email'],
          through: {
            attributes: ['role', 'joinedAt']
          }
        },
        {
          model: User,
          as: 'teamOwner',
          attributes: ['uid', 'name', 'avatar']
        }
      ]
    });

    if (!team) {
      return res.status(404).json({ error: 'Команду не знайдено' });
    }

    // Перевірка чи користувач є учасником або власником
    const isMember = team.teamUsers.some(user => user.uid === userId);
    const isOwner = team.ownerId === userId;

    if (!isMember && !isOwner) {
      return res.status(403).json({ error: 'Немає доступу до цієї команди' });
    }

    res.json(team);
  } catch (error) {
    console.error('Помилка отримання деталей команди:', error);
    res.status(500).json({ error: 'Не вдалося отримати деталі команди' });
  }
};

// Створити нову команду
exports.createTeam = async (req, res) => {
  try {
    const { name, description, avatar, settings } = req.body;
    const userId = req.user.uid;
    console.log('Створення команди з даними:', { name, description, avatar, settings });

    const team = await Team.create({
      id: uuidv4(),
      name,
      description,
      avatar,
      settings,
      ownerId: userId
    });

    // Додаємо власника як члена команди
    await TeamMember.create({
      id: uuidv4(),
      teamId: team.id,
      userId: userId,
      role: 'owner'
    });

    const fullTeam = await Team.findByPk(team.id, {
      include: [
        {
          model: User,
          as: 'teamUsers',
          attributes: ['uid', 'name', 'avatar'],
          through: {
            attributes: ['role', 'joinedAt']
          }
        },
        {
          model: User,
          as: 'teamOwner',
          attributes: ['uid', 'name', 'avatar']
        }
      ]
    });

    console.log('Команду успішно створено:', fullTeam.toJSON());
    res.status(201).json(fullTeam);
  } catch (error) {
    console.error('Помилка створення команди:', error);
    res.status(500).json({ error: 'Не вдалося створити команду' });
  }
};

// Оновити команду
exports.updateTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, avatar, settings } = req.body;
    const userId = req.user.uid;
    console.log('Оновлення команди:', id);

    const team = await Team.findOne({
      where: { id },
      include: [{
        model: User,
        as: 'teamUsers',
        through: {
          attributes: ['role']
        }
      }]
    });
    
    if (!team) {
      console.log('Команду не знайдено:', id);
      return res.status(404).json({ error: 'Команду не знайдено' });
    }

    const isOwner = team.ownerId === userId;
    const currentMember = team.teamUsers.find(user => user.uid === userId);
    const isAdmin = currentMember && currentMember.TeamMember.role === 'admin';

    if (!isOwner && !isAdmin) {
      console.log('Користувач не має прав на оновлення команди');
      return res.status(403).json({ error: 'Немає прав на оновлення цієї команди' });
    }

    await team.update({
      name,
      description,
      avatar,
      settings
    });

    const updatedTeam = await Team.findByPk(id, {
      include: [
        {
          model: User,
          as: 'teamUsers',
          attributes: ['uid', 'name', 'avatar'],
          through: {
            attributes: ['role', 'joinedAt']
          }
        },
        {
          model: User,
          as: 'teamOwner',
          attributes: ['uid', 'name', 'avatar']
        }
      ]
    });

    console.log('Команду успішно оновлено');
    res.json(updatedTeam);
  } catch (error) {
    console.error('Помилка оновлення команди:', error);
    res.status(500).json({ error: 'Не вдалося оновити команду' });
  }
};

// Видалити команду
exports.deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    console.log('Видалення команди:', id);

    const team = await Team.findOne({
      where: { id },
      include: [{
        model: User,
        as: 'teamUsers',
        through: {
          attributes: ['role']
        }
      }]
    });
    
    if (!team) {
      console.log('Команду не знайдено:', id);
      return res.status(404).json({ error: 'Команду не знайдено' });
    }

    const isOwner = team.ownerId === userId;
    if (!isOwner) {
      console.log('Користувач не має прав на видалення команди');
      return res.status(403).json({ error: 'Тільки власник може видалити команду' });
    }

    // Видалення всіх завдань команди
    await Task.destroy({ where: { teamId: id } });
    
    // Видалення всіх учасників команди
    await TeamMember.destroy({ where: { teamId: id } });
    
    await team.destroy();
    console.log('Команду успішно видалено');
    res.json({ message: 'Команду успішно видалено' });
  } catch (error) {
    console.error('Помилка видалення команди:', error);
    res.status(500).json({ error: 'Не вдалося видалити команду' });
  }
};

// Додати учасника до команди
exports.addTeamMember = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { email, role } = req.body;
    const currentUserId = req.user.uid;

    const team = await Team.findOne({
      where: { id: teamId },
      include: [{
        model: User,
        as: 'teamUsers',
        through: {
          attributes: ['role']
        }
      }]
    });

    if (!team) {
      return res.status(404).json({ error: 'Команду не знайдено' });
    }

    const isOwner = team.ownerId === currentUserId;
    const currentMember = team.teamUsers.find(user => user.uid === currentUserId);
    const isAdmin = currentMember && currentMember.TeamMember.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Немає прав на додавання учасників' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'Користувача не знайдено' });
    }

    const existingMember = await TeamMember.findOne({
      where: {
        teamId,
        userId: user.uid
      }
    });

    if (existingMember) {
      return res.status(400).json({ error: 'Користувач вже є учасником команди' });
    }

    const teamMember = await TeamMember.create({
      teamId,
      userId: user.uid,
      role: role || 'member'
    });

    const updatedTeam = await Team.findByPk(teamId, {
      include: [
        {
          model: User,
          as: 'teamUsers',
          attributes: ['uid', 'name', 'avatar'],
          through: {
            attributes: ['role', 'joinedAt']
          }
        },
        {
          model: User,
          as: 'teamOwner',
          attributes: ['uid', 'name', 'avatar']
        }
      ]
    });

    res.status(201).json(updatedTeam);
  } catch (error) {
    console.error('Помилка додавання учасника:', error);
    res.status(500).json({ error: 'Не вдалося додати учасника' });
  }
};

// Видалити учасника з команди
exports.removeTeamMember = async (req, res) => {
  try {
    const { teamId, userId } = req.params;
    const currentUserId = req.user.uid;

    const team = await Team.findOne({
      where: { id: teamId },
      include: [{
        model: User,
        as: 'teamUsers',
        through: {
          attributes: ['role']
        }
      }]
    });

    if (!team) {
      return res.status(404).json({ error: 'Команду не знайдено' });
    }

    const isOwner = team.ownerId === currentUserId;
    const currentMember = team.teamUsers.find(user => user.uid === currentUserId);
    const isAdmin = currentMember && currentMember.TeamMember.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Немає прав на видалення учасників' });
    }

    // Заборона видалення власника
    if (userId === team.ownerId) {
      return res.status(400).json({ error: 'Неможливо видалити власника команди' });
    }

    await TeamMember.destroy({
      where: {
        teamId,
        userId
      }
    });

    const updatedTeam = await Team.findByPk(teamId, {
      include: [
        {
          model: User,
          as: 'teamUsers',
          attributes: ['uid', 'name', 'avatar'],
          through: {
            attributes: ['role', 'joinedAt']
          }
        },
        {
          model: User,
          as: 'teamOwner',
          attributes: ['uid', 'name', 'avatar']
        }
      ]
    });

    res.json(updatedTeam);
  } catch (error) {
    console.error('Помилка видалення учасника:', error);
    res.status(500).json({ error: 'Не вдалося видалити учасника' });
  }
};

// Оновити роль учасника
exports.updateTeamMemberRole = async (req, res) => {
  try {
    const { teamId, userId } = req.params;
    const { role } = req.body;
    const currentUserId = req.user.uid;

    const team = await Team.findOne({
      where: { id: teamId },
      include: [{
        model: User,
        as: 'teamUsers',
        through: {
          attributes: ['role']
        }
      }]
    });

    if (!team) {
      return res.status(404).json({ error: 'Команду не знайдено' });
    }

    const isOwner = team.ownerId === currentUserId;
    if (!isOwner) {
      return res.status(403).json({ error: 'Тільки власник може змінювати ролі учасників' });
    }

    const member = await TeamMember.findOne({
      where: {
        teamId,
        userId
      }
    });

    if (!member) {
      return res.status(404).json({ error: 'Учасника не знайдено' });
    }

    // Заборона зміни ролі власника
    if (userId === team.ownerId) {
      return res.status(400).json({ error: 'Неможливо змінити роль власника' });
    }

    await member.update({ role });

    const updatedTeam = await Team.findByPk(teamId, {
      include: [
        {
          model: User,
          as: 'teamUsers',
          attributes: ['uid', 'name', 'avatar'],
          through: {
            attributes: ['role', 'joinedAt']
          }
        },
        {
          model: User,
          as: 'teamOwner',
          attributes: ['uid', 'name', 'avatar']
        }
      ]
    });

    res.json(updatedTeam);
  } catch (error) {
    console.error('Помилка оновлення ролі учасника:', error);
    res.status(500).json({ error: 'Не вдалося оновити роль учасника' });
  }
};

// Update team settings
exports.updateSettings = async (req, res) => {
  try {
    const { id } = req.params;
    const { settings } = req.body;
    const userId = req.user.uid;
    console.log('Updating team settings:', id);

    const team = await Team.findByPk(id);
    
    if (!team) {
      console.log('Team not found:', id);
      return res.status(404).json({ error: 'Team not found' });
    }

    if (team.ownerId !== userId) {
      console.log('User not authorized to update settings');
      return res.status(403).json({ error: 'Not authorized' });
    }

    await team.update({ settings });
    console.log('Settings updated successfully');
    res.json(team);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: error.message });
  }
};

// Отримати учасників команди
exports.getMembers = async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.uid;
    console.log('Отримання учасників команди:', teamId);

    const team = await Team.findOne({
      where: { id: teamId },
      include: [
        {
          model: User,
          as: 'teamUsers',
          attributes: ['uid', 'name', 'avatar', 'email'],
          through: {
            attributes: ['role', 'joinedAt']
          }
        },
        {
          model: User,
          as: 'teamOwner',
          attributes: ['uid', 'name', 'avatar']
        }
      ]
    });

    if (!team) {
      console.log('Команду не знайдено:', teamId);
      return res.status(404).json({ error: 'Команду не знайдено' });
    }

    // Перевірка чи користувач є учасником або власником
    const isMember = team.teamUsers.some(user => user.uid === userId);
    const isOwner = team.ownerId === userId;

    if (!isMember && !isOwner) {
      console.log('Користувач не має доступу до команди');
      return res.status(403).json({ error: 'Немає доступу до цієї команди' });
    }

    console.log(`Знайдено ${team.teamUsers.length} учасників команди`);
    res.json(team.teamUsers);
  } catch (error) {
    console.error('Помилка отримання учасників команди:', error);
    res.status(500).json({ error: 'Не вдалося отримати учасників команди' });
  }
}; 