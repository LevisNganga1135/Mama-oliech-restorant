// db/migrations/20260707090000_add_customers.js
// Adds a customers table (for real customer accounts, separate from the
// staff `users` table) and links orders/reservations to the customer
// who placed them, when they were logged in at the time.

exports.up = async function (knex) {
    // 1. Customers table
    await knex.schema.createTable('customers', (table) => {
        table.increments('id').primary();
        table.string('name', 255).notNullable();
        table.string('email', 255).notNullable().unique();
        table.string('phone', 50).notNullable();
        table.string('password_hash', 255).notNullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
    });

    // 2. Link orders to the customer who placed them (nullable — guest
    // checkout is still allowed, so not every order has a customer_id)
    await knex.schema.alterTable('orders', (table) => {
        table.integer('customer_id').unsigned().nullable();
        table.foreign('customer_id').references('id').inTable('customers').onDelete('SET NULL');
        table.index('customer_id', 'idx_orders_customer');
    });

    // 3. Link reservations to the customer who booked them (same, nullable)
    await knex.schema.alterTable('reservations', (table) => {
        table.integer('customer_id').unsigned().nullable();
        table.foreign('customer_id').references('id').inTable('customers').onDelete('SET NULL');
        table.index('customer_id', 'idx_reservations_customer');
    });
};

exports.down = async function (knex) {
    await knex.schema.alterTable('reservations', (table) => {
        table.dropForeign('customer_id');
        table.dropColumn('customer_id');
    });
    await knex.schema.alterTable('orders', (table) => {
        table.dropForeign('customer_id');
        table.dropColumn('customer_id');
    });
    await knex.schema.dropTableIfExists('customers');
};
