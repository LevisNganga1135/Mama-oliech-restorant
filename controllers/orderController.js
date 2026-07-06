// controllers/orderController.js
// Handles CRUD operations for food and room service orders (for staff dashboard)

const pool = require('../db/db');

/**
 * Retrieve all orders
 * GET /api/orders
 */
exports.getAllOrders = async (req, res, next) => {
    try {
        const rows = await pool('orders').orderBy('created_at', 'desc');
        return res.status(200).json(rows);
    } catch (err) {
        console.error('💥 Error fetching orders:', err);
        next(err);
    }
};

/**
 * Update an order's status
 * PUT /api/orders/:id
 */
exports.updateOrderStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['Pending', 'Confirmed', 'Cooking', 'Dispatched', 'Completed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: `Invalid status: ${status}. Must be one of ${validStatuses.join(', ')}` });
        }

        const existing = await pool('orders').where({ id }).first();
        if (!existing) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        await pool('orders')
            .where({ id })
            .update({
                status,
                updated_at: pool.fn.now()
            });

        const updated = await pool('orders').where({ id }).first();

        return res.status(200).json({
            message: 'Order status updated successfully.',
            order: updated
        });
    } catch (err) {
        console.error('💥 Error updating order status:', err);
        next(err);
    }
};

/**
 * Delete an order
 * DELETE /api/orders/:id
 */
exports.deleteOrder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const existing = await pool('orders').where({ id }).first();

        if (!existing) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        await pool('orders').where({ id }).del();

        return res.status(200).json({
            message: 'Order deleted successfully.',
            order: existing
        });
    } catch (err) {
        console.error('💥 Error deleting order:', err);
        next(err);
    }
};
