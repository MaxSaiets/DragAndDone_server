const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Message = sequelize.define('Message', {
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
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM('text', 'file', 'image'),
      defaultValue: 'text',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    replyTo: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  }, {
    timestamps: true,
  });
  return Message;
}; 