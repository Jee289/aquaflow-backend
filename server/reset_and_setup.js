const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

const ownerEmail = 'jeevanjyotisahu12@gmail.com';

async function reset() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Clearing orders, return_requests, otp_verifications...');
        await client.query('DELETE FROM orders');
        await client.query('DELETE FROM return_requests');
        await client.query('DELETE FROM otp_verifications');
        await client.query('DELETE FROM interests');

        console.log('Clearing users (except owner)...');
        await client.query('DELETE FROM users WHERE email != $1 OR email IS NULL', [ownerEmail]);

        console.log('Inserting test data...');

        // Test Locations (ensure they exist for tests)
        await client.query(`
        INSERT INTO locations (state, city, isActive) 
        VALUES ('Odisha', 'Puri', true) 
        ON CONFLICT (state, city) DO NOTHING
    `);

        const testUsers = [
            {
                uid: 'TEST-USER-001',
                name: 'Test Customer',
                phone: '1111111111',
                role: 'USER',
                activeBarrels: 2,
                state: 'Odisha',
                city: 'Puri',
                district: 'Puri'
            },
            {
                uid: 'TEST-ADMIN-001',
                name: 'Test Admin',
                phone: '2222222222',
                role: 'ADMIN',
                activeBarrels: 0,
                state: 'Odisha',
                city: 'Puri',
                district: 'Puri'
            },
            {
                uid: 'TEST-AGENT-001',
                name: 'Test Fleet',
                phone: '3333333333',
                role: 'AGENT',
                activeBarrels: 0,
                state: 'Odisha',
                city: 'Puri',
                district: 'Puri'
            }
        ];

        for (const u of testUsers) {
            await client.query(
                "INSERT INTO users (uid, name, phone, role, activeBarrels, state, city, district, referralCode) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
                [u.uid, u.name, u.phone, u.role, u.activeBarrels, u.state, u.city, u.district, 'TEST-' + u.role]
            );

            // Pre-insert OTP for convenience (though send-otp will be called in UI)
            await client.query(
                "INSERT INTO otp_verifications (phone, otp, expiresAt) VALUES ($1, $2, $3)",
                [u.phone, '123456', Date.now() + 3600000] // Valid for 1 hour
            );
        }

        // Assign Admin to location
        await client.query(
            "UPDATE locations SET adminPhone = '2222222222' WHERE state = 'Odisha' AND city = 'Puri'"
        );

        await client.query('COMMIT');
        console.log('Reset and Setup complete.');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error during reset:', e);
    } finally {
        client.release();
        pool.end();
    }
}

reset();
