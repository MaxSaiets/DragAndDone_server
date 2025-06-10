const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MessageFile = sequelize.define('MessageFile', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    messageId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    timestamps: false,
  });
  return MessageFile;
}; 