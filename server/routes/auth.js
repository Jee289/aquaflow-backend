const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const SECRET_KEY = process.env.JWT_SECRET || 'aqua_secret_key_123';

// MESSAGE CENTRAL CONFIGURATION (VerifyNow)
const MC_CUSTOMER_ID = process.env.MESSAGE_CENTRAL_CUSTOMER_ID || 'C-320A86CF83604B9';
const MC_API_KEY = process.env.MESSAGE_CENTRAL_API_KEY; // Base-64 encrypted password

const getMCAuthToken = async () => {
    if (!MC_API_KEY) {
        console.log('[MC] API KEY MISSING in environment variables');
        return null;
    }
    try {
        console.log('[MC] Requesting Auth Token for Customer:', MC_CUSTOMER_ID);
        const response = await axios.get(`https://cpaas.messagecentral.com/auth/v1/authentication/token?customerId=${MC_CUSTOMER_ID}&key=${MC_API_KEY}&scope=NEW`);
        console.log('[MC] Auth Token Response:', response.data);
        return response.data?.token;
    } catch (err) {
        console.error('MC TOKEN ERROR:', err.response?.data || err.message);
        return null;
    }
};

// --- CUSTOM OTP ENDPOINTS ---

router.post('/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        console.log('--- SEND OTP REQUEST ---', { phone, timestamp: new Date().toISOString() });
        if (!phone) return res.status(400).json({ error: 'Phone required' });

        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins
        let verificationId = null;
        let otp = 'MC_GENERATED'; // Placeholder for Message Central, or actual OTP for test numbers

        // Message Central Integration
        if (MC_API_KEY && phone !== '9999999999') {
            try {
                const authToken = await getMCAuthToken();
                if (authToken) {
                    const sendUrl = 'https://cpaas.messagecentral.com/verification/v3/send';
                    console.log('[MC] Sending OTP to:', phone);
                    const response = await axios.post(sendUrl, null, {
                        params: {
                            countryCode: '91',
                            customerId: MC_CUSTOMER_ID,
                            mobileNumber: phone,
                            flowType: 'SMS',
                            otpLength: '6'
                            // Let Message Central generate the OTP
                        },
                        headers: { 'authToken': authToken }
                    });
                    console.log('[MC] Send API Response:', JSON.stringify(response.data, null, 2));
                    verificationId = response.data?.data?.verificationId || response.data?.verificationId;
                    console.log('[MC] Extracted VerificationId:', verificationId);
                } else {
                    console.log('[MC] FAILED TO GET AUTH TOKEN - Check your CustomerID and Key');
                }
            } catch (err) {
                console.error('MC SEND ERROR:', JSON.stringify(err.response?.data || err.message, null, 2));
            }
        } else {
            // Test number fallback
            otp = '123456';
            console.log(`[TEST MODE] OTP for ${phone}: ${otp}`);
        }

        // Store verification record
        await db.query(
            "INSERT INTO otp_verifications (phone, otp, expiresAt, verificationId) VALUES ($1, $2, $3, $4) ON CONFLICT (phone) DO UPDATE SET otp = $2, expiresAt = $3, verificationId = $4",
            [phone, otp, expiresAt, verificationId]
        );

        if (verificationId) {
            console.log(`[MC] OTP sent via Message Central. VerificationId: ${verificationId}`);
        } else if (otp) {
            console.log(`[LOCAL] OTP for test number ${phone}: ${otp}`);
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
        if (Date.now() > record.expiresAt) return res.status(400).json({ error: 'OTP expired' });

        // Message Central Validation
        if (record.verificationId && MC_API_KEY && phone !== '9999999999') {
            try {
                const authToken = await getMCAuthToken();
                if (authToken) {
                    const validateUrl = `https://cpaas.messagecentral.com/verification/v3/validateOtp?customerId=${MC_CUSTOMER_ID}&verificationId=${record.verificationId}&code=${otp}`;
                    console.log('[MC VALIDATE] Calling:', validateUrl);
                    const response = await axios.get(validateUrl, {
                        headers: { 'authToken': authToken }
                    });

                    // Message Central response check
                    if (response.data?.responseCode !== 200) {
                        return res.status(400).json({ error: response.data?.message || 'Invalid OTP' });
                    }
                }
            } catch (err) {
                console.error('[MC VALIDATE] ERROR:', JSON.stringify(err.response?.data || err.message, null, 2));
                // Fallback to internal check if API fails? No, for strictness we should fail unless verified
                return res.status(400).json({ error: 'OTP Verification failed via service' });
            }
        } else {
            // Local check fallback (Test numbers or if MC not configured)
            console.log('[LOCAL VALIDATE] Checking OTP locally');
            if (record.otp !== otp) {
                console.log('[LOCAL VALIDATE] FAILED - OTP mismatch');
                return res.status(400).json({ error: 'Invalid OTP' });
            }
            console.log('[LOCAL VALIDATE] SUCCESS');
        }

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
