const db = require('./server/db');
async function resetUsers() {
    try {
        await db.initDb();
        console.log("Starting user data reset (wallets and connections)...");

        const res = await db.query("UPDATE users SET wallet = 0, activeBarrels = 0");

        console.log("Successfully reset user stats. Rows affected:", res.rowCount);
        process.exit(0);
    } catch (err) {
        console.error("Reset failed:", err.message);
        process.exit(1);
    }
}
resetUsers();
