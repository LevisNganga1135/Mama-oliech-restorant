// db/seed-user.js
// Seed script to create a default administrator staff account

const bcrypt = require('bcrypt');
const readline = require('readline');
const pool = require('./db');

function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }));
}

async function seedUser() {
    try {
        let username = process.env.SEED_ADMIN_USER;
        let password = process.env.SEED_ADMIN_PASS;

        // If credentials are not in environment variables, check if we can prompt
        if (!username || !password) {
            if (process.stdin.isTTY) {
                console.log('🔑 Credentials not found in environment variables.');
                if (!username) {
                    username = await askQuestion('Enter Admin Username (default: admin): ');
                    username = username.trim() || 'admin';
                }
                if (!password) {
                    password = await askQuestion('Enter Admin Password (default: Password123!): ');
                    password = password || 'Password123!';
                }
            } else {
                // Fallback to default
                username = username || 'admin';
                password = password || 'Password123!';
            }
        }

        console.log(`👤 Seeding staff user "${username}"...`);
        
        // Check if user already exists
        const check = await pool('users').select('username').where({ username }).first();
        if (check) {
            console.log('⚠️ User already exists. Skipping seed.');
            process.exit(0);
        }
        
        const hash = await bcrypt.hash(password, 10);
        await pool('users').insert({ username, password_hash: hash });
        
        console.log('🎉 Default staff user seeded successfully!');
        process.exit(0);
    } catch (err) {
        console.error('💥 Error seeding user:', err);
        process.exit(1);
    }
}

seedUser();
