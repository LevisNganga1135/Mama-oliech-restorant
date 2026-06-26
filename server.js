/**
 * server.js — Mama Oliech Restaurant M-Pesa Backend
 *
 * Endpoints:
 *   POST /api/mpesa/stkpush   — Initiates STK Push to customer's phone
 *   POST /api/mpesa/callback  — Receives Safaricom payment result
 *   GET  /api/mpesa/status/:checkoutId — Frontend polls this for result
 *
 * Run:  node server.js
 * Port: 3000  (change PORT below if needed)
 */

'use strict';

const express  = require('express');
const cors     = require('cors');
const axios    = require('axios');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

/* ─── SERVE YOUR STATIC FRONTEND FILES ─────────────────────────────────────
   Place server.js in the same folder as your index.html / menu.html etc.
   Express will serve them automatically on http://localhost:3000
─────────────────────────────────────────────────────────────────────────── */
app.use(express.static('.'));

/* ─── CONFIG (loaded from .env) ─────────────────────────────────────────────
   Create a .env file in the same folder — see the guide for what to put in it.
─────────────────────────────────────────────────────────────────────────── */
const {
    MPESA_CONSUMER_KEY,
    MPESA_CONSUMER_SECRET,
    MPESA_SHORTCODE,      // 174379 for sandbox
    MPESA_PASSKEY,        // from Daraja sandbox dashboard
    MPESA_CALLBACK_URL,   // e.g. https://your-ngrok-url.ngrok.io/api/mpesa/callback
} = process.env;

/* ─── IN-MEMORY PAYMENT STATUS STORE ───────────────────────────────────────
   Maps CheckoutRequestID → { status, amount, phone, resultDesc }
   In production you'd use a database, but this works perfectly for sandbox.
─────────────────────────────────────────────────────────────────────────── */
const paymentStore = new Map();

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER: Get M-Pesa OAuth Access Token
   Daraja requires a fresh token for every STK Push request.
   Token lasts ~1 hour, but we fetch fresh each time for simplicity.
═══════════════════════════════════════════════════════════════════════════ */
async function getMpesaToken() {
    // Combine key:secret and base64-encode it — Daraja's auth mechanism.
    const credentials = Buffer.from(
        `${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`
    ).toString('base64');

    const response = await axios.get(
        'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
        {
            headers: {
                Authorization: `Basic ${credentials}`,
            },
        }
    );

    return response.data.access_token;
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER: Generate M-Pesa Password
   password = Base64( Shortcode + Passkey + Timestamp )
   Timestamp format: YYYYMMDDHHmmss
═══════════════════════════════════════════════════════════════════════════ */
function getMpesaPassword() {
    const timestamp = new Date()
        .toISOString()
        .replace(/[-:T.Z]/g, '')   // Remove dashes, colons, T, dot, Z
        .slice(0, 14);             // Keep only YYYYMMDDHHmmss (14 chars)

    const raw = `${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`;
    const password = Buffer.from(raw).toString('base64');

    return { password, timestamp };
}

/* ═══════════════════════════════════════════════════════════════════════════
   ENDPOINT: POST /api/mpesa/stkpush
   Body: { phone: "2547XXXXXXXX", amount: 1200, orderId: "ORD-123", description: "..." }
   Returns: { success: true, checkoutRequestId: "..." }
═══════════════════════════════════════════════════════════════════════════ */
app.post('/api/mpesa/stkpush', async (req, res) => {
    try {
        const { phone, amount, orderId, description } = req.body;

        // ── Basic validation ────────────────────────────────────────────────
        if (!phone || !amount) {
            return res.status(400).json({
                success: false,
                message: 'Phone and amount are required.',
            });
        }

        // Normalise phone: strip leading 0 or + and ensure it starts with 254.
        const normalised = phone
            .toString()
            .replace(/\s+/g, '')        // remove spaces
            .replace(/^\+/, '')         // remove leading +
            .replace(/^0/, '254');      // replace leading 0 with 254

        if (!/^2547\d{8}$/.test(normalised)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid Safaricom number (07XXXXXXXX or 2547XXXXXXXX).',
            });
        }

        // ── Get auth token ──────────────────────────────────────────────────
        const token = await getMpesaToken();
        const { password, timestamp } = getMpesaPassword();

        // ── Send STK Push request to Daraja ─────────────────────────────────
        const stkResponse = await axios.post(
            'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            {
                BusinessShortCode: MPESA_SHORTCODE,
                Password:          password,
                Timestamp:         timestamp,
                TransactionType:   'CustomerPayBillOnline',
                Amount:            Math.ceil(Number(amount)), // must be a whole number
                PartyA:            normalised,                // customer phone
                PartyB:            MPESA_SHORTCODE,           // your shortcode
                PhoneNumber:       normalised,                // phone to prompt
                CallBackURL:       MPESA_CALLBACK_URL,
                AccountReference:  orderId || 'MamaOliech',
                TransactionDesc:   description || 'Food Order Payment',
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const { CheckoutRequestID, ResponseCode, ResponseDescription } = stkResponse.data;

        if (ResponseCode !== '0') {
            // Daraja returned an error code.
            return res.status(502).json({
                success: false,
                message: ResponseDescription || 'STK Push failed. Try again.',
            });
        }

        // ── Store initial "pending" status so frontend can poll ──────────────
        paymentStore.set(CheckoutRequestID, {
            status:     'pending',
            phone:      normalised,
            amount:     amount,
            orderId:    orderId,
            resultDesc: null,
        });

        return res.json({
            success:           true,
            checkoutRequestId: CheckoutRequestID,
            message:           'STK Push sent. Ask the customer to check their phone.',
        });

    } catch (err) {
        console.error('[STK Push error]', err?.response?.data || err.message);
        return res.status(500).json({
            success: false,
            message: 'Server error. Check your credentials and try again.',
            detail:  err?.response?.data || err.message,
        });
    }
});

