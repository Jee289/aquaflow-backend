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
  const dbPath = path.resolve(__dirname, 'panigadi.db');
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

const MAP_KEYS = {
  'adminphone': 'adminPhone',
  'agentphones': 'agentPhones',
  'supportmsg': 'supportMsg',
  'activebarrels': 'activeBarrels',
  'referralcode': 'referralCode',
  'totalamount': 'totalAmount',
  'deliverycharge': 'deliveryCharge',
  'deliverydate': 'deliveryDate',
  'paymentmethod': 'paymentMethod',
  'username': 'userName',
  'userphone': 'userPhone',
  'userid': 'userId',
  'barrelcount': 'barrelCount',
  'returndate': 'returnDate',
  'barrelcount': 'barrelCount',
  'returndate': 'returnDate',
  'barrelreturns': 'barrelReturns',
  'securityfee': 'securityFee',
  'shippedat': 'shippedAt',
  'deliveredat': 'deliveredAt',
  'isactive': 'isActive',
  'state': 'state',
  'city': 'city',
  'assignedagentid': 'assignedAgentId',
  'assignedzones': 'assignedZones',
  'detectedzone': 'detectedZone',
  'createdat': 'createdAt',
  'postalcodes': 'postalCodes',
  'homestock': 'homeStock',
  'referralbalance': 'referralBalance',
  'ordercount': 'orderCount',
  'referredby': 'referredBy'
};

const mapRowToCamel = (row) => {
  if (!row) return row;
  const newRow = {};
  for (const key in row) {
    if (MAP_KEYS[key]) {
      newRow[MAP_KEYS[key]] = row[key];
    } else {
      newRow[key] = row[key];
    }
  }
  return newRow;
};

