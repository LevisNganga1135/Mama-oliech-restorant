// server.js
// Mama Oliech Restaurant Backend Server Entry Point
// Sets up security middleware, configures CORS, mounts payment APIs, and starts the server

require('dotenv').config();

// Validate JWT_SECRET in production
if (process.env.NODE_ENV === 'production') {
    const defaultSecret = 'super_secret_jwt_key_change_me_in_production';
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === defaultSecret) {
        console.error('❌ Critical Error: JWT_SECRET must be explicitly defined and secure in production.');
        process.exit(1);
    }
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const paymentRoutes = require('./routes/paymentRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const dishRoutes = require('./routes/dishRoutes');
const orderRoutes = require('./routes/orderRoutes');
const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security Hardening Middleware ───────────────────────────────────────────
app.use(helmet()); // Sets protective HTTP headers (e.g. X-Content-Type-Options)

// Configure Cross-Origin Resource Sharing
let allowedOrigins = '*';

if (process.env.NODE_ENV === 'production') {
    if (!process.env.ALLOWED_ORIGINS) {
        console.error('❌ Critical Error: ALLOWED_ORIGINS must be explicitly defined in production.');
        process.exit(1);
    }
    
    allowedOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
    const trustedDomain = 'mama-oliech.vercel.app';
    
    const untrustedOrigins = allowedOrigins.filter(origin => {
        try {
            const url = new URL(origin);
            return url.hostname !== trustedDomain && !url.hostname.endsWith('.' + trustedDomain);
        } catch (e) {
            return true; // Treat invalid URL as untrusted
        }
    });

    if (untrustedOrigins.length > 0) {
        console.error(`❌ Critical Error: ALLOWED_ORIGINS in production must only contain the trusted domain (${trustedDomain}). Untrusted: ${untrustedOrigins.join(', ')}`);
        process.exit(1);
    }
} else if (process.env.ALLOWED_ORIGINS) {
    allowedOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
}

app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser middleware for JSON payloads
app.use(express.json());

// API Request Rate Limiter (Prevent DDOS / Brute-force requests)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: { error: 'Too many requests from this IP. Please try again after 15 minutes.' }
});
app.use('/api/', apiLimiter);

// ── REST API Routes ─────────────────────────────────────────────────────────
app.use('/api/payments', paymentRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/dishes', dishRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);

// Server health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// ── Unified Global Error Handler ────────────────────────────────────────────
app.use(errorHandler);

// Start listening only when executed directly
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Mama Oliech API Server active on http://localhost:${PORT}`);
    });
}

module.exports = app;
// Reload nodemon
