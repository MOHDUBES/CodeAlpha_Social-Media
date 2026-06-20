const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Story = sequelize.define('Story', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  mediaUrl: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  mediaType: {
    type: DataTypes.ENUM('image', 'video'),
    defaultValue: 'image',
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  }
}, {
  timestamps: true,
  updatedAt: false // Stories generally don't need updatedAt
});

module.exports = Story;
