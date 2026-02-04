const db = require('./db');

async function addPasswordColumn() {
    try {
        await db.initDb();
        console.log("Adding password column...");
        // Postgres
        try {
            await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT");
        } catch (e) { console.log("PG Error (might be active):", e.message); }

        // SQLite (fallback handled in db.js mainly, but let's try just in case using the generic query wrapper which might fail for sqlite specific syntax if not handled, but ALTER ADD COLUMN is standard)
        // db.query handles it.

        console.log("Password column added.");

        // Set default owner password
        await db.query("UPDATE users SET password = 'admin' WHERE role = 'OWNER'");
        console.log("Owner password set to 'admin'");

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

addPasswordColumn();
