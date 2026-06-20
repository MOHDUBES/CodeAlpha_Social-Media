const express = require('express');
const router = express.Router();
const { getConversations, getMessages, sendMessage, markAsRead } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/conversations').get(getConversations);
router.route('/:userId').get(getMessages).post(sendMessage);
router.route('/:userId/read').put(markAsRead);

module.exports = router;
