const db = require('./server/db');
async function check() {
    await db.initDb();
    const res = await db.query("SELECT COUNT(*) as count FROM orders");
    console.log("Total Orders:", res.rows[0].count);
    process.exit();
}
check();
