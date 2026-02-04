const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./db');

async function fixOwner() {
    try {
        console.log("Initializing DB and checking for Owner...");
        await db.initDb();

        const phone = '0000000000';
        const { rows } = await db.query("SELECT * FROM users WHERE phone = $1", [phone]);

        if (rows.length > 0) {
            const user = rows[0];
            console.log("Found user with phone 0000000000. Role:", user.role);
            if (user.role !== 'OWNER') {
                console.log("Updating role to OWNER...");
                await db.query("UPDATE users SET role = 'OWNER' WHERE phone = $1", [phone]);
                console.log("Role updated successfully.");
            } else {
                console.log("User already has OWNER role.");
            }
        } else {
            console.log("Owner not found. Creating...");
            const uid = 'PG-OWNER-001';
            const newUser = {
                uid,
                name: 'System Owner',
                phone: phone,
                email: 'owner@panigadi.com',
                role: 'OWNER',
                wallet: 999999,
                district: 'GLOBAL',
                state: 'ALL',
                city: 'ALL',
                activeBarrels: 0,
                referralCode: 'OWNER',
                address: null
            };

            await db.query(
                "INSERT INTO users (uid, name, phone, email, role, wallet, district, state, city, activeBarrels, referralCode, address) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
                [newUser.uid, newUser.name, newUser.phone, newUser.email, newUser.role, newUser.wallet, newUser.district, newUser.state, newUser.city, newUser.activeBarrels, newUser.referralCode, JSON.stringify(newUser.address)]
            );
            console.log("Owner created successfully.");
        }

    } catch (err) {
        console.error("Error fixing owner:", err);
    } finally {
        process.exit();
    }
}

fixOwner();
