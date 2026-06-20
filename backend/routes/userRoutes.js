const express = require('express');
const router = express.Router();
const { 
  getProfile, 
  updateProfile, 
  followUser, 
  unfollowUser,
  searchUsers,
  getSuggestions,
  uploadAvatar,
  uploadCover,
  getFollowers,
  getFollowing
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/search', protect, searchUsers);
router.get('/suggestions', protect, getSuggestions);

router.put('/me', protect, updateProfile);
router.post('/me/avatar', protect, upload.single('image'), uploadAvatar);
router.post('/me/cover', protect, upload.single('image'), uploadCover);

router.get('/:id', protect, getProfile);
router.get('/:id/followers', protect, getFollowers);
router.get('/:id/following', protect, getFollowing);
router.post('/:id/follow', protect, followUser);
router.post('/:id/unfollow', protect, unfollowUser);

module.exports = router;
