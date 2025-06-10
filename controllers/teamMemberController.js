const { TeamMember, Team, User } = require('../models');
const { Op } = require('sequelize');
const ApiError = require('../error/ApiError');
const { v4: uuidv4 } = require('uuid');
const { getIO } = require('../utils/socket');

// Get all team members
exports.getTeamMembers = async (req, res, next) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findByPk(teamId);
    if (!team) {
      return next(ApiError.notFound('Team not found'));
    }

    const members = await TeamMember.findAll({
      where: { teamId },
      include: [
        {
          model: User,
          attributes: ['id', 'displayName', 'email', 'photoURL', 'status']
        }
      ],
      order: [
        ['role', 'ASC'],
        [{ model: User }, 'displayName', 'ASC']
      ]
    });

    res.json(members);
  } catch (error) {
    console.error('Error getting team members:', error);
    return next(ApiError.internal('Error getting team members'));
  }
};

// Get team member by ID
exports.getTeamMember = async (req, res, next) => {
  try {
    const { teamId, memberId } = req.params;

    const member = await TeamMember.findOne({
      where: {
        teamId,
        userId: memberId
      },
      include: [
        {
          model: User,
          attributes: ['id', 'displayName', 'email', 'photoURL', 'status']
        }
      ]
    });

    if (!member) {
      return next(ApiError.notFound('Team member not found'));
    }

    res.json(member);
  } catch (error) {
    console.error('Error getting team member:', error);
    return next(ApiError.internal('Error getting team member'));
  }
};

// Update team member role
exports.updateTeamMemberRole = async (req, res, next) => {
  try {
    const { teamId, memberId } = req.params;
    const { role } = req.body;
    const userId = req.user.uid;

    const team = await Team.findByPk(teamId);
    if (!team) {
      return next(ApiError.notFound('Team not found'));
    }

    if (team.ownerId !== userId) {
      return next(ApiError.forbidden('Not authorized to update member roles'));
    }

    const member = await TeamMember.findOne({
      where: {
        teamId,
        userId: memberId
      }
    });

    if (!member) {
      return next(ApiError.notFound('Team member not found'));
    }

    if (member.role === 'owner') {
      return next(ApiError.forbidden('Cannot change owner role'));
    }

    await member.update({ role });

    // Відправляємо сповіщення члену команди про зміну ролі
    const io = getIO();
    io.to(`user-${memberId}`).emit('notification', {
      type: 'role_update',
      title: 'Role Update',
      message: `Your role in team ${team.name} has been updated to ${role}`,
      data: { teamId, role }
    });

    res.json(member);
  } catch (error) {
    console.error('Error updating team member role:', error);
    return next(ApiError.internal('Error updating team member role'));
  }
};

// Remove team member
exports.removeTeamMember = async (req, res, next) => {
  try {
    const { teamId, memberId } = req.params;
    const userId = req.user.uid;

    const team = await Team.findByPk(teamId);
    if (!team) {
      return next(ApiError.notFound('Team not found'));
    }

    if (team.ownerId !== userId) {
      return next(ApiError.forbidden('Not authorized to remove members'));
    }

    const member = await TeamMember.findOne({
      where: {
        teamId,
        userId: memberId
      }
    });

    if (!member) {
      return next(ApiError.notFound('Team member not found'));
    }

    if (member.role === 'owner') {
      return next(ApiError.forbidden('Cannot remove team owner'));
    }

    await member.destroy();

    // Відправляємо сповіщення видаленому члену команди
    const io = getIO();
    io.to(`user-${memberId}`).emit('notification', {
      type: 'team_removal',
      title: 'Team Removal',
      message: `You have been removed from team: ${team.name}`,
      data: { teamId }
    });

    res.json({ message: 'Team member removed successfully' });
  } catch (error) {
    console.error('Error removing team member:', error);
    return next(ApiError.internal('Error removing team member'));
  }
};

// Leave team
exports.leaveTeam = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.uid;

    const team = await Team.findByPk(teamId);
    if (!team) {
      return next(ApiError.notFound('Team not found'));
    }

    const member = await TeamMember.findOne({
      where: {
        teamId,
        userId
      }
    });

    if (!member) {
      return next(ApiError.notFound('You are not a member of this team'));
    }

    if (member.role === 'owner') {
      return next(ApiError.forbidden('Team owner cannot leave the team'));
    }

    await member.destroy();

    res.json({ message: 'Successfully left the team' });
  } catch (error) {
    console.error('Error leaving team:', error);
    return next(ApiError.internal('Error leaving team'));
  }
}; 