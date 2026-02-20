const db = require('./db');

async function checkOrders() {
    try {
        const { rows } = await db.query('SELECT id, userId, status, items, barrelReturns FROM orders');
        console.log(JSON.stringify(rows, null, 2));
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkOrders();
