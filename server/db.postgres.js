const { Pool } = require('pg');

// PRODUCTION CONFIGURATION
// In production, use environment variables: process.env.DATABASE_URL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/aquaflow',
});

const initDb = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Users Table
        await client.query(`CREATE TABLE IF NOT EXISTS users (
            uid TEXT PRIMARY KEY,
            name TEXT,
            phone TEXT,
            email TEXT,
            role TEXT,
            wallet NUMERIC DEFAULT 0,
            district TEXT,
            activeBarrels INTEGER DEFAULT 0,
            referralCode TEXT,
            address JSONB
        )`);

        // 2. Products Table
        await client.query(`CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            name TEXT,
            price NUMERIC,
            securityFee NUMERIC,
            type TEXT,
            image TEXT,
            stock INTEGER,
            note TEXT,
            unit TEXT DEFAULT 'unit'
        )`);

        // 3. Orders Table
        await client.query(`CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            userId TEXT REFERENCES users(uid),
            userName TEXT,
            userPhone TEXT,
            totalAmount NUMERIC,
            status TEXT,
            deliveryDate TEXT,
            district TEXT,
            items JSONB, 
            address JSONB,
            paymentMethod TEXT,
            timestamp BIGINT
        )`);

        // 4. Return Requests
        await client.query(`CREATE TABLE IF NOT EXISTS return_requests (
            id TEXT PRIMARY KEY,
            userId TEXT REFERENCES users(uid),
            userName TEXT,
            userPhone TEXT,
            district TEXT,
            address JSONB,
            returnDate TEXT,
            barrelCount INTEGER,
            status TEXT,
            timestamp BIGINT
        )`);

        // 5. District Configs
        await client.query(`CREATE TABLE IF NOT EXISTS district_configs (
            district TEXT PRIMARY KEY,
            adminPhone TEXT,
            agentPhones JSONB,
            supportMsg TEXT
        )`);

        // 6. Interests
        await client.query(`CREATE TABLE IF NOT EXISTS interests (
            id SERIAL PRIMARY KEY,
            district TEXT NOT NULL,
            timestamp BIGINT NOT NULL
        )`);

        await client.query('COMMIT');
        console.log("PostgreSQL Tables Initialized");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Failed to initialize PostgreSQL", e);
    } finally {
        client.release();
    }
};

module.exports = {
    query: (text, params) => pool.query(text, params),
    initDb
};
