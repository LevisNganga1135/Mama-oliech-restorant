// db/db.js
// Centralized MySQL connection pool management using Knex

require('dotenv').config();
const knex = require('knex');
const knexConfig = require('../knexfile');

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];

if (!config) {
    console.error(`❌ Error: Knex configuration not found for environment: ${environment}`);
    process.exit(1);
}

// Optimize connection pool limits based on environment variables
const connectionLimit = parseInt(process.env.DB_CONNECTION_LIMIT || '20', 10);
config.pool = {
    min: 2,
    max: connectionLimit,
    ...config.pool
};
if (typeof config.connection === 'object' && config.connection !== null) {
    config.connection.connectionLimit = connectionLimit;
}

const db = knex(config);

// Test database connection on startup
db.raw('SELECT NOW() as now')
    .then((result) => {
        console.log('✅ Connected to MySQL database via Knex successfully at:', result[0][0].now);
    })
    .catch((err) => {
        console.error('💥 Knex database connection failed:', err.message);
    });

// Fallback compatibility method for raw query execution (emulating pg driver result)
db.query = async (text, params = []) => {
    const sql = text.replace(/\$\d+/g, '?');
    const result = await db.raw(sql, params);
    const rows = result[0];
    if (Array.isArray(rows)) {
        return { rows, rowCount: rows.length };
    } else {
        return { rows: [], rowCount: rows.affectedRows || 0 };
    }
};

// Fallback connection pool helpers
db.connect = async () => {
    return {
        query: (text, params) => db.query(text, params),
        release: () => {}
    };
};

db.end = () => db.destroy();

module.exports = db;
