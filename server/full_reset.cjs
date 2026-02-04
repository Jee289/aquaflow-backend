const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./db');

async function fullReset() {
    try {
        await db.initDb();
        console.log("Connected to PostgreSQL for Full Reset...");

        console.log("1. Clearing Orders...");
        const resOrders = await db.query("DELETE FROM orders");
        console.log("Orders cleared:", resOrders.rowCount);

        console.log("2. Resetting User Wallets and Connections...");
        const resUsers = await db.query("UPDATE users SET wallet = 0, activeBarrels = 0");
        console.log("Users updated:", resUsers.rowCount);

        console.log("\n✅ Database has been successfully reset to ZERO on PostgreSQL.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Reset failed:", err.message);
        process.exit(1);
    }
}

fullReset();
