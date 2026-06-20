const { User, Post, Follower, Notification } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

exports.searchUsers = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);

  const users = await User.findAll({
    where: {
      [Op.or]: [
        { username: { [Op.like]: `%${q}%` } },
        { fullName: { [Op.like]: `%${q}%` } }
      ]
    },
    attributes: ['id', 'username', 'fullName', 'profilePic', 'isVerified'],
    limit: 20
  });

  res.json(users);
});

exports.getSuggestions = asyncHandler(async (req, res) => {
  const following = await Follower.findAll({
    where: { followerId: req.user.id },
    attributes: ['followingId']
  });

  const followingIds = following.map(f => f.followingId);
  followingIds.push(req.user.id);

  const suggestions = await User.findAll({
    where: {
      id: { [Op.notIn]: followingIds }
    },
    attributes: ['id', 'username', 'fullName', 'profilePic', 'isVerified'],
    limit: 5,
    order: sequelize.random()
  });

  res.json(suggestions);
});

exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id, {
    attributes: ['id', 'username', 'fullName', 'email', 'bio', 'profilePic', 'coverPic', 'isVerified'],
    include: [
      { model: Follower, as: 'Followers', attributes: ['id', 'followerId'] },
      { model: Follower, as: 'Following', attributes: ['id', 'followingId'] }
    ]
  });

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const posts = await Post.findAll({
    where: { userId: user.id },
    order: [['createdAt', 'DESC']]
  });

  const followersCount = user.Followers ? user.Followers.length : 0;
  const followingCount = user.Following ? user.Following.length : 0;
  const isFollowing = user.Followers ? user.Followers.some(f => f.followerId === req.user.id) : false;

  res.json({ user, posts, followersCount, followingCount, isFollowing });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const { bio, fullName } = req.body;
  if (bio !== undefined) user.bio = bio;
  if (fullName !== undefined) user.fullName = fullName;

  await user.save();
  res.json(user);
});

exports.uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No image uploaded');
  }
  const user = await User.findByPk(req.user.id);
  user.profilePic = req.file.path;
  await user.save();
  res.json(user);
});

exports.uploadCover = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No image uploaded');
  }
  const user = await User.findByPk(req.user.id);
  user.coverPic = req.file.path;
  await user.save();
  res.json(user);
});

exports.followUser = asyncHandler(async (req, res) => {
  if (req.user.id === req.params.id) {
    res.status(400);
    throw new Error('You cannot follow yourself');
  }

  const userToFollow = await User.findByPk(req.params.id);
  if (!userToFollow) {
    res.status(404);
    throw new Error('User not found');
  }

  const existingFollow = await Follower.findOne({
    where: { followerId: req.user.id, followingId: req.params.id }
  });

  if (!existingFollow) {
    await Follower.create({ followerId: req.user.id, followingId: req.params.id });

    // Create Notification
    await Notification.create({
      recipientId: req.params.id,
      senderId: req.user.id,
      type: 'follow'
    });
  }

  res.json({ message: 'Followed user' });
});

exports.unfollowUser = asyncHandler(async (req, res) => {
  const existingFollow = await Follower.findOne({
    where: { followerId: req.user.id, followingId: req.params.id }
  });

  if (existingFollow) {
    await existingFollow.destroy();
  }

  res.json({ message: 'Unfollowed user' });
});

exports.getFollowers = asyncHandler(async (req, res) => {
  const followers = await Follower.findAll({
    where: { followingId: req.params.id },
    include: [{ model: User, as: 'followerUser', attributes: ['id', 'username', 'fullName', 'profilePic', 'isVerified'] }]
  });
  res.json(followers.map(f => f.followerUser));
});

exports.getFollowing = asyncHandler(async (req, res) => {
  const following = await Follower.findAll({
    where: { followerId: req.params.id },
    include: [{ model: User, as: 'followingUser', attributes: ['id', 'username', 'fullName', 'profilePic', 'isVerified'] }]
  });
  res.json(following.map(f => f.followingUser));
});
