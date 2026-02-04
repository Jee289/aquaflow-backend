const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function listUsers() {
    try {
        const res = await pool.query('SELECT name, phone, role FROM users');
        console.log('--- USERS ---');
        console.table(res.rows);
        await pool.end();
    } catch (err) {
        console.error('Error listing users:', err.message);
        process.exit(1);
    }
}

listUsers();
