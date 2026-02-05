const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');
const cashfreeRoutes = require('./routes/cashfree');

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
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', limiter);

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', dataRoutes);
app.use('/api/cashfree', cashfreeRoutes);

const db = require('./db');

app.get('/', (req, res) => {
    res.send('Pani Gadi API is running');
});

app.listen(PORT, '0.0.0.0', async () => {
    try {
        await db.initDb();

        // AUTO-SETUP OWNER (Ensures you can always login)
        console.log('[Setup] Checking for Owner account...');
        const ownerEmail = 'jeevanjyotisahu12@gmail.com';
        const { rows } = await db.query("SELECT * FROM users WHERE email = $1", [ownerEmail]);

        if (rows.length === 0) {
            console.log('[Setup] Owner not found. Creating account...');
            await db.query(
                "INSERT INTO users (uid, name, phone, email, password, role, wallet, activeBarrels, referralCode) VALUES ($1, $2, $3, $4, $5, $6, 0, 0, 'OWNER')",
                ['OWNER-001', 'Pani Gadi Owner', '7750038967', ownerEmail, 'Panigadi@9778847668', 'OWNER']
            );
            console.log('[Setup] Owner account created successfully.');
        } else {
            // Update password just in case it was changed
            await db.query("UPDATE users SET password = $1, role = 'OWNER' WHERE email = $2", ['Panigadi@9778847668', ownerEmail]);
            console.log('[Setup] Owner account confirmed/updated.');
        }
    } catch (e) {
        console.error('Database initialization/setup failed:', e);
    }
});
