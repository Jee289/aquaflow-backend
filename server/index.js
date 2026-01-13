const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');
const razorpayRoutes = require('./routes/razorpay');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', dataRoutes);
app.use('/api/razorpay', razorpayRoutes);

const db = require('./db');

app.get('/', (req, res) => {
    res.send('AquaFlow API is running');
});

app.listen(PORT, '0.0.0.0', async () => {
    try {
        await db.initDb();
    } catch (e) {
        console.error('Database initialization failed:', e);
    }
});
