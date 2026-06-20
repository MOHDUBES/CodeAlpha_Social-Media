const { Story, Follower, User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { Op } = require('sequelize');

exports.createStory = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Story media is required');
  }

  const mediaUrl = req.file.path;
  const mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  const story = await Story.create({
    userId: req.user.id,
    mediaUrl,
    mediaType,
    expiresAt
  });

  res.status(201).json(story);
});

exports.getStories = asyncHandler(async (req, res) => {
  const following = await Follower.findAll({
    where: { followerId: req.user.id },
    attributes: ['followingId']
  });

  const followingIds = following.map(f => f.followingId);
  followingIds.push(req.user.id);

  const stories = await Story.findAll({
    where: {
      userId: { [Op.in]: followingIds },
      expiresAt: { [Op.gt]: new Date() }
    },
    order: [['createdAt', 'DESC']],
    include: [{ model: User, as: 'user', attributes: ['id', 'username', 'profilePic', 'isVerified'] }]
  });

  // Group stories by user for frontend
  const grouped = {};
  stories.forEach(s => {
    if (!grouped[s.userId]) {
      grouped[s.userId] = {
        user: s.user,
        stories: []
      };
    }
    grouped[s.userId].stories.push(s);
  });

  // Convert to array and put current user first if they have stories
  const result = Object.values(grouped);
  result.sort((a, b) => {
    if (a.user.id === req.user.id) return -1;
    if (b.user.id === req.user.id) return 1;
    return new Date(b.stories[0].createdAt) - new Date(a.stories[0].createdAt);
  });

  res.json(result);
});

exports.deleteStory = asyncHandler(async (req, res) => {
  const story = await Story.findByPk(req.params.id);
  if (!story) {
    res.status(404);
    throw new Error('Story not found');
  }

  if (story.userId !== req.user.id) {
    res.status(403);
    throw new Error('Not authorized to delete this story');
  }

  await story.destroy();
  res.json({ message: 'Story deleted' });
});
