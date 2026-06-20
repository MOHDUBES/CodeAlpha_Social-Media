const express = require('express');
const router = express.Router();
const { authLimiter } = require('../middleware/rateLimiter');
const { signup, login, refresh, logout, forgotPassword, verifyOtp, resetPassword, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/signup', authLimiter, signup);
router.post('/login', authLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/forgotpassword', authLimiter, forgotPassword);
router.post('/verifyotp', authLimiter, verifyOtp);
router.put('/resetpassword', authLimiter, resetPassword);
router.get('/me', protect, getMe);

module.exports = router;
