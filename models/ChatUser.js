const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ChatUser = sequelize.define('ChatUser', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    chatId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('admin', 'member'),
      defaultValue: 'member',
    },
    joinedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    timestamps: false,
  });
  return ChatUser;
}; 