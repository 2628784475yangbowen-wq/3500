const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const authService = require('../services/authService');

const router = express.Router();

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    const result = await authService.login({ email, password });
    res.json({
      message: 'Login successful',
      token: result.token,
      user: result.user
    });
  })
);

router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out. Client should discard the token.' });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
