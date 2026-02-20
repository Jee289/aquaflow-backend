const db = require('./db');

async function checkUsers() {
    try {
        const { rows } = await db.query('SELECT uid, name, phone, home_stock, activeBarrels FROM users');
        console.log(JSON.stringify(rows, null, 2));
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkUsers();
