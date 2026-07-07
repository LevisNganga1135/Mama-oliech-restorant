// controllers/paymentController.js
// Handles M-Pesa payment actions (initiation, webhook callbacks, status polling)

const pool = require('../db/db');
const mpesaService = require('../services/mpesaService');

/**
 * Initiate M-Pesa STK Push Payment
 * Saves order state as Pending in the DB and maps request IDs
 */
exports.initiateMpesaPayment = async (req, res, next) => {
    try {
        const { 
            name, phone, mpesaPhone, items, total, instructions,
            orderType, deliveryAddress, deliveryArea, tableNumber, pickupTime, room 
        } = req.body;

        // Validation
        if (!name || !phone || !mpesaPhone || !items || !total) {
            return res.status(400).json({ error: 'Missing core checkout details or order items.' });
        }

        // Context-specific validation
        if (orderType === 'delivery' && !deliveryAddress) {
            return res.status(400).json({ error: 'Delivery address is required for delivery orders.' });
        }
        if (orderType === 'takeaway' && !pickupTime) {
            return res.status(400).json({ error: 'Pickup time is required for takeaway orders.' });
        }
        if (orderType === 'room_service' && !room) {
            return res.status(400).json({ error: 'Room number is required for room service orders.' });
        }
        if (orderType === 'dine_in' && !tableNumber) {
            return res.status(400).json({ error: 'Table number is required for dine-in orders.' });
        }

        const orderId = 'MO-' + Math.floor(100000 + Math.random() * 900000);

        // 1. Set dynamic account reference for M-Pesa STK display
        let accountRef = 'Mama Oliech';
        if (orderType === 'room_service') accountRef = `Room ${room}`;
        else if (orderType === 'dine_in') accountRef = `Table ${tableNumber}`;
        else if (orderType === 'delivery') accountRef = `Deliv ${orderId.split('-')[1]}`;
        else if (orderType === 'takeaway') accountRef = `Takeaway`;

        // 2. Call Safaricom STK Push API
        const mpesaResult = await mpesaService.initiateStkPush(
            mpesaPhone,
            total,
            accountRef,
            `Order ${orderId}`
        );

        if (mpesaResult.ResponseCode !== '0') {
            return res.status(500).json({ error: 'Safaricom M-Pesa STK Push request was rejected.' });
        }

        // 3. Perform DB insert inside a transaction using Knex
        await pool.transaction(async trx => {
            // Insert order as Pending with expanded columns
            await trx('orders').insert({
                id: orderId,
                guest_name: name.trim(),
                room_number: orderType === 'room_service' ? room.trim() : null,
                phone_number: phone.trim(),
                order_type: orderType || 'delivery',
                delivery_address: orderType === 'delivery' ? deliveryAddress.trim() : null,
                delivery_area: orderType === 'delivery' ? (deliveryArea || 'kilimani').trim() : null,
                table_number: orderType === 'dine_in' ? tableNumber.trim() : null,
                pickup_time: orderType === 'takeaway' ? pickupTime : null,
                payment_method: 'card_online',
                payment_detail: 'M-Pesa Express (Pending)',
                special_instructions: instructions || '',
                items: JSON.stringify(items),
                total_price: parseFloat(total),
                status: 'Pending',
                customer_id: req.customer ? req.customer.customerId : null
            });

            // Record M-Pesa Request mapping
            await trx('mpesa_transactions').insert({
                checkout_request_id: mpesaResult.CheckoutRequestID,
                order_id: orderId,
                status: 'Pending'
            });
        });

        return res.status(200).json({
            message: 'STK Push initiated successfully.',
            orderId: orderId,
            checkoutRequestId: mpesaResult.CheckoutRequestID
        });

    } catch (err) {
        console.error('💥 Error during STK push initiation transaction:', err);
        next(err);
    }
};

/**
 * M-Pesa Webhook Callback Handler
 * Invoked asynchronously by Safaricom when transaction completes (success/failure)
 */
