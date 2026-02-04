const db = require('./server/db');
async function clear() {
    try {
        await db.initDb();
        console.log("Starting order cleanup...");
        const res = await db.query("DELETE FROM orders");
        console.log("Successfully cleared orders. Rows affected:", res.rowCount);
        process.exit(0);
    } catch (err) {
        console.error("Cleanup failed:", err.message);
        process.exit(1);
    }
}
clear();
