// controllers/customerController.js
// Handles customer account registration, login, profile, and order/
// reservation history. Kept separate from authController.js, which is
// staff-only (username/password + MFA).

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db/db');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_change_me_in_production';

/**
 * Register a new customer account
 * POST /api/customers/register
 */
exports.register = async (req, res, next) => {
    try {
        const { name, email, phone, password } = req.body;

        if (!name || !email || !phone || !password) {
            return res.status(400).json({ error: 'Name, email, phone, and password are all required.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existing = await pool('customers').where({ email: normalizedEmail }).first();
        if (existing) {
            return res.status(400).json({ error: 'An account with this email already exists.' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const [customerId] = await pool('customers').insert({
            name: name.trim(),
            email: normalizedEmail,
            phone: phone.trim(),
            password_hash: passwordHash
        });

        const token = jwt.sign(
            { customerId, email: normalizedEmail },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        return res.status(201).json({
            message: 'Account created successfully.',
            token,
            customer: { id: customerId, name: name.trim(), email: normalizedEmail, phone: phone.trim() }
        });
    } catch (err) {
        console.error('💥 Customer registration error:', err);
        next(err);
    }
};

/**
 * Customer login
 * POST /api/customers/login
 */
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const customer = await pool('customers').where({ email: normalizedEmail }).first();
        if (!customer) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const isPasswordCorrect = await bcrypt.compare(password, customer.password_hash);
        if (!isPasswordCorrect) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const token = jwt.sign(
            { customerId: customer.id, email: customer.email },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        return res.status(200).json({
            message: 'Login successful.',
            token,
            customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone }
        });
    } catch (err) {
        console.error('💥 Customer login error:', err);
        next(err);
    }
};

/**
 * Get the logged-in customer's own profile
 * GET /api/customers/me
 */
exports.getProfile = async (req, res, next) => {
    try {
        const customer = await pool('customers')
            .select('id', 'name', 'email', 'phone', 'created_at')
            .where({ id: req.customer.customerId })
            .first();

        if (!customer) {
            return res.status(404).json({ error: 'Customer account not found.' });
        }

        return res.status(200).json(customer);
    } catch (err) {
        next(err);
    }
};

/**
 * Get the logged-in customer's order history
 * GET /api/customers/orders
 */
exports.getMyOrders = async (req, res, next) => {
    try {
        const orders = await pool('orders')
            .where({ customer_id: req.customer.customerId })
            .orderBy('created_at', 'desc');

        return res.status(200).json(orders);
    } catch (err) {
        next(err);
    }
};

/**
 * Get the logged-in customer's reservation history
 * GET /api/customers/reservations
 */
exports.getMyReservations = async (req, res, next) => {
    try {
        const reservations = await pool('reservations')
            .where({ customer_id: req.customer.customerId })
            .orderBy('created_at', 'desc');

        return res.status(200).json(reservations);
    } catch (err) {
        next(err);
    }
};
