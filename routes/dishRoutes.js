// routes/dishRoutes.js
// API routing for the dishes menu catalog

const express = require('express');
const router = express.Router();
const dishController = require('../controllers/dishController');
const auth = require('../middleware/auth');

// 1. Get all dishes (Public)
router.get('/', dishController.getAllDishes);

// 2. Create new dish (Admin)
router.post('/', auth, dishController.createDish);

// 3. Update existing dish (Admin)
router.put('/:id', auth, dishController.updateDish);

// 4. Delete dish (Admin)
router.delete('/:id', auth, dishController.deleteDish);

module.exports = router;
