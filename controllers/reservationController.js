// controllers/reservationController.js
// Handles CRUD operations for table reservations

const pool = require('../db/db');

/**
 * Create a new table reservation
 * POST /api/reservations
 */
exports.createReservation = async (req, res, next) => {
    try {
        const { name, phone, size, date, time, requests } = req.body;

        // Validation
        if (!name || !phone || !size || !date || !time) {
            return res.status(400).json({ error: 'Missing required reservation fields (name, phone, size, date, time).' });
        }

        const numGuests = parseInt(size, 10);
        if (isNaN(numGuests) || numGuests < 1 || numGuests > 500) {
            return res.status(400).json({ error: 'Guest count must be between 1 and 500.' });
        }

        // Generate ID matching the BK-<timestamp> format used by frontend
        const id = 'BK-' + Date.now();

        const reservationData = {
            id,
            guest_name: name.trim(),
            phone_number: phone.trim(),
            num_guests: numGuests,
            reservation_date: date,
            reservation_time: time,
            special_requests: (requests || 'None').trim(),
            status: 'pending'
        };

        await pool('reservations').insert(reservationData);
        const newReservation = await pool('reservations').where({ id }).first();

        return res.status(201).json({
            message: 'Reservation created successfully.',
            reservation: newReservation
        });
    } catch (err) {
        console.error('💥 Error creating reservation:', err);
        next(err);
    }
};

/**
 * Retrieve all reservations
 * GET /api/reservations
 */
exports.getAllReservations = async (req, res, next) => {
    try {
        const rows = await pool('reservations').orderBy('created_at', 'desc');

        // Format dates and times to match the structures frontend expects
        const reservations = rows.map(row => {
            // Convert PG date object/string to YYYY-MM-DD
            const d = new Date(row.reservation_date);
            const y = d.getUTCFullYear();
            const m = String(d.getUTCMonth() + 1).padStart(2, '0');
            const day = String(d.getUTCDate()).padStart(2, '0');
            const formattedDate = `${y}-${m}-${day}`;

            // Remove seconds from time (e.g. "19:30:00" -> "19:30")
            const formattedTime = row.reservation_time.substring(0, 5);

            return {
                id: row.id,
                timestamp: row.created_at.toISOString(),
                status: row.status,
                name: row.guest_name,
                phone: row.phone_number,
                size: String(row.num_guests),
                date: formattedDate,
                time: formattedTime,
                requests: row.special_requests
            };
        });

        return res.status(200).json(reservations);
    } catch (err) {
        console.error('💥 Error fetching reservations:', err);
        next(err);
    }
};

/**
 * Update reservation status or details
 * PUT /api/reservations/:id
 */
exports.updateReservation = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, name, phone, size, date, time, requests } = req.body;

        // Check if reservation exists
        const existing = await pool('reservations').where({ id }).first();
        if (!existing) {
            return res.status(404).json({ error: 'Reservation not found.' });
        }

        // Format new values if provided, otherwise keep existing
        const newStatus = status || existing.status;
        const newName = name !== undefined ? name.trim() : existing.guest_name;
        const newPhone = phone !== undefined ? phone.trim() : existing.phone_number;
        const newSize = size !== undefined ? parseInt(size, 10) : existing.num_guests;
        const newDate = date || existing.reservation_date;
        const newTime = time || existing.reservation_time;
        const newRequests = requests !== undefined ? requests.trim() : existing.special_requests;

        // Validate size
        if (isNaN(newSize) || newSize < 1 || newSize > 500) {
            return res.status(400).json({ error: 'Guest count must be between 1 and 500.' });
        }

        await pool('reservations')
            .where({ id })
            .update({
                status: newStatus,
                guest_name: newName,
                phone_number: newPhone,
                num_guests: newSize,
                reservation_date: newDate,
                reservation_time: newTime,
                special_requests: newRequests,
                updated_at: pool.fn.now()
            });

        const updated = await pool('reservations').where({ id }).first();

        return res.status(200).json({
            message: 'Reservation updated successfully.',
            reservation: updated
        });
    } catch (err) {
        console.error('💥 Error updating reservation:', err);
        next(err);
    }
};

/**
 * Delete a reservation
 * DELETE /api/reservations/:id
 */
exports.deleteReservation = async (req, res, next) => {
    try {
        const { id } = req.params;
        const existing = await pool('reservations').where({ id }).first();

        if (!existing) {
            return res.status(404).json({ error: 'Reservation not found.' });
        }

        await pool('reservations').where({ id }).del();

        return res.status(200).json({
            message: 'Reservation deleted successfully.',
            reservation: existing
        });
    } catch (err) {
        console.error('💥 Error deleting reservation:', err);
        next(err);
    }
};
