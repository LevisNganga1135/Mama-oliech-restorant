// db/migrations/20260704120000_init_schema.js
// Versioned migration initializing the database tables from the schema.sql definition

const fs = require('fs');
const path = require('path');

exports.up = async function(knex) {
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the raw DDL statements defined in schema.sql
    return knex.raw(sql);
};

exports.down = function(knex) {
    // Drop all created tables in the correct dependency order
    return knex.schema
        .dropTableIfExists('mpesa_transactions')
        .dropTableIfExists('orders')
        .dropTableIfExists('reservations')
        .dropTableIfExists('dishes');
};
