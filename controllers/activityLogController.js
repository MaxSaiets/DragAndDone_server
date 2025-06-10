const { ActivityLog, User } = require('../models');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

exports.addLog = async (req, res) => {
  try {
    const { userId, action, entityType, entityId, details, metadata } = req.body;
    
    // Validate required fields
    if (!userId || !action || !entityType || !entityId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const log = await ActivityLog.create({
      id: uuidv4(),
      userId,
      action,
      entityType,
      entityId,
      details,
      metadata: {
        ...metadata,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    res.status(201).json(log);
  } catch (error) {
    console.error('Error adding activity log:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getUserLogs = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, action, entityType, limit = 50, offset = 0 } = req.query;

    const where = { userId };
    
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    if (action) {
      where.action = action;
    }
    
    if (entityType) {
      where.entityType = entityType;
    }

    const logs = await ActivityLog.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [{
        model: User,
        attributes: ['id', 'displayName', 'photoURL']
      }]
    });

    const total = await ActivityLog.count({ where });

    res.json({
      logs,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error getting user logs:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const { userId, teamId, startDate, endDate, groupBy = 'day' } = req.query;
    
    const where = {};
    if (userId) where.userId = userId;
    if (teamId) where.teamId = teamId;
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const logs = await ActivityLog.findAll({ where });

    // Group by time period
    const stats = {};
    logs.forEach(log => {
      let key;
      switch (groupBy) {
        case 'hour':
          key = log.createdAt.toISOString().slice(0, 13);
          break;
        case 'day':
          key = log.createdAt.toISOString().slice(0, 10);
          break;
        case 'week':
          const week = getWeekNumber(log.createdAt);
          key = `${log.createdAt.getFullYear()}-W${week}`;
          break;
        case 'month':
          key = log.createdAt.toISOString().slice(0, 7);
          break;
        default:
          key = log.createdAt.toISOString().slice(0, 10);
      }
      
      if (!stats[key]) {
        stats[key] = {
          total: 0,
          byAction: {},
          byEntityType: {}
        };
      }
      
      stats[key].total++;
      stats[key].byAction[log.action] = (stats[key].byAction[log.action] || 0) + 1;
      stats[key].byEntityType[log.entityType] = (stats[key].byEntityType[log.entityType] || 0) + 1;
    });

    // Calculate trends
    const trends = {
      totalActions: logs.length,
      mostCommonAction: getMostCommon(logs.map(l => l.action)),
      mostCommonEntityType: getMostCommon(logs.map(l => l.entityType)),
      averageActionsPerDay: calculateAverage(stats)
    };

    res.json({
      stats,
      trends
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: error.message });
  }
};

// Helper functions
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getMostCommon(arr) {
  return arr.sort((a, b) =>
    arr.filter(v => v === a).length - arr.filter(v => v === b).length
  ).pop();
}

function calculateAverage(stats) {
  const days = Object.keys(stats).length;
  if (days === 0) return 0;
  
  const total = Object.values(stats).reduce((sum, day) => sum + day.total, 0);
  return total / days;
} 