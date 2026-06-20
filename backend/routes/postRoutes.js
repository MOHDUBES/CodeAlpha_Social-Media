const express = require('express');
const router = express.Router();
const { 
  createPost, 
  getFeed, 
  getExplore, 
  getUserPosts, 
  getPost, 
  updatePost, 
  deletePost, 
  toggleLike,
  getReels
} = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/explore', protect, getExplore);
router.get('/reels', protect, getReels);
router.get('/user/:userId', protect, getUserPosts);

router.route('/')
  .post(protect, upload.single('media'), createPost)
  .get(protect, getFeed);

router.route('/:id')
  .get(protect, getPost)
  .put(protect, updatePost)
  .delete(protect, deletePost);

router.post('/:id/like', protect, toggleLike);

module.exports = router;
