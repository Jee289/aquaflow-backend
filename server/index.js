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
    } catch (e) {
        console.error('Database initialization failed:', e);
    }
});
