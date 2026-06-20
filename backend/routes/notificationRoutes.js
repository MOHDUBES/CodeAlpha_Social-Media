const express = require('express');
const router = express.Router();
const { getNotifications, markAllAsRead, getUnreadCount } = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getNotifications);
router.put('/read-all', protect, markAllAsRead);
router.get('/unread-count', protect, getUnreadCount);

module.exports = router;
