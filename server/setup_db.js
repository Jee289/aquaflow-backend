const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const createDb = async () => {
    // 1. Get credentials from env but connect to 'postgres' default DB
    const originalUrl = process.env.DATABASE_URL;
    if (!originalUrl) {
        console.error("No DATABASE_URL found.");
        return;
    }

    // Replace database name with 'postgres' for initial connection
    const postgresUrl = originalUrl.replace(/\/[^/]+$/, '/postgres');

    console.log("Connecting to default 'postgres' database to check for 'aquaflow'...");

    const client = new Client({
        connectionString: postgresUrl,
        ssl: false // assuming local for now since env didn't specify
    });

    try {
        await client.connect();

        // 2. Check if aquaflow db exists
        const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'aquaflow'");
        if (res.rowCount === 0) {
            console.log("Database 'aquaflow' not found. Creating...");
            await client.query('CREATE DATABASE aquaflow');
            console.log("Database 'aquaflow' created successfully.");
        } else {
            console.log("Database 'aquaflow' already exists.");
        }
    } catch (err) {
        console.error("Error setting up database:", err.message);
    } finally {
        await client.end();
    }
};

createDb();
