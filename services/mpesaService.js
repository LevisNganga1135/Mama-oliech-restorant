// services/mpesaService.js
// Handles M-Pesa API OAuth Token Generation & Lipa Na M-Pesa STK Push Requests

const axios = require('axios');

let cachedToken = null;
let tokenExpiry = null;

class MpesaService {
    constructor() {
        this.consumerKey = process.env.MPESA_CONSUMER_KEY;
        this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
        this.shortCode = process.env.MPESA_SHORTCODE || '174379'; // Default Lipa Na M-Pesa Sandbox shortcode
        this.passkey = process.env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919'; // Sandbox passkey
        this.baseUrl = process.env.MPESA_ENV === 'production' 
            ? 'https://api.safaricom.co.ke' 
            : 'https://sandbox.safaricom.co.ke';
        
        const baseUrl = process.env.MPESA_CALLBACK_URL;
        const secret = process.env.MPESA_CALLBACK_SECRET;
        if (baseUrl && secret) {
            try {
                const urlObj = new URL(baseUrl);
                urlObj.searchParams.set('secret', secret);
                this.callbackUrl = urlObj.toString();
            } catch (e) {
                console.warn('⚠️ Invalid MPESA_CALLBACK_URL, using raw value:', e.message);
                this.callbackUrl = baseUrl;
            }
        } else {
            this.callbackUrl = baseUrl;
        }
    }

    /**
     * Generate Safaricom Access Token (OAuth 2.0)
     * @returns {Promise<string>} Bearer Access Token
     */
    async getAccessToken() {
        // Check if token is already cached and still valid
        if (cachedToken && Date.now() < tokenExpiry) {
            return cachedToken;
        }

        if (!this.consumerKey || !this.consumerSecret) {
            throw new Error('M-Pesa Consumer Key or Consumer Secret is not configured in .env');
        }

        const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
        try {
            const response = await axios.get(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
                headers: { Authorization: `Basic ${auth}` }
            });
            
            const { access_token, expires_in } = response.data;
            
            cachedToken = access_token;
            // Set token expiry timestamp in milliseconds, subtracting a 60s buffer for clock drift/latency
            const bufferMs = 60 * 1000;
            tokenExpiry = Date.now() + parseInt(expires_in, 10) * 1000 - bufferMs;

            return access_token;
        } catch (error) {
            console.error('💥 Failed to generate M-Pesa OAuth access token:', error.response ? error.response.data : error.message);
            throw new Error('M-Pesa Authorization failed.');
        }
    }

    /**
     * Trigger Lipa Na M-Pesa Online (STK Push)
     * @param {string} phoneNumber Phone number to push prompt to (e.g. 0712345678 or 254712345678)
     * @param {number} amount Payment amount (KES)
     * @param {string} accountRef Short reference (e.g., "Room 302")
     * @param {string} transactionDesc Description of transaction (e.g., "Order MO-123456")
     */
    async initiateStkPush(phoneNumber, amount, accountRef, transactionDesc) {
        const accessToken = await this.getAccessToken();

        // Generate Timestamp in YYYYMMDDHHmmss format
        const date = new Date();
        const timestamp = date.getFullYear() +
            String(date.getMonth() + 1).padStart(2, '0') +
            String(date.getDate()).padStart(2, '0') +
            String(date.getHours()).padStart(2, '0') +
            String(date.getMinutes()).padStart(2, '0') +
            String(date.getSeconds()).padStart(2, '0');

        // Generate Password: Base64(ShortCode + Passkey + Timestamp)
        const password = Buffer.from(`${this.shortCode}${this.passkey}${timestamp}`).toString('base64');

        // Format phone number to Safaricom standard: 2547XXXXXXXX or 2541XXXXXXXX
        let formattedPhone = phoneNumber.trim().replace(/[\s-()+]/g, '');
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '254' + formattedPhone.slice(1);
        } else if (formattedPhone.startsWith('+254')) {
            formattedPhone = formattedPhone.slice(1);
        }

        const payload = {
            BusinessShortCode: this.shortCode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: Math.round(amount),
            PartyA: formattedPhone,
            PartyB: this.shortCode,
            PhoneNumber: formattedPhone,
            CallBackURL: this.callbackUrl,
            AccountReference: accountRef.substring(0, 12),
            TransactionDesc: transactionDesc.substring(0, 20)
        };

        try {
            const response = await axios.post(`${this.baseUrl}/mpesa/stkpush/v1/processrequest`, payload, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            return response.data;
        } catch (error) {
            console.error('💥 M-Pesa STK Push API call failed:', error.response ? error.response.data : error.message);
            throw new Error(error.response ? error.response.data.errorMessage : 'Safaricom connection failure.');
        }
    }
}

module.exports = new MpesaService();
