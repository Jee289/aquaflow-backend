const db = require('./db');

async function checkProducts() {
    try {
        const { rows } = await db.query('SELECT * FROM products');
        console.log(JSON.stringify(rows, null, 2));
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkProducts();
