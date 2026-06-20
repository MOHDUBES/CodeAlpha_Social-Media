const { Post, User, Like, Comment, Follower, Notification } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { Op } = require('sequelize');

exports.createPost = asyncHandler(async (req, res) => {
  const { caption, location } = req.body;
  let mediaUrl = '';
  let mediaType = 'text';

  if (req.file) {
    mediaUrl = req.file.path;
    // very basic check based on multer's output or mimetype
    mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
  }

  if (!caption && !mediaUrl) {
    res.status(400);
    throw new Error('Post must have caption or media');
  }

  const post = await Post.create({
    userId: req.user.id,
    caption: caption || '',
    mediaUrl,
    mediaType,
    location
  });

  res.status(201).json(post);
});

exports.getFeed = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = (page - 1) * limit;

  const following = await Follower.findAll({
    where: { followerId: req.user.id },
    attributes: ['followingId']
  });
  
  const followingIds = following.map(f => f.followingId);
  followingIds.push(req.user.id);

  const posts = await Post.findAll({
    where: { userId: { [Op.in]: followingIds } },
    order: [['createdAt', 'DESC']],
    limit,
    offset,
    include: [
      { model: User, as: 'user', attributes: ['id', 'username', 'profilePic', 'isVerified'] },
      { model: Like, attributes: ['userId'] },
      { 
        model: Comment, 
        as: 'Comments', 
        attributes: ['id', 'text', 'createdAt', 'userId'],
        include: [{ model: User, as: 'user', attributes: ['username', 'profilePic'] }],
        limit: 2,
        order: [['createdAt', 'ASC']]
      }
    ]
  });

  const formattedPosts = posts.map(post => {
    const p = post.toJSON();
    p.likeCount = p.Likes ? p.Likes.length : 0;
    p.hasLiked = p.Likes ? p.Likes.some(like => like.userId === req.user.id) : false;
    p.isOwner = p.userId === req.user.id;
    delete p.Likes;
    return p;
  });

  res.json(formattedPosts);
});

exports.getExplore = asyncHandler(async (req, res) => {
  const posts = await Post.findAll({
    where: {
      mediaUrl: { [Op.ne]: '' }
    },
    order: [['createdAt', 'DESC']],
    limit: 30,
    include: [
      { model: Like, attributes: ['userId'] },
      { model: Comment, as: 'Comments', attributes: ['id'] }
    ]
  });
  
  const formattedPosts = posts.map(post => {
    const p = post.toJSON();
    p.likeCount = p.Likes ? p.Likes.length : 0;
    p.commentCount = p.Comments ? p.Comments.length : 0;
    delete p.Likes;
    delete p.Comments;
    return p;
  });

  res.json(formattedPosts);
});

exports.getUserPosts = asyncHandler(async (req, res) => {
  const posts = await Post.findAll({
    where: { userId: req.params.userId },
    order: [['createdAt', 'DESC']],
    include: [
      { model: Like, attributes: ['userId'] },
      { model: Comment, as: 'Comments', attributes: ['id'] }
    ]
  });

  const formattedPosts = posts.map(post => {
    const p = post.toJSON();
    p.likeCount = p.Likes ? p.Likes.length : 0;
    p.commentCount = p.Comments ? p.Comments.length : 0;
    delete p.Likes;
    delete p.Comments;
    return p;
  });

  res.json(formattedPosts);
});

exports.getPost = asyncHandler(async (req, res) => {
  const post = await Post.findByPk(req.params.id, {
    include: [
      { model: User, as: 'user', attributes: ['id', 'username', 'profilePic', 'isVerified'] },
      { model: Like, attributes: ['userId'] },
      { model: Comment, as: 'Comments', attributes: ['id'] }
    ]
  });

  if (!post) {
    res.status(404);
    throw new Error('Post not found');
  }

  const p = post.toJSON();
  p.likeCount = p.Likes ? p.Likes.length : 0;
  p.commentCount = p.Comments ? p.Comments.length : 0;
  p.hasLiked = p.Likes ? p.Likes.some(like => like.userId === req.user.id) : false;
  p.isOwner = p.userId === req.user.id;
  delete p.Likes;

  res.json(p);
});

exports.updatePost = asyncHandler(async (req, res) => {
  const post = await Post.findByPk(req.params.id);
  
  if (!post) {
    res.status(404);
    throw new Error('Post not found');
  }

  if (post.userId !== req.user.id) {
    res.status(403);
    throw new Error('Not authorized to update this post');
  }

  const { caption, location } = req.body;
  if (caption !== undefined) post.caption = caption;
  if (location !== undefined) post.location = location;

  await post.save();
  res.json(post);
});

exports.deletePost = asyncHandler(async (req, res) => {
  const post = await Post.findByPk(req.params.id);
  
  if (!post) {
    res.status(404);
    throw new Error('Post not found');
  }

  if (post.userId !== req.user.id) {
    res.status(403);
    throw new Error('Not authorized to delete this post');
  }

  await post.destroy();
  res.json({ message: 'Post removed' });
});

exports.toggleLike = asyncHandler(async (req, res) => {
  const post = await Post.findByPk(req.params.id);
  if (!post) {
    res.status(404);
    throw new Error('Post not found');
  }

  const existingLike = await Like.findOne({
    where: { postId: req.params.id, userId: req.user.id }
  });

  if (existingLike) {
    await existingLike.destroy();
    const count = await Like.count({ where: { postId: post.id } });
    res.json({ liked: false, likeCount: count });
  } else {
    await Like.create({ postId: req.params.id, userId: req.user.id });
    
    if (post.userId !== req.user.id) {
      await Notification.create({
        recipientId: post.userId,
        senderId: req.user.id,
        type: 'like',
        postId: post.id
      });
    }

    const count = await Like.count({ where: { postId: post.id } });
    res.json({ liked: true, likeCount: count });
  }
});

exports.getReels = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const offset = parseInt(req.query.offset) || 0;

  const posts = await Post.findAll({
    order: [['createdAt', 'DESC']],
    limit,
    offset,
    include: [
      { model: User, as: 'user', attributes: ['id', 'username', 'profilePic', 'isVerified'] },
      { model: Like, attributes: ['userId'] },
      { 
        model: Comment, 
        as: 'Comments', 
        attributes: ['id']
      }
    ]
  });

  const formattedPosts = posts.map(post => {
    const p = post.toJSON();
    p.likeCount = p.Likes ? p.Likes.length : 0;
    p.hasLiked = p.Likes ? p.Likes.some(like => like.userId === req.user.id) : false;
    p.isOwner = p.userId === req.user.id;
    delete p.Likes;
    return p;
  });

  res.json(formattedPosts);
});
