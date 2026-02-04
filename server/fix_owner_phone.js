const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function updateOwner() {
    try {
        const uid = 'Wgx1FVmpQiOVsPUVSpbXY6DR8dt2';
        const phone = '7750038967';

        // 1. Delete any other user with this phone number to avoid unique constraint issues
        // (Assuming phone number is unique for identity purposes)
        await pool.query("DELETE FROM users WHERE phone = $1 AND uid != $2", [phone, uid]);

        // 2. Update the specific UID with the correct phone and OWNER role
        const check = await pool.query("SELECT * FROM users WHERE uid = $1", [uid]);

        if (check.rows.length > 0) {
            await pool.query(
                "UPDATE users SET phone = $1, role = 'OWNER', email = 'owner@panigadi.com', password = 'admin123' WHERE uid = $2",
                [phone, uid]
            );
            console.log("Updated OWNER account: Set phone to 7750038967");
        } else {
            // This shouldn't happen if the UID was already there, but just in case
            await pool.query(
                "INSERT INTO users (uid, name, phone, role, wallet, password, email) VALUES ($1, $2, $3, $4, $5, $6, $7)",
                [uid, 'Owner', phone, 'OWNER', 0, 'admin123', 'owner@panigadi.com']
            );
            console.log("Created NEW OWNER account with correct phone");
        }

        await pool.end();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

updateOwner();
