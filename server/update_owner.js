const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function updateOwner() {
    try {
        await pool.query("UPDATE users SET email = 'jeevanjyotisahu12@gmail.com', password = 'Vikash@123' WHERE role = 'OWNER'");
        console.log("Updated OWNER credentials successfully");
        await pool.end();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

updateOwner();
