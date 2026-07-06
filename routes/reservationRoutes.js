// routes/reservationRoutes.js
// API routing for table reservations

const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const auth = require('../middleware/auth');

// 1. Create reservation (Public)
router.post('/', reservationController.createReservation);

// 2. Get all reservations (Admin)
router.get('/', auth, reservationController.getAllReservations);

// 3. Update reservation (status / details) (Admin)
router.put('/:id', auth, reservationController.updateReservation);

// 4. Delete reservation (Admin)
router.delete('/:id', auth, reservationController.deleteReservation);

module.exports = router;
