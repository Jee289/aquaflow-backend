const db = require('./db');

async function fixActiveCouncil() {
    try {
        await db.initDb();
        console.log("Fixing active council data...");

        // Find existing admins
        const { rows: admins } = await db.query("SELECT * FROM users WHERE role = 'ADMIN'");
        console.log(`Found ${admins.length} admins.`);

        for (const admin of admins) {
            if (admin.state && admin.city && admin.phone) {
                console.log(`Syncing Admin ${admin.name} to Location ${admin.city}, ${admin.state}`);
                await db.query(
                    "UPDATE locations SET adminPhone = $1 WHERE state = $2 AND city = $3",
                    [admin.phone, admin.state, admin.city]
                );
            }
        }

        console.log("Sync complete.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

fixActiveCouncil();
