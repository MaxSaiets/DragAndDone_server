const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Chat = sequelize.define('Chat', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    isGroup: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    ownerId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    timestamps: true,
  });
  return Chat;
}; 