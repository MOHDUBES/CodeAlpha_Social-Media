const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Follower = sequelize.define('Follower', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  followerId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  followingId: {
    type: DataTypes.UUID,
    allowNull: false,
  }
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['followerId', 'followingId']
    }
  ]
});

module.exports = Follower;
