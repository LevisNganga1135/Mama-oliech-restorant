// routes/authRoutes.js
// Routing for staff authentication and MFA flows

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// 1. Password login check (Stage 1)
router.post('/login', authController.login);

// 2. MFA code verification (Stage 2)
router.post('/mfa/verify', authController.verifyMfa);

// 3. User registration (Admin / Setup only)
router.post('/register', authController.register);

module.exports = router;
