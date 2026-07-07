// middleware/customerAuth.js
// Validates a customer's JWT session token (separate from the staff auth
// middleware, so a customer token can never be used to access staff-only
// routes, and vice versa).

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_change_me_in_production';

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded.customerId) {
            return res.status(401).json({ error: 'Unauthorized: Not a valid customer session.' });
        }
        req.customer = decoded; // { customerId, email }
        next();
    } catch (err) {
        console.warn('⚠️ Customer JWT verification failed:', err.message);
        return res.status(401).json({ error: 'Unauthorized: Invalid or expired session.' });
    }
};

/**
 * Optional variant — used on public routes (checkout, reservations) that
 * should still work for guests, but attach the customer's identity when
 * they happen to be logged in. Never rejects the request.
 */
module.exports.optional = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            if (decoded.customerId) {
                req.customer = decoded;
            }
        } catch (err) {
            // Invalid/expired token on an optional route — just proceed as guest
        }
    }

    next();
};
