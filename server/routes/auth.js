const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const SECRET_KEY = process.env.JWT_SECRET || 'aqua_secret_key_123';
const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID;

// --- CUSTOM OTP ENDPOINTS ---

router.post('/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        console.log('--- SEND OTP REQUEST ---', { phone, timestamp: new Date().toISOString() });
        if (!phone) return res.status(400).json({ error: 'Phone required' });

        const otp = (phone === '9999999999') ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins

        await db.query(
            "INSERT INTO otp_verifications (phone, otp, expiresAt) VALUES ($1, $2, $3) ON CONFLICT (phone) DO UPDATE SET otp = $2, expiresAt = $3",
            [phone, otp, expiresAt]
        );

        console.log(`OTP for ${phone}: ${otp}`);

        // If it's a test number, don't call MSG91
        if (phone === '9999999999') {
            return res.json({ success: true, message: 'OTP sent (Test Number Mode)' });
        }

        // MSG91 INTEGRATION
        if (MSG91_AUTH_KEY && MSG91_TEMPLATE_ID) {
            try {
                // MSG91 SendOTP API (v5)
                // mobile should be in 91xxxxxxxxxx format
                const url = `https://api.msg91.com/api/v5/otp?template_id=${MSG91_TEMPLATE_ID}&mobile=91${phone}&authkey=${MSG91_AUTH_KEY}&otp=${otp}`;

                console.log('Sending OTP via MSG91...');
                const response = await axios.get(url, { timeout: 10000 });
                console.log('MSG91 Response:', response.data);
            } catch (err) {
                console.error('MSG91 API ERROR:', {
                    message: err.message,
                    data: err.response?.data,
                    status: err.response?.status
                });
            }
        } else {
            console.log('MSG91 Credentials missing. OTP not sent via API.');
        }

        res.json({ success: true, message: 'OTP sent successfully' });
    } catch (err) {
        console.error('CRITICAL LOGIN ERROR:', err);
        res.status(500).json({ error: err.message, stack: err.stack });
    }
});

