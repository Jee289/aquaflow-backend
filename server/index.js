const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');
const cashfreeRoutes = require('./routes/cashfree');
const couponRoutes = require('./routes/coupons');

const app = express();
app.set('trust proxy', 1); // Required for express-rate-limit to work correctly on Render
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const PORT = process.env.PORT || 3000;

// Security Middleware
app.use(helmet());

// Rate Limiting (to prevent brute force on OTPs and other APIs)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Increased for development/admin dashboard loading
    message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', limiter);

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', dataRoutes);
app.use('/api/cashfree', cashfreeRoutes);
app.use('/api/coupons', couponRoutes);

const db = require('./db');

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Backend server running on port ${PORT}`);
    try {
        await db.initDb();

        // AUTO-SETUP OWNER (Ensures you can always login)
        console.log('[Setup] Checking for Owner account...');
        const ownerEmail = 'jeevanjyotisahu12@gmail.com';
        const { rows } = await db.query("SELECT * FROM users WHERE email = $1", [ownerEmail]);

        if (rows.length === 0) {
            console.log('[Setup] Owner not found. Creating account...');
            await db.query(
                "INSERT INTO users (uid, name, phone, email, password, role, wallet, activeBarrels, referralCode, state, city, district) VALUES ($1, $2, $3, $4, $5, $6, 0, 0, 'OWNER', 'Odisha', 'Puri', 'Puri')",
                ['OWNER-001', 'Pani Gadi Owner', '7750038967', ownerEmail, 'Panigadi@9778847668', 'OWNER']
            );
            console.log('[Setup] Owner account created successfully.');
        } else {
            // Update password and ensure location is set
            await db.query("UPDATE users SET password = $1, role = 'OWNER', state = 'Odisha', city = 'Puri', district = 'Puri' WHERE email = $2", ['Panigadi@9778847668', ownerEmail]);
            console.log('[Setup] Owner account confirmed/updated.');
        }
    } catch (e) {
        console.error('Database initialization/setup failed:', e);
    }
});
