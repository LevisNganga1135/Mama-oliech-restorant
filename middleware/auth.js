// middleware/auth.js
// Validates the JWT session token passed as a Bearer token in the Authorization header

const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header.' });
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET || 'super_secret_jwt_key_change_me_in_production';

    try {
        const decoded = jwt.verify(token, jwtSecret);
        req.user = decoded; // Save decoded user details (e.g. username) to req.user
        next();
    } catch (err) {
        console.warn('⚠️ JWT verification failed:', err.message);
        return res.status(401).json({ error: 'Unauthorized: Invalid or expired token session.' });
    }
};