router.post('/verify-otp', async (req, res) => {
    try {
        const { phone, otp, name, city, state, role } = req.body;
        if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' });

        const { rows } = await db.query("SELECT * FROM otp_verifications WHERE phone = $1", [phone]);
        const record = rows[0];

        if (!record) return res.status(400).json({ error: 'No OTP record found' });
        if (record.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
        if (Date.now() > record.expiresAt) return res.status(400).json({ error: 'OTP expired' });

        // OTP Valid! Cleanup
        await db.query("DELETE FROM otp_verifications WHERE phone = $1", [phone]);

        // Proceed to Login/Register Logic
        let userRes = await db.query("SELECT * FROM users WHERE phone = $1", [phone]);
        let user = userRes.rows[0];

        if (user) {
            const token = jwt.sign({ uid: user.uid, role: user.role }, SECRET_KEY);
            return res.json({ user, token });
        } else {
            // New Registration
            if (role && role !== 'USER') {
                return res.status(403).json({ error: 'Access Denied. Support Personnel must be registered by Admin.' });
            }

            const uid = 'PG-' + Math.floor(100000 + Math.random() * 900000);
            const newUser = {
                uid,
                name: name || 'User',
                phone,
                email: '',
                role: 'USER',
                wallet: 0,
                district: city || '',
                state: state || '',
                city: city || '',
                activeBarrels: 0,
                referralCode: Math.random().toString(36).substring(7).toUpperCase(),
                address: null
            };

            await db.query(
                "INSERT INTO users (uid, name, phone, email, role, wallet, district, state, city, activeBarrels, referralCode, address) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
                [newUser.uid, newUser.name, newUser.phone, newUser.email, newUser.role, newUser.wallet, newUser.district, newUser.state, newUser.city, newUser.activeBarrels, newUser.referralCode, JSON.stringify(newUser.address)]
            );

            const token = jwt.sign({ uid: newUser.uid, role: newUser.role }, SECRET_KEY);
            return res.json({ user: newUser, token });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { phone, name, district, role, state, city, email, password } = req.body;
        console.log('LOGIN ATTEMPT:', { phone, email, role });

        if (!phone && !email) return res.status(400).json({ error: 'Phone or Email required' });

        let user;
        if (email && password) {
            const { rows } = await db.query("SELECT * FROM users WHERE email = $1", [email]);
            user = rows[0];
            // Simple password check (plaintext for prototype as requested, usually bcrypt)
            // Note: DB schema needs 'password' column. If not present, this fails.
            // We serve a fallback if password col doesn't exist yet? No, we must ensure it exists.
            if (user && user.password !== password) {
                return res.status(401).json({ error: 'Invalid Password' });
            }
        } else {
            const { rows } = await db.query("SELECT * FROM users WHERE phone = $1", [phone]);
            user = rows[0];
        }

        if (user) {
            console.log('User found:', user.uid, user.role);
            // STRICT SECURITY: Do not allow role or location updates via Login for existing users.
            // The DB is the source of truth.

            const token = jwt.sign({ uid: user.uid, role: user.role }, SECRET_KEY);
            return res.json({ user, token });
        } else {
            // NEW REGISTRATION
            console.log('New Registration Attempt');

            // STRICT SECURITY: Only allow USER registration via public API
            // If a role is explicitly passed and it's not USER, reject registration
            // This prevents public creation of admin/agent accounts
            if (role && role !== 'USER') {
                console.log('BLOCKED: Attempt to register privileged role:', role);
                return res.status(403).json({ error: 'Access Denied. This number is not registered as Admin/Staff. Please contact the Owner.' });
            }

            const { uid: providedUid } = req.body;
            const finalUid = providedUid || ('PG-' + Math.floor(100000 + Math.random() * 900000));

            const newUser = {
                uid: finalUid,
                name: name || 'User',
                phone,
                email: '',
                role: 'USER', // Force USER role
                wallet: 0,
                district: district || '',
                state: state || '',
                city: city || '',
                activeBarrels: 0,
                referralCode: Math.random().toString(36).substring(7).toUpperCase(),
                address: null
            };

            await db.query(
                "INSERT INTO users (uid, name, phone, email, role, wallet, district, state, city, activeBarrels, referralCode, address) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
                [newUser.uid, newUser.name, newUser.phone, newUser.email, newUser.role, newUser.wallet, newUser.district, newUser.state, newUser.city, newUser.activeBarrels, newUser.referralCode, JSON.stringify(newUser.address)]
            );

            const token = jwt.sign({ uid: newUser.uid, role: newUser.role }, SECRET_KEY);
            return res.json({ user: newUser, token });
        }
    } catch (err) {
        console.error('LOGIN ERROR:', err);
        res.status(500).json({ error: err.message });
    }
});

// SECURE STAFF CREATION (Protected)
router.post('/create-staff', async (req, res) => {
    try {
        const { phone, name, district, role, state, city } = req.body;
        console.log('STAFF CREATION ATTEMPT:', { phone, role, requester: req.headers.authorization ? 'Using Token' : 'No Token' });

        // 1. Verify Authentication
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'Unauthorized: No token provided' });

        const token = authHeader.split(' ')[1];
        let decoded;
        try {
            decoded = jwt.verify(token, SECRET_KEY);
        } catch (e) {
            return res.status(403).json({ error: 'Invalid Token' });
        }

        // 2. Verify Authorization (Only Owner/Admin can create staff)
        if (decoded.role !== 'OWNER' && decoded.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
        }

        // 3. Create Key
        if (!phone) return res.status(400).json({ error: 'Phone required' });

        // Check if exists
        const { rows } = await db.query("SELECT * FROM users WHERE phone = $1", [phone]);
        if (rows.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const uid = 'STF-' + Math.floor(100000 + Math.random() * 900000); // Staff ID
        const newUser = {
            uid,
            name: name || 'Staff Member',
            phone,
            email: '',
            role: role, // Role is allowed here because it's a secured endpoint
            wallet: 0,
            district: district || '',
            state: state || '',
            city: city || '',
            activeBarrels: 0,
            referralCode: 'STAFF',
            address: null
        };

        await db.query(
            "INSERT INTO users (uid, name, phone, email, role, wallet, district, state, city, activeBarrels, referralCode, address) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
            [newUser.uid, newUser.name, newUser.phone, newUser.email, newUser.role, newUser.wallet, newUser.district, newUser.state, newUser.city, newUser.activeBarrels, newUser.referralCode, JSON.stringify(newUser.address)]
        );

        if (newUser.role === 'ADMIN') {
            // Legacy Support
            if (newUser.district) {
                await db.query(
                    "INSERT INTO district_configs (district, adminPhone) VALUES ($1, $2) ON CONFLICT (district) DO UPDATE SET adminPhone = $2",
                    [newUser.district, phone]
                );
            }
            // New Location Support
            if (newUser.state && newUser.city) {
                await db.query(
                    "UPDATE locations SET adminPhone = $1 WHERE state = $2 AND city = $3",
                    [phone, newUser.state, newUser.city]
                );
            }
        }

        res.json({ success: true, user: newUser });

    } catch (err) {
        console.error('STAFF CREATE ERROR:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
