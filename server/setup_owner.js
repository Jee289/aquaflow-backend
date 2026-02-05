const db = require('./db');

const ownerData = {
    uid: 'OWNER-001',
    name: 'Pani Gadi Owner',
    phone: '7750038967',
    email: 'gadipani7@gmail.com',
    password: 'Panigadi@9778847668',
    role: 'OWNER'
};

async function setupOwner() {
    try {
        console.log("Starting Owner Setup...");

        // Ensure standard DB is ready
        await db.initDb();

        // Check if user exists by phone or email
        const { rows } = await db.query("SELECT * FROM users WHERE phone = $1 OR email = $2", [ownerData.phone, ownerData.email]);

        if (rows.length > 0) {
            console.log("User already exists. Updating to OWNER with provided credentials...");
            await db.query(
                "UPDATE users SET email = $1, password = $2, role = 'OWNER', phone = $3 WHERE uid = $4 OR phone = $3 OR email = $1",
                [ownerData.email, ownerData.password, ownerData.phone, rows[0].uid]
            );
        } else {
            console.log("Creating new OWNER account...");
            await db.query(
                "INSERT INTO users (uid, name, phone, email, password, role, wallet, activeBarrels, referralCode) VALUES ($1, $2, $3, $4, $5, $6, 0, 0, 'OWNER')",
                [ownerData.uid, ownerData.name, ownerData.phone, ownerData.email, ownerData.password, ownerData.role]
            );
        }

        console.log("------------------------------------------");
        console.log("SUCCESS: Owner account is ready!");
        console.log(`Phone: ${ownerData.phone}`);
        console.log(`Email: ${ownerData.email}`);
        console.log(`Password: ${ownerData.password}`);
        console.log("------------------------------------------");
        console.log("You can now login as OWNER in the app.");
        process.exit(0);
    } catch (err) {
        console.error("SETUP ERROR:", err.message);
        process.exit(1);
    }
}

setupOwner();
