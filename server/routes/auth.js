const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
// const bcrypt = require('bcryptjs'); // Skipping strict hashing for demo compatibility with existing "phone login"

const SECRET_KEY = 'aqua_secret_key_123'; // In prod, use env var

// Login (or Register if new) - Simplified Phone Auth
router.post('/login', async (req, res) => {
    const { phone, name, district, role } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone required' });

    try {
        const { rows } = await db.query("SELECT * FROM users WHERE phone = $1", [phone]);
        const user = rows[0];

        if (user) {
            // User exists - check if we need to update role/district
            if (role && (role !== user.role || district !== user.district)) {
                // Update role and district
                const newDistrict = district || user.district;
                await db.query(
                    "UPDATE users SET role = $1, district = $2 WHERE uid = $3",
                    [role, newDistrict, user.uid]
                );

                const updatedUser = { ...user, role, district: newDistrict };
                const token = jwt.sign({ uid: updatedUser.uid, role: updatedUser.role }, SECRET_KEY);
                return res.json({ user: updatedUser, token });
            } else {
                const token = jwt.sign({ uid: user.uid, role: user.role }, SECRET_KEY);
                return res.json({ user, token });
            }
        } else {
            // Register new user
            const uid = 'PG-' + Math.floor(100000 + Math.random() * 900000);
            const newUser = {
                uid,
                name: name || 'User',
                phone,
                email: '',
                role: role || 'USER',
                wallet: 0,
                district: district || '',
                activeBarrels: 0,
                referralCode: Math.random().toString(36).substring(7).toUpperCase(),
                address: null // JSONB handles null
            };

            await db.query(
                "INSERT INTO users (uid, name, phone, email, role, wallet, district, activeBarrels, referralCode, address) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
                [newUser.uid, newUser.name, newUser.phone, newUser.email, newUser.role, newUser.wallet, newUser.district, newUser.activeBarrels, newUser.referralCode, JSON.stringify(newUser.address)]
            );

            const token = jwt.sign({ uid: newUser.uid, role: newUser.role }, SECRET_KEY);
            res.json({ user: newUser, token });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
