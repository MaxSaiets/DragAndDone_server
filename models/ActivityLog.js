const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ActivityLog = sequelize.define('ActivityLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    teamId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false
    },
    details: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    timestamps: false,
    tableName: 'activity_logs'
  });
  return ActivityLog;
}; 