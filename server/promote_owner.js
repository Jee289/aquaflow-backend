const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function setOwner() {
    try {
        const uid = 'Wgx1FVmpQiOVsPUVSpbXY6DR8dt2';

        // Check if user exists
        const check = await pool.query("SELECT * FROM users WHERE uid = $1", [uid]);

        if (check.rows.length > 0) {
            await pool.query("UPDATE users SET role = 'OWNER' WHERE uid = $1", [uid]);
            console.log("Updated existing user to OWNER");
        } else {
            // Create user as OWNER
            await pool.query(
                "INSERT INTO users (uid, name, phone, role, wallet, password, email) VALUES ($1, $2, $3, $4, $5, $6, $7)",
                [uid, 'Owner', '0000000000', 'OWNER', 0, 'admin123', 'owner@panigadi.com']
            );
            console.log("Inserted NEW user as OWNER");
        }
        await pool.end();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

setOwner();
