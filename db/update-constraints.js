// db/update-constraints.js
// Script to alter the database constraint for orders table status column

require('dotenv').config();
const pool = require('./db');

async function run() {
    console.log('🔄 Modifying constraint for orders status in database...');
    try {
        await pool.raw('ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check');
        await pool.raw(`
            ALTER TABLE orders 
            ADD CONSTRAINT orders_status_check 
            CHECK (status IN ('Pending', 'Confirmed', 'Cooking', 'Dispatched', 'Completed'))
        `);
        console.log('🎉 Orders status constraint updated successfully!');
    } catch (err) {
        console.error('💥 Failed to update constraint:', err);
    } finally {
        await pool.end();
    }
}

run();
