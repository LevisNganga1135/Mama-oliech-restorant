// routes/customerRoutes.js
// Routing for customer account registration, login, and profile/history

const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const customerAuth = require('../middleware/customerAuth');

// 1. Register a new customer account (Public)
router.post('/register', customerController.register);

// 2. Customer login (Public)
router.post('/login', customerController.login);

// 3. Get own profile (Customer only)
router.get('/me', customerAuth, customerController.getProfile);

// 4. Get own order history (Customer only)
router.get('/orders', customerAuth, customerController.getMyOrders);

// 5. Get own reservation history (Customer only)
router.get('/reservations', customerAuth, customerController.getMyReservations);

module.exports = router;
