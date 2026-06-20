const express = require('express');
const router = express.Router();
const { createStory, getStories, deleteStory } = require('../controllers/storyController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.route('/')
  .post(protect, upload.single('media'), createStory)
  .get(protect, getStories);

router.delete('/:id', protect, deleteStory);

module.exports = router;
