// knexfile.js
// Knex migration configuration file for the MySQL database
require('dotenv').config();
module.exports = {
  development: {
    client: 'mysql2',
    connection: process.env.DATABASE_URL || {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true
    },
    migrations: {
      directory: './db/migrations',
      tableName: 'knex_migrations'
    }
  },
  production: {
    client: 'mysql2',
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: './db/migrations',
      tableName: 'knex_migrations'
    }
  }
};
