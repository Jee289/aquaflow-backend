require('dotenv').config();
const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Determine if we should try Postgres
let pool = null;
let useSqlite = false;
let sqliteDb = null;

const startPostgres = () => {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('#')) return false;
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
    });
    return true;
  } catch (e) {
    return false;
  }
};

const startSqlite = () => {
  useSqlite = true;
  const dbPath = path.resolve(__dirname, 'aquaflow.db');
  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("SQLite Connection Error:", err.message);
    else console.log(`Connected to SQLite database: ${dbPath}`);
  });
};

// Initialize based on environment
if (startPostgres()) {
  console.log("Attempting to use PostgreSQL...");
} else {
  console.log("No valid DATABASE_URL found. using SQLite fallback.");
  startSqlite();
}

const query = async (text, params) => {
  if (!useSqlite && pool) {
    return pool.query(text, params);
  }

  // SQLite Logic
  if (!sqliteDb) startSqlite();

  return new Promise((resolve, reject) => {
    // Convert Postgres $n syntax to SQLite ?
    const sqliteQuery = text.replace(/\$\d+/g, '?');

    // Determine query type
    const type = text.trim().split(' ')[0].toUpperCase();

    if (type === 'SELECT') {
      sqliteDb.all(sqliteQuery, params || [], (err, rows) => {
        if (err) {
          console.error("SQLite Query Error:", err.message, sqliteQuery);
          return reject(err);
        }
        resolve({ rows });
      });
    } else {
      sqliteDb.run(sqliteQuery, params || [], function (err) {
        if (err) {
          console.error("SQLite Exec Error:", err.message, sqliteQuery);
          return reject(err);
        }
        resolve({ rows: [], rowCount: this.changes });
      });
    }
  });
};

const initDb = async () => {
  if (!useSqlite && pool) {
    try {
      const client = await pool.connect();
      console.log("Connected to PostgreSQL successfully.");
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
                deliveryCharge NUMERIC DEFAULT 0,
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
      client.release();
      return;
    } catch (e) {
      console.error("PostgreSQL connection failed:", e.message);
      console.log("Switching to SQLite...");
      useSqlite = true;
      pool = null;
      startSqlite();
    }
  }

  if (useSqlite) {
    sqliteDb.serialize(() => {
      // USERS
      sqliteDb.run(`CREATE TABLE IF NOT EXISTS users (
                uid TEXT PRIMARY KEY,
                name TEXT,
                phone TEXT,
                email TEXT,
                role TEXT,
                wallet REAL DEFAULT 0,
                district TEXT,
                activeBarrels INTEGER DEFAULT 0,
                referralCode TEXT,
                address TEXT
            )`);

      // PRODUCTS
      sqliteDb.run(`CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                name TEXT,
                price REAL,
                securityFee REAL,
                type TEXT,
                image TEXT,
                stock INTEGER,
                note TEXT,
                unit TEXT DEFAULT 'unit'
            )`);

      // ORDERS
      sqliteDb.run(`CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                userId TEXT,
                userName TEXT,
                userPhone TEXT,
                totalAmount REAL,
                status TEXT,
                deliveryDate TEXT,
                district TEXT,
                items TEXT, 
                address TEXT,
                paymentMethod TEXT,
                deliveryCharge REAL DEFAULT 0,
                timestamp INTEGER
            )`);

      // RETURN REQUESTS
      sqliteDb.run(`CREATE TABLE IF NOT EXISTS return_requests (
                id TEXT PRIMARY KEY,
                userId TEXT,
                userName TEXT,
                userPhone TEXT,
                district TEXT,
                address TEXT,
                returnDate TEXT,
                barrelCount INTEGER,
                status TEXT,
                timestamp INTEGER
            )`);

      // DISTRICT CONFIGS
      sqliteDb.run(`CREATE TABLE IF NOT EXISTS district_configs (
                district TEXT PRIMARY KEY,
                adminPhone TEXT,
                agentPhones TEXT,
                supportMsg TEXT
            )`);

      // INTERESTS
      sqliteDb.run(`CREATE TABLE IF NOT EXISTS interests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                district TEXT NOT NULL,
                timestamp INTEGER NOT NULL
            )`);

      console.log("SQLite Tables Initialized");
    });
  }
};

module.exports = {
  query,
  initDb
};
