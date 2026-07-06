// controllers/authController.js
// Handles staff login, registration, and TOTP Multi-Factor Authentication (MFA)

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const pool = require('../db/db');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_change_me_in_production';

/**
 * Register a new staff user (Admin only or seed script)
 * POST /api/auth/register
 */
exports.register = async (req, res, next) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required.' });
        }

        const normalizedUser = username.trim().toLowerCase();

        // Check if username already exists
        const checkUser = await pool('users').select('username').where({ username: normalizedUser }).first();
        if (checkUser) {
            return res.status(400).json({ error: 'Username is already taken.' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Insert into database
        await pool('users').insert({
            username: normalizedUser,
            password_hash: passwordHash
        });

        return res.status(201).json({ message: 'User registered successfully.' });
    } catch (err) {
        console.error('💥 Registration error:', err);
        next(err);
    }
};

/**
 * Stage 1 Login: Check password and challenge for MFA
 * POST /api/auth/login
 */
exports.login = async (req, res, next) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required.' });
        }

        const normalizedUser = username.trim().toLowerCase();

        // Retrieve user
        const user = await pool('users').where({ username: normalizedUser }).first();
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        // Verify password
        const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordCorrect) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        // If MFA is not enabled yet, initiate TOTP secret setup
        if (!user.mfa_enabled) {
            const secret = speakeasy.generateSecret({
                name: `Mama Oliech Restaurant (${normalizedUser})`
            });

            // Generate QR Code URI
            const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

            // Generate a short-lived temp token containing the username and mfaSecret
            const tempToken = jwt.sign(
                { username: normalizedUser, mfaSecret: secret.base32, temp: true },
                JWT_SECRET,
                { expiresIn: '5m' }
            );

            return res.status(200).json({
                status: 'mfa_setup',
                qrCode: qrCodeUrl,
                secret: secret.base32,
                tempToken: tempToken
            });
        }

        // If MFA is already enabled, request verification challenge code
        const tempToken = jwt.sign(
            { username: normalizedUser, temp: true },
            JWT_SECRET,
            { expiresIn: '5m' }
        );

        return res.status(200).json({
            status: 'mfa_required',
            tempToken: tempToken
        });

    } catch (err) {
        console.error('💥 Login error:', err);
        next(err);
    }
};

/**
 * Stage 2 Login: Verify MFA Code and generate JWT session
 * POST /api/auth/mfa/verify
 */
exports.verifyMfa = async (req, res, next) => {
    try {
        const { tempToken, code } = req.body;

        if (!tempToken || !code) {
            return res.status(400).json({ error: 'Temporary token and MFA code are required.' });
        }

        // Verify temp token
        let decoded;
        try {
            decoded = jwt.verify(tempToken, JWT_SECRET);
        } catch (e) {
            return res.status(401).json({ error: 'Session expired. Please log in again.' });
        }

        if (!decoded.temp) {
            return res.status(401).json({ error: 'Invalid authentication token.' });
        }

        // Fetch user
        const user = await pool('users').where({ username: decoded.username }).first();
        if (!user) {
            return res.status(401).json({ error: 'User not found.' });
        }

        let secretToVerify = user.mfa_secret;

        // If user hasn't enabled MFA yet, get the secret from the tempToken
        const isSetup = !user.mfa_enabled;
        if (isSetup) {
            secretToVerify = decoded.mfaSecret;
        }

        if (!secretToVerify) {
            return res.status(400).json({ error: 'MFA setup not initialized.' });
        }

        // Verify TOTP token
        const verified = speakeasy.totp.verify({
            secret: secretToVerify,
            encoding: 'base32',
            token: code.trim(),
            window: 1 // Allow 30 seconds clock drift either way
        });

        if (!verified) {
            return res.status(400).json({ error: 'Invalid rolling code. Please try again.' });
        }

        // If this was MFA setup, save secret and enable MFA in DB
        if (isSetup) {
            await pool('users')
                .where({ username: user.username })
                .update({
                    mfa_secret: secretToVerify,
                    mfa_enabled: true
                });
        }

        // Create the final session token (valid for 7 days)
        const finalToken = jwt.sign(
            { username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.status(200).json({
            status: 'success',
            token: finalToken,
            username: user.username
        });

    } catch (err) {
        console.error('💥 MFA verification error:', err);
        next(err);
    }
};
