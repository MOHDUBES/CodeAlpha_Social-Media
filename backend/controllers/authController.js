const { User, Token, PasswordReset } = require('../models');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');
const sendMail = require('../utils/sendMail');

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
exports.signup = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    res.status(400);
    throw new Error('Please enter all fields');
  }
  
  if (username.length < 3 || username.length > 24) {
    res.status(400);
    throw new Error('Username must be between 3 and 24 characters');
  }



  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400);
    throw new Error('Invalid email format');
  }

  const userExists = await User.findOne({ 
    where: { 
      [Op.or]: [{ email }, { username }] 
    } 
  });
  
  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    username,
    email,
    password: hashedPassword
  });

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await Token.create({
    userId: user.id,
    token: await bcrypt.hash(refreshToken, 10),
    expiresAt
  });

  res.cookie('jwt', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.status(201).json({ 
    token: accessToken, 
    user: { id: user.id, username: user.username, email: user.email, profilePic: user.profilePic } 
  });
});

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res) => {
  let { email, password } = req.body;
  if (email) email = email.trim().toLowerCase();

  if (!email || !password) {
    res.status(400);
    throw new Error('Please enter all fields');
  }

  const user = await User.findOne({ where: { email } });
  if (!user) {
    res.status(401);
    throw new Error('Invalid Credentials');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    res.status(401);
    throw new Error('Invalid Credentials');
  }

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await Token.create({
    userId: user.id,
    token: await bcrypt.hash(refreshToken, 10),
    expiresAt
  });

  res.cookie('jwt', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.status(200).json({ 
    token: accessToken, 
    user: { id: user.id, username: user.username, email: user.email, profilePic: user.profilePic },
    message: 'Login successful. Last seen just now.'
  });
});

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Public
exports.refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.jwt;

  if (!refreshToken) {
    res.status(401);
    throw new Error('Not authorized, no refresh token');
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    res.status(401);
    throw new Error('Not authorized, token failed');
  }

  const user = await User.findByPk(decoded.id);
  if (!user) {
    res.status(401);
    throw new Error('User not found');
  }

  const dbTokens = await Token.findAll({ where: { userId: user.id } });
  let isValidToken = false;
  
  for (let t of dbTokens) {
    if (new Date() > new Date(t.expiresAt)) {
      await t.destroy();
      continue;
    }
    const match = await bcrypt.compare(refreshToken, t.token);
    if (match) {
      isValidToken = true;
      break;
    }
  }

  if (!isValidToken) {
    res.status(401);
    throw new Error('Invalid refresh token');
  }

  const newAccessToken = generateAccessToken(user.id);
  res.json({ token: newAccessToken });
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Public
exports.logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.jwt;
  
  if (refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const dbTokens = await Token.findAll({ where: { userId: decoded.id } });
      
      for (let t of dbTokens) {
        const match = await bcrypt.compare(refreshToken, t.token);
        if (match) {
          await t.destroy();
        }
      }
    } catch (err) {}
  }

  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0)
  });

  res.status(200).json({ message: 'Logged out successfully' });
});

// @desc    Forgot Password (Send OTP)
// @route   POST /api/auth/forgotpassword
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    res.status(400);
    throw new Error('Email is required');
  }

  const user = await User.findOne({ where: { email } });
  if (!user) {
    res.status(404);
    throw new Error('There is no user with that email');
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  const salt = await bcrypt.genSalt(10);
  const otpHash = await bcrypt.hash(otp, salt);

  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10);

  await PasswordReset.destroy({ where: { email } });
  
  await PasswordReset.create({
    email,
    otpHash,
    expiresAt
  });

  const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please use this OTP to reset your password: \n\n ${otp} \n\n It expires in 10 minutes.`;

  try {
    await sendMail({
      email: user.email,
      subject: 'Loopline Password Reset OTP',
      message
    });

    res.status(200).json({ success: true, message: 'OTP sent to email' });
  } catch (err) {
    await PasswordReset.destroy({ where: { email } });
    res.status(500);
    throw new Error('Email could not be sent');
  }
});

// @desc    Verify OTP and return Reset Token
// @route   POST /api/auth/verifyotp
// @access  Public
exports.verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    res.status(400);
    throw new Error('Email and OTP are required');
  }

  const pwdReset = await PasswordReset.findOne({ where: { email } });
  if (!pwdReset) {
    res.status(400);
    throw new Error('Invalid or expired OTP');
  }

  if (new Date() > new Date(pwdReset.expiresAt)) {
    await pwdReset.destroy();
    res.status(400);
    throw new Error('OTP has expired');
  }

  const isMatch = await bcrypt.compare(otp, pwdReset.otpHash);
  if (!isMatch) {
    res.status(400);
    throw new Error('Invalid OTP');
  }

  const resetToken = crypto.randomBytes(20).toString('hex');
  const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

  pwdReset.resetToken = resetTokenHash;
  await pwdReset.save();

  res.status(200).json({ success: true, resetToken });
});

// @desc    Reset Password
// @route   PUT /api/auth/resetpassword
// @access  Public
exports.resetPassword = asyncHandler(async (req, res) => {
  const { email, resetToken, password } = req.body;

  if (!email || !resetToken || !password) {
    res.status(400);
    throw new Error('Email, reset token, and new password are required');
  }

  const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

  const pwdReset = await PasswordReset.findOne({ where: { email, resetToken: resetTokenHash } });
  if (!pwdReset) {
    res.status(400);
    throw new Error('Invalid or expired reset token');
  }



  const user = await User.findOne({ where: { email } });
  
  const salt = await bcrypt.genSalt(12);
  user.password = await bcrypt.hash(password, salt);
  await user.save();

  await Token.destroy({ where: { userId: user.id } });
  await pwdReset.destroy();

  res.status(200).json({ success: true, message: 'Password updated successfully. Please login with new password.' });
});

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id, {
    attributes: { exclude: ['password'] }
  });
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.json(user);
});