/* ═══════════════════════════════════════════════════════════════════════════
   ENDPOINT: POST /api/mpesa/callback
   Safaricom calls this URL after the customer enters their PIN.
   We parse the result and update our in-memory store.
═══════════════════════════════════════════════════════════════════════════ */
app.post('/api/mpesa/callback', (req, res) => {
    try {
        const body = req.body?.Body?.stkCallback;

        if (!body) {
            console.warn('[Callback] Unexpected payload shape:', JSON.stringify(req.body));
            return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
        }

        const {
            CheckoutRequestID,
            ResultCode,
            ResultDesc,
            CallbackMetadata,
        } = body;

        console.log(`[Callback] ${CheckoutRequestID} → ResultCode ${ResultCode}: ${ResultDesc}`);

        if (ResultCode === 0) {
            // Payment succeeded — extract metadata items.
            const items = CallbackMetadata?.Item || [];
            const get   = (name) => items.find(i => i.Name === name)?.Value;

            paymentStore.set(CheckoutRequestID, {
                status:      'success',
                amount:      get('Amount'),
                phone:       get('PhoneNumber'),
                mpesaCode:   get('MpesaReceiptNumber'),
                resultDesc:  ResultDesc,
            });
        } else {
            // Payment failed or was cancelled by user.
            paymentStore.set(CheckoutRequestID, {
                status:     'failed',
                resultDesc: ResultDesc,
            });
        }

        // Always respond 200 to Safaricom, or they retry.
        return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

    } catch (err) {
        console.error('[Callback error]', err.message);
        return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }
});

/* ═══════════════════════════════════════════════════════════════════════════
   ENDPOINT: GET /api/mpesa/status/:checkoutId
   Frontend polls this every 3 seconds to know if payment went through.
   Returns: { status: 'pending'|'success'|'failed', mpesaCode, resultDesc }
═══════════════════════════════════════════════════════════════════════════ */
app.get('/api/mpesa/status/:checkoutId', (req, res) => {
    const record = paymentStore.get(req.params.checkoutId);

    if (!record) {
        return res.status(404).json({ status: 'unknown' });
    }

    return res.json(record);
});

/* ─── START ─────────────────────────────────────────────────────────────── */
app.listen(PORT, () => {
    console.log(`\n🐟 Mama Oliech server running on http://localhost:${PORT}`);
    console.log(`   Callback URL configured: ${MPESA_CALLBACK_URL || '⚠ NOT SET — check .env'}\n`);
});