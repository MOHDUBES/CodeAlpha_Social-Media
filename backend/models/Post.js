const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Post = sequelize.define('Post', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  caption: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '',
  },
  mediaUrl: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  mediaType: {
    type: DataTypes.ENUM('image', 'video', 'text'),
    defaultValue: 'text',
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
  }
}, {
  timestamps: true
});

module.exports = Post;
