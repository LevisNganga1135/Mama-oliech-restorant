// controllers/dishController.js
// Handles CRUD operations for dishes in the product catalog/menu

const pool = require('../db/db');

// Helper to map DB row to frontend MenuItem structure
const mapDishRowToMenuItem = (row) => ({
    id: row.id,
    name: row.name,
    price: row.price,
    priceValue: parseFloat(row.price_value),
    category: row.category,
    description: row.description,
    image: row.image_url,
    badge: row.badge,
    spicy: row.is_spicy,
    allergens: row.allergens
});

/**
 * Retrieve all dishes
 * GET /api/dishes
 */
exports.getAllDishes = async (req, res, next) => {
    try {
        const rows = await pool('dishes').orderBy('category').orderBy('id');
        const dishes = rows.map(mapDishRowToMenuItem);
        return res.status(200).json(dishes);
    } catch (err) {
        console.error('💥 Error fetching dishes:', err);
        next(err);
    }
};

/**
 * Create a new dish
 * POST /api/dishes
 */
exports.createDish = async (req, res, next) => {
    try {
        const { id, name, price, priceValue, category, description, image, badge, spicy, allergens } = req.body;

        if (!id || !name || !price || priceValue === undefined || !category || !description) {
            return res.status(400).json({ error: 'Missing core dish properties (id, name, price, priceValue, category, description).' });
        }

        const dishData = {
            id: id.trim(),
            name: name.trim(),
            price: price.trim(),
            price_value: parseFloat(priceValue),
            category: category.trim(),
            description: description.trim(),
            image_url: image ? image.trim() : null,
            badge: badge ? badge.trim() : null,
            is_spicy: !!spicy,
            allergens: allergens ? allergens.trim() : 'None'
        };

        await pool('dishes').insert(dishData);
        const newDish = await pool('dishes').where({ id: id.trim() }).first();

        return res.status(201).json({
            message: 'Dish created successfully.',
            dish: mapDishRowToMenuItem(newDish)
        });
    } catch (err) {
        console.error('💥 Error creating dish:', err);
        next(err);
    }
};

/**
 * Update an existing dish
 * PUT /api/dishes/:id
 */
exports.updateDish = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, price, priceValue, category, description, image, badge, spicy, allergens } = req.body;

        // Check if dish exists
        const existing = await pool('dishes').where({ id }).first();
        if (!existing) {
            return res.status(404).json({ error: 'Dish not found.' });
        }

        await pool('dishes')
            .where({ id })
            .update({
                name: name !== undefined ? name.trim() : existing.name,
                price: price !== undefined ? price.trim() : existing.price,
                price_value: priceValue !== undefined ? parseFloat(priceValue) : parseFloat(existing.price_value),
                category: category !== undefined ? category.trim() : existing.category,
                description: description !== undefined ? description.trim() : existing.description,
                image_url: image !== undefined ? image.trim() : existing.image_url,
                badge: badge !== undefined ? badge.trim() : existing.badge,
                is_spicy: spicy !== undefined ? !!spicy : existing.is_spicy,
                allergens: allergens !== undefined ? allergens.trim() : existing.allergens,
                updated_at: pool.fn.now()
            });

        const updated = await pool('dishes').where({ id }).first();
        return res.status(200).json({
            message: 'Dish updated successfully.',
            dish: mapDishRowToMenuItem(updated)
        });
    } catch (err) {
        console.error('💥 Error updating dish:', err);
        next(err);
    }
};

/**
 * Delete a dish
 * DELETE /api/dishes/:id
 */
exports.deleteDish = async (req, res, next) => {
    try {
        const { id } = req.params;
        const existing = await pool('dishes').where({ id }).first();

        if (!existing) {
            return res.status(404).json({ error: 'Dish not found.' });
        }

        await pool('dishes').where({ id }).del();

        return res.status(200).json({
            message: 'Dish deleted successfully.',
            dish: mapDishRowToMenuItem(existing)
        });
    } catch (err) {
        console.error('💥 Error deleting dish:', err);
        next(err);
    }
};