const query = async (text, params) => {
  if (!useSqlite && pool) {
    const res = await pool.query(text, params);
    if (res.rows) {
      res.rows = res.rows.map(mapRowToCamel);
    }
    return res;
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
                state TEXT,
                city TEXT,
                activeBarrels INTEGER DEFAULT 0,
                referralCode TEXT,
                address JSONB
            )`);

      // Migration for Users
      try { await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS state TEXT`); } catch (e) { }
      try { await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS city TEXT`); } catch (e) { }
      try { await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS home_stock NUMERIC DEFAULT 0`); } catch (e) { }
      try { await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_balance NUMERIC DEFAULT 0`); } catch (e) { }
      try { await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS order_count INTEGER DEFAULT 0`); } catch (e) { }
      try { await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by TEXT`); } catch (e) { }

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
                state TEXT,
                city TEXT,
                items JSONB, 
                address JSONB,
                paymentMethod TEXT,
                deliveryCharge NUMERIC DEFAULT 0,
                barrelReturns INTEGER DEFAULT 0,
                shippedAt BIGINT,
                deliveredAt BIGINT,
                timestamp BIGINT,
                assignedAgentId TEXT
            )`);

      // Migration for Orders
      try { await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS state TEXT`); } catch (e) { }
      try { await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS city TEXT`); } catch (e) { }
      try { await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS barrelReturns INTEGER DEFAULT 0`); } catch (e) { }
      try { await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shippedAt BIGINT`); } catch (e) { }
      try { await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS deliveredAt BIGINT`); } catch (e) { }
      try { await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS assignedAgentId TEXT`); } catch (e) { }

      // 4. Return Requests
      await client.query(`CREATE TABLE IF NOT EXISTS return_requests (
                id TEXT PRIMARY KEY,
                userId TEXT REFERENCES users(uid),
                userName TEXT,
                userPhone TEXT,
                district TEXT,
                state TEXT,
                city TEXT,
                address JSONB,
                returnDate TEXT,
                barrelCount INTEGER,
                status TEXT,
                timestamp BIGINT,
                assignedAgentId TEXT
            )`);

      // Migration for Return Requests
      try { await client.query(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS state TEXT`); } catch (e) { }
      try { await client.query(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS city TEXT`); } catch (e) { }
      try { await client.query(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS assignedAgentId TEXT`); } catch (e) { }

      // 5. District Configs (Legacy Support)
      await client.query(`CREATE TABLE IF NOT EXISTS district_configs (
                district TEXT PRIMARY KEY,
                adminPhone TEXT,
                agentPhones JSONB,
                supportMsg TEXT
            )`);

      // 7. LOCATIONS (New Pan-India Support)
      await client.query(`CREATE TABLE IF NOT EXISTS locations (
                id SERIAL PRIMARY KEY,
                state TEXT NOT NULL,
                city TEXT NOT NULL,
                isActive BOOLEAN DEFAULT TRUE,
                adminPhone TEXT,
                agentPhones JSONB,
                supportMsg TEXT,
                UNIQUE(state, city)
            )`);

      // 8. ZONES (Zone-Based Micro-Territories)
      await client.query(`CREATE TABLE IF NOT EXISTS zones (
                id SERIAL PRIMARY KEY,
                district TEXT NOT NULL,
                state TEXT NOT NULL,
                city TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                landmarks JSONB,
                postalCodes JSONB,
                isActive BOOLEAN DEFAULT TRUE,
                createdAt BIGINT,
                UNIQUE(district, name)
            )`);

      // 6. Interests
      await client.query(`CREATE TABLE IF NOT EXISTS interests (
                id SERIAL PRIMARY KEY,
                district TEXT,
                state TEXT,
                city TEXT,
                timestamp BIGINT NOT NULL
            )`);

      try { await client.query(`ALTER TABLE interests ADD COLUMN IF NOT EXISTS state TEXT`); } catch (e) { }
      try { await client.query(`ALTER TABLE interests ADD COLUMN IF NOT EXISTS city TEXT`); } catch (e) { }

      try { await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS assignedZones JSONB`); } catch (e) { }
      try { await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS detectedZone TEXT`); } catch (e) { }

      // 9. OTP VERIFICATIONS
      await client.query(`CREATE TABLE IF NOT EXISTS otp_verifications (
                phone TEXT PRIMARY KEY,
                otp TEXT NOT NULL,
                expiresAt BIGINT NOT NULL
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
                state TEXT,
                city TEXT,
                activeBarrels INTEGER DEFAULT 0,
                referralCode TEXT,
                address TEXT
            )`);
      // SQLite Alter (Columns might exist, so we ignore errors loosely or just try)
      sqliteDb.run(`ALTER TABLE users ADD COLUMN state TEXT`, (err) => { });
      sqliteDb.run(`ALTER TABLE users ADD COLUMN city TEXT`, (err) => { });
      sqliteDb.run(`ALTER TABLE users ADD COLUMN home_stock REAL DEFAULT 0`, (err) => { });
      sqliteDb.run(`ALTER TABLE users ADD COLUMN referral_balance REAL DEFAULT 0`, (err) => { });
      sqliteDb.run(`ALTER TABLE users ADD COLUMN order_count INTEGER DEFAULT 0`, (err) => { });
      sqliteDb.run(`ALTER TABLE users ADD COLUMN referred_by TEXT`, (err) => { });

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
                state TEXT,
                city TEXT,
                items TEXT, 
                address TEXT,
                paymentMethod TEXT,
                deliveryCharge REAL DEFAULT 0,
                barrelReturns INTEGER DEFAULT 0,
                shippedAt INTEGER,
                deliveredAt INTEGER,
                timestamp INTEGER,
                assignedAgentId TEXT
            )`);
      sqliteDb.run(`ALTER TABLE orders ADD COLUMN state TEXT`, (err) => { });
      sqliteDb.run(`ALTER TABLE orders ADD COLUMN city TEXT`, (err) => { });
      sqliteDb.run(`ALTER TABLE orders ADD COLUMN barrelReturns INTEGER DEFAULT 0`, (err) => { });
      sqliteDb.run(`ALTER TABLE orders ADD COLUMN shippedAt INTEGER`, (err) => { });
      sqliteDb.run(`ALTER TABLE orders ADD COLUMN deliveredAt INTEGER`, (err) => { });
      sqliteDb.run(`ALTER TABLE orders ADD COLUMN assignedAgentId TEXT`, (err) => { });

      // RETURN REQUESTS
      sqliteDb.run(`CREATE TABLE IF NOT EXISTS return_requests (
                id TEXT PRIMARY KEY,
                userId TEXT,
                userName TEXT,
                userPhone TEXT,
                district TEXT,
                state TEXT,
                city TEXT,
                address TEXT,
                returnDate TEXT,
                barrelCount INTEGER,
                status TEXT,
                timestamp INTEGER,
                assignedAgentId TEXT
            )`);
      sqliteDb.run(`ALTER TABLE return_requests ADD COLUMN state TEXT`, (err) => { });
      sqliteDb.run(`ALTER TABLE return_requests ADD COLUMN city TEXT`, (err) => { });
      sqliteDb.run(`ALTER TABLE return_requests ADD COLUMN assignedAgentId TEXT`, (err) => { });

      // DISTRICT CONFIGS
      sqliteDb.run(`CREATE TABLE IF NOT EXISTS district_configs (
                district TEXT PRIMARY KEY,
                adminPhone TEXT,
                agentPhones TEXT,
                supportMsg TEXT
            )`);

      // LOCATIONS
      sqliteDb.run(`CREATE TABLE IF NOT EXISTS locations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                state TEXT NOT NULL,
                city TEXT NOT NULL,
                isActive INTEGER DEFAULT 1,
                adminPhone TEXT,
                agentPhones TEXT,
                supportMsg TEXT,
                UNIQUE(state, city)
            )`);

      // ZONES (Zone-Based Micro-Territories)
      sqliteDb.run(`CREATE TABLE IF NOT EXISTS zones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                district TEXT NOT NULL,
                state TEXT NOT NULL,
                city TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                landmarks TEXT,
                postalCodes TEXT,
                isActive INTEGER DEFAULT 1,
                createdAt INTEGER,
                UNIQUE(district, name)
            )`);

      // INTERESTS
      sqliteDb.run(`CREATE TABLE IF NOT EXISTS interests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                district TEXT,
                state TEXT,
                city TEXT,
                timestamp INTEGER NOT NULL
            )`);
      sqliteDb.run(`ALTER TABLE interests ADD COLUMN state TEXT`, (err) => { });
      sqliteDb.run(`ALTER TABLE interests ADD COLUMN city TEXT`, (err) => { });

      sqliteDb.run(`ALTER TABLE users ADD COLUMN assignedZones TEXT`, (err) => { });
      sqliteDb.run(`ALTER TABLE orders ADD COLUMN detectedZone TEXT`, (err) => { });

      // OTP VERIFICATIONS
      sqliteDb.run(`CREATE TABLE IF NOT EXISTS otp_verifications (
                phone TEXT PRIMARY KEY,
                otp TEXT NOT NULL,
                expiresAt INTEGER NOT NULL
            )`);

      console.log("SQLite Tables Initialized");
    });
  }
};

module.exports = {
  query,
  initDb
};
