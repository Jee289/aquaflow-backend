const db = require('./db');
const phone = process.argv[2];

if (!phone) {
    console.log("Usage: node server/promote_owner.js <phone_number>");
    console.log("Example: node server/promote_owner.js 9876543210");
    process.exit(1);
}

async function promote() {
    try {
        console.log(`Promoting ${phone} to OWNER...`);
        const { rows } = await db.query("SELECT * FROM users WHERE phone = $1", [phone]);

        if (rows.length === 0) {
            console.log("Error: This number is not registered yet. Please log in as a regular USER first in the app, then run this script again to promote yourself.");
            process.exit(1);
        }

        await db.query("UPDATE users SET role = 'OWNER' WHERE phone = $1", [phone]);
        console.log("SUCCESS! You are now the OWNER. Please log out and log in again as OWNER in the app.");
        process.exit(0);
    } catch (err) {
        console.error("Error:", err.message);
        process.exit(1);
    }
}

promote();
