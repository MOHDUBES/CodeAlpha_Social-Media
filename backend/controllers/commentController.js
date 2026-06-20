const { Comment, User, Post, Notification } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
exports.addComment = asyncHandler(async (req, res) => {
  const { text, parentId } = req.body;
  const postId = req.params.postId;

  if (!text) {
    res.status(400);
    throw new Error('Comment text is required');
  }

  const post = await Post.findByPk(postId);
  if (!post) {
    res.status(404);
    throw new Error('Post not found');
  }

  const comment = await Comment.create({
    userId: req.user.id,
    postId,
    text,
    parentId: parentId || null
  });

  // Notify post owner
  if (post.userId !== req.user.id && !parentId) {
    await Notification.create({
      recipientId: post.userId,
      senderId: req.user.id,
      type: 'comment',
      postId: post.id
    });
  }

  // Notify parent comment owner if it's a reply
  if (parentId) {
    const parentComment = await Comment.findByPk(parentId);
    if (parentComment && parentComment.userId !== req.user.id) {
      await Notification.create({
        recipientId: parentComment.userId,
        senderId: req.user.id,
        type: 'comment_reply',
        postId: post.id
      });
    }
  }

  // Fetch with user included to return to frontend
  const commentWithUser = await Comment.findByPk(comment.id, {
    include: [{ model: User, as: 'user', attributes: ['id', 'username', 'profilePic', 'isVerified'] }]
  });

  res.status(201).json(commentWithUser);
});

exports.getComments = asyncHandler(async (req, res) => {
  const comments = await Comment.findAll({
    where: { postId: req.params.postId, parentId: null },
    order: [['createdAt', 'ASC']],
    include: [
      { model: User, as: 'user', attributes: ['id', 'username', 'profilePic', 'isVerified'] },
      { 
        model: Comment, 
        as: 'Replies',
        include: [{ model: User, as: 'user', attributes: ['id', 'username', 'profilePic', 'isVerified'] }],
        order: [['createdAt', 'ASC']]
      }
    ]
  });

  res.json(comments);
});

exports.deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findByPk(req.params.id);
  
  if (!comment) {
    res.status(404);
    throw new Error('Comment not found');
  }

  if (comment.userId !== req.user.id) {
    res.status(403);
    throw new Error('Not authorized to delete this comment');
  }

  await comment.destroy();
  res.json({ message: 'Comment removed' });
});
