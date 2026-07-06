// db/init-db.js
// Script to execute the schema.sql against the MySQL database (with auto-database creation)

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
    console.error('❌ Error: Database configuration environment variables are not defined in .env');
    process.exit(1);
}

// Parse DATABASE_URL if available, otherwise use discrete env variables
let config = {};
if (process.env.DATABASE_URL) {
    try {
        const dbUrl = new URL(process.env.DATABASE_URL);
        config = {
            host: dbUrl.hostname,
            port: parseInt(dbUrl.port || '3306', 10),
            user: dbUrl.username,
            password: decodeURIComponent(dbUrl.password || ''),
            database: dbUrl.pathname.replace(/^\//, ''),
        };
    } catch (e) {
        console.error('⚠️ Failed to parse DATABASE_URL, falling back to discrete variables:', e.message);
    }
}

if (!config.host) {
    config = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'hotel_db'
    };
}

// Enable multiple statement execution to allow running schema.sql scripts
config.multipleStatements = true;

async function runSchema() {
    console.log('🔄 Connecting to MySQL server...');
    let conn;
    try {
        // Copy config and temporarily delete database name to connect to the MySQL server itself
        const serverConfig = { ...config };
        const targetDb = serverConfig.database || 'hotel_db';
        delete serverConfig.database;

        conn = await mysql.createConnection(serverConfig);
        
        console.log(`⚡ Ensuring database "${targetDb}" exists...`);
        await conn.query(`CREATE DATABASE IF NOT EXISTS \`${targetDb}\``);
        await conn.query(`USE \`${targetDb}\``);
        
        const schemaPath = path.join(__dirname, 'schema.sql');
        console.log(`📖 Reading schema file: ${schemaPath}`);
        const sql = fs.readFileSync(schemaPath, 'utf8');
        
        console.log('⚡ Executing SQL schema definitions...');
        await conn.query(sql);
        
        console.log('🎉 Database tables and indices initialized successfully!');
    } catch (err) {
        console.error('💥 Database initialization failed:', err);
    } finally {
        if (conn) {
            await conn.end();
        }
    }
}

runSchema();
