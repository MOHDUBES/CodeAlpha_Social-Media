const { Notification, User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

exports.getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.findAll({
    where: { recipientId: req.user.id },
    order: [['createdAt', 'DESC']],
    include: [{ model: User, as: 'sender', attributes: ['id', 'username', 'profilePic', 'isVerified'] }]
  });

  res.json(notifications);
});

exports.markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.update(
    { isRead: true },
    { where: { recipientId: req.user.id, isRead: false } }
  );

  res.json({ message: 'All notifications marked as read' });
});

exports.getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.count({
    where: { recipientId: req.user.id, isRead: false }
  });

  res.json({ count });
});
