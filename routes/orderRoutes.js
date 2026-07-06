// routes/orderRoutes.js
// Routing definitions for staff food orders management APIs

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../middleware/auth');

// 1. Get all orders (Admin)
router.get('/', auth, orderController.getAllOrders);

// 2. Update order status (Admin)
router.put('/:id', auth, orderController.updateOrderStatus);

// 3. Delete order (Admin)
router.delete('/:id', auth, orderController.deleteOrder);

module.exports = router;