exports.handleMpesaCallback = async (req, res) => {
    try {
        // Validate secret query parameter
        const secret = req.query.secret;
        const expectedSecret = process.env.MPESA_CALLBACK_SECRET;
        if (!expectedSecret || secret !== expectedSecret) {
            console.warn('🔒 Unauthorized M-Pesa callback attempt detected!');
            return res.status(401).send('Unauthorized');
        }

        const { Body } = req.body;
        if (!Body || !Body.stkCallback) {
            console.warn('⚠️ Received invalid M-Pesa callback body structure');
            return res.status(400).send('Invalid callback structure');
        }

        const callback = Body.stkCallback;
        const checkoutRequestId = callback.CheckoutRequestID;
        const resultCode = callback.ResultCode; // 0 represents success
        const resultDesc = callback.ResultDesc;

        console.log(`📞 Safaricom Webhook callback received for CheckoutRequestId: ${checkoutRequestId} (Code: ${resultCode})`);

        // Check if transaction exists in our mapping logs
        const txn = await pool('mpesa_transactions').where({ checkout_request_id: checkoutRequestId }).first();

        if (!txn) {
            console.warn(`⚠️ Transaction not mapped to any order: ${checkoutRequestId}`);
            return res.status(200).send('Transaction mapping not found'); // Respond 200 to Safaricom anyway
        }

        const orderId = txn.order_id;

        if (resultCode === 0) {
            // Transaction succeeded
            const metadata = callback.CallbackMetadata?.Item || [];
            const receipt = metadata.find(item => item.Name === 'MpesaReceiptNumber')?.Value || 'N/A';
            const amount = metadata.find(item => item.Name === 'Amount')?.Value;
            const phone = metadata.find(item => item.Name === 'PhoneNumber')?.Value;

            await pool.transaction(async trx => {
                // 1. Update Order status to Confirmed (Paid)
                await trx('orders')
                    .where({ id: orderId })
                    .update({
                        status: 'Confirmed',
                        payment_detail: `M-Pesa Paid (Receipt: ${receipt})`,
                        updated_at: pool.fn.now()
                    });

                // 2. Update Transaction record log
                await trx('mpesa_transactions')
                    .where({ checkout_request_id: checkoutRequestId })
                    .update({
                        status: 'Completed',
                        receipt_number: receipt,
                        payment_amount: amount ? parseFloat(amount) : null,
                        sender_phone: phone ? String(phone) : null,
                        updated_at: pool.fn.now()
                    });
            });

            console.log(`🎉 M-Pesa Payment Succeeded! Order: ${orderId}, Receipt: ${receipt}, Amount: KES ${amount}`);
        } else {
            // Transaction failed
            await pool.transaction(async trx => {
                await trx('orders')
                    .where({ id: orderId })
                    .update({
                        status: 'Pending',
                        payment_detail: `M-Pesa Failed (${resultDesc})`,
                        updated_at: pool.fn.now()
                    });

                await trx('mpesa_transactions')
                    .where({ checkout_request_id: checkoutRequestId })
                    .update({
                        status: 'Failed',
                        error_description: resultDesc,
                        updated_at: pool.fn.now()
                    });
            });

            console.log(`❌ M-Pesa Payment Failed! Order: ${orderId}, Code: ${resultCode}, Reason: ${resultDesc}`);
        }

        // Return a 200 response to Safaricom to acknowledge delivery
        return res.status(200).json({ status: 'Callback acknowledged' });

    } catch (err) {
        console.error('💥 Error processing Safaricom Webhook Callback:', err);
        return res.status(500).send('Internal Server Error inside Callback Handler');
    }
};

/**
 * Check Order Status
 * Utilized by frontend client to poll order status during checkout screen
 */
exports.checkOrderStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const order = await pool('orders').select('status', 'payment_detail').where({ id }).first();

        if (!order) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        return res.status(200).json(order);
    } catch (err) {
        next(err);
    }
};

/**
 * Create Direct Order (Offline / Cash / Room Charge)
 * Directly inserts the order into the DB without calling M-Pesa STK Push
 */
exports.createDirectOrder = async (req, res, next) => {
    try {
        const { 
            name, phone, items, total, instructions,
            orderType, deliveryAddress, deliveryArea, tableNumber, pickupTime, room,
            paymentMethod, paymentDetail
        } = req.body;

        if (!name || !phone || !items || !total || !paymentMethod) {
            return res.status(400).json({ error: 'Missing core checkout details, payment method, or order items.' });
        }

        // Context-specific validation
        if (orderType === 'delivery' && !deliveryAddress) {
            return res.status(400).json({ error: 'Delivery address is required for delivery orders.' });
        }
        if (orderType === 'takeaway' && !pickupTime) {
            return res.status(400).json({ error: 'Pickup time is required for takeaway orders.' });
        }
        if (orderType === 'room_service' && !room) {
            return res.status(400).json({ error: 'Room number is required for room service orders.' });
        }
        if (orderType === 'dine_in' && !tableNumber) {
            return res.status(400).json({ error: 'Table number is required for dine-in orders.' });
        }

        const orderId = 'MO-' + Math.floor(100000 + Math.random() * 900000);

        const orderData = {
            id: orderId,
            guest_name: name.trim(),
            room_number: orderType === 'room_service' ? room.trim() : null,
            phone_number: phone.trim(),
            order_type: orderType || 'delivery',
            delivery_address: orderType === 'delivery' ? deliveryAddress.trim() : null,
            delivery_area: orderType === 'delivery' ? (deliveryArea || 'kilimani').trim() : null,
            table_number: orderType === 'dine_in' ? tableNumber.trim() : null,
            pickup_time: orderType === 'takeaway' ? pickupTime : null,
            payment_method: paymentMethod,
            payment_detail: paymentDetail || 'Offline Payment',
            special_instructions: instructions || '',
            items: JSON.stringify(items),
            total_price: parseFloat(total),
            status: paymentMethod === 'room_charge' ? 'Confirmed' : 'Pending',
            customer_id: req.customer ? req.customer.customerId : null
        };

        await pool('orders').insert(orderData);
        const newOrder = await pool('orders').where({ id: orderId }).first();

        return res.status(201).json({
            message: 'Order created successfully.',
            order: newOrder
        });

    } catch (err) {
        console.error('💥 Error creating direct offline order:', err);
        next(err);
    }
};

