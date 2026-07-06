// routes/paymentRoutes.js
// Express API routing definitions for payments and callbacks

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// 1. Initiate M-Pesa STK Push payment
router.post('/stkpush', paymentController.initiateMpesaPayment);

// 2. Safaricom callback URL webhook endpoint (Safaricom Daraja API makes POST request here)
// Note: This endpoint should not require CSRF / session authorization cookies
router.post('/callback', paymentController.handleMpesaCallback);

// 3. Poll order payment/cooking status
router.get('/order/:id/status', paymentController.checkOrderStatus);

// 4. Create direct offline orders (Cash on Delivery, Room Charge)
router.post('/direct-order', paymentController.createDirectOrder);

module.exports = router;
