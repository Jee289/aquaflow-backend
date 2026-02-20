const db = require('./db');

async function fixHomeStock() {
    try {
        console.log("Ensuring home_stock is not NULL...");
        await db.query("UPDATE users SET home_stock = 0 WHERE home_stock IS NULL");

        console.log("Ensuring activeBarrels is not NULL...");
        await db.query("UPDATE users SET activeBarrels = 0 WHERE activeBarrels IS NULL");

        console.log("Checking PG Schema (if applicable)...");
        try {
            await db.query("ALTER TABLE users ALTER COLUMN home_stock SET DEFAULT 0");
            await db.query("ALTER TABLE users ALTER COLUMN activeBarrels SET DEFAULT 0");
        } catch (e) {
            console.log("ALTER COLUMN SET DEFAULT failed (expected if SQLite):", e.message);
        }

        console.log("Cleanup complete.");
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fixHomeStock();
