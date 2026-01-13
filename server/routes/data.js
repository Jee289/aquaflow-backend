const express = require('express');
const router = express.Router();
const db = require('../db');

// Get Products
router.get('/products', async (req, res) => {
    try {
        const { rows } = await db.query("SELECT * FROM products");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Product
router.post('/products', async (req, res) => {
    const { id, name, price, stock, unit, image } = req.body;
    try {
        await db.query("INSERT INTO products (id, name, price, stock, unit, image) VALUES ($1, $2, $3, $4, $5, $6)",
            [id, name, price, stock, unit, image]);
        res.json({ success: true, id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Product
router.patch('/products/:id', async (req, res) => {
    const changes = req.body;
    const id = req.params.id;
    const fields = Object.keys(changes);
    const values = Object.values(changes);

    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');

    try {
        await db.query(`UPDATE products SET ${setClause} WHERE id = $${fields.length + 1}`, [...values, id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Product
router.delete('/products/:id', async (req, res) => {
    const id = req.params.id;
    try {
        await db.query("DELETE FROM products WHERE id = $1", [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Configs
router.get('/configs', async (req, res) => {
    try {
        const { rows } = await db.query("SELECT * FROM district_configs");
        // PG parses JSONB automatically, so no JSON.parse needed for agentPhones if it's stored as JSONB
        // However, we need to ensure agentPhones is an array. If it's null, we return empty list.
        const parsed = rows.map(r => ({
            ...r,
            agentPhones: r.agentPhones || []
        }));
        res.json(parsed);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Orders (Filter by User or Admin)
router.get('/orders', async (req, res) => {
    const { userId, district } = req.query;
    let sql = "SELECT * FROM orders";
    let params = [];

    if (userId) {
        sql += " WHERE userId = $1";
        params = [userId];
    } else if (district) {
        sql += " WHERE district = $1";
        params = [district];
    }
    sql += " ORDER BY timestamp DESC";

    try {
        const { rows } = await db.query(sql, params);
        // PG handles JSONB, check if null
        const parsed = rows.map(r => ({
            ...r,
            items: r.items || [],
            address: r.address || {}
        }));
        res.json(parsed);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Order
router.post('/orders', async (req, res) => {
    const order = req.body;
    console.log(`[Data] Creating order ${order.id} for user ${order.userId} - Method: ${order.paymentMethod}`);

    try {
        await db.query(
            "INSERT INTO orders (id, userId, userName, userPhone, totalAmount, status, deliveryDate, district, items, address, paymentMethod, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
            [
                order.id, order.userId, order.userName, order.userPhone, order.totalAmount,
                order.status, order.deliveryDate, order.district,
                JSON.stringify(order.items), JSON.stringify(order.address), // Safe to stringify for JSONB
                order.paymentMethod, order.timestamp
            ]
        );

        console.log(`[Data] Order ${order.id} created successfully`);

        // CRITICAL SYSTEM LOGIC: "Active Connection" Lifecycle
        // Stage 2 (Activation): Increment activeBarrels if order contains 20L Jars
        const jarItem = order.items.find(i => i.id === '20L');
        if (jarItem && jarItem.quantity > 0) {
            try {
                await db.query("UPDATE users SET activeBarrels = activeBarrels + $1 WHERE uid = $2", [jarItem.quantity, order.userId]);
            } catch (e) {
                console.error("Failed to update activeBarrels", e);
            }
        }

        res.json({ success: true, order });
    } catch (err) {
        console.error(`[Data] Order Creation Error:`, err.message);
        return res.status(500).json({ error: err.message });
    }
});

// Update Order Status
router.patch('/orders/:id', async (req, res) => {
    const { status } = req.body;
    try {
        await db.query("UPDATE orders SET status = $1 WHERE id = $2", [status, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get All Users (with optional role filter)
router.get('/users', async (req, res) => {
    const { role } = req.query;

    let sql = "SELECT * FROM users";
    const params = [];

    if (role) {
        sql += " WHERE role = $1";
        params.push(role);
    }

    try {
        const { rows } = await db.query(sql, params);
        const parsed = rows.map(r => ({
            ...r,
            address: r.address || null
        }));
        res.json(parsed);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Specific User
router.get('/users/:uid', async (req, res) => {
    try {
        const { rows } = await db.query("SELECT * FROM users WHERE uid = $1", [req.params.uid]);
        const row = rows[0];
        if (!row) return res.status(404).json({ error: 'User not found' });
        row.address = row.address || null;
        res.json(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update User (Wallet, Address, etc.)
router.patch('/users/:uid', async (req, res) => {
    const changes = req.body;
    const uid = req.params.uid;
    console.log(`[Data] Updating user ${uid}:`, changes);

    const fields = Object.keys(changes);
    const values = Object.values(changes).map(v => typeof v === 'object' ? JSON.stringify(v) : v);

    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');

    try {
        await db.query(`UPDATE users SET ${setClause} WHERE uid = $${fields.length + 1}`, [...values, uid]);
        console.log(`[Data] User ${uid} updated successfully`);
        res.json({ success: true });
    } catch (err) {
        console.error(`[Data] User Update Error:`, err.message);
        res.status(500).json({ error: err.message });
    }
});


// Get Return Requests
router.get('/returns', async (req, res) => {
    const { district } = req.query;
    let sql = "SELECT * FROM return_requests";
    let params = [];
    if (district) {
        sql += " WHERE district = $1";
        params = [district];
    }
    sql += " ORDER BY timestamp DESC";

    try {
        const { rows } = await db.query(sql, params);
        const parsed = rows.map(r => ({
            ...r,
            address: r.address || {}
        }));
        res.json(parsed);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Return Request
router.post('/returns', async (req, res) => {
    const ret = req.body;
    try {
        await db.query(
            "INSERT INTO return_requests (id, userId, userName, userPhone, district, address, returnDate, barrelCount, status, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
            [
                ret.id, ret.userId, ret.userName, ret.userPhone, ret.district,
                JSON.stringify(ret.address), ret.returnDate, ret.barrelCount, ret.status, ret.timestamp
            ]
        );
        res.json({ success: true, returnRequest: ret });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Return Request Status & Trigger Wallet/Barrel Logic
router.patch('/returns/:id', async (req, res) => {
    const { status } = req.body;
    const returnId = req.params.id;

    try {
        // First get the return request to know user and count
        const { rows } = await db.query("SELECT * FROM return_requests WHERE id = $1", [returnId]);
        const row = rows[0];
        if (!row) return res.status(404).json({ error: 'Request not found' });

        const { userId, barrelCount } = row;

        await db.query('BEGIN');

        // Update Status
        await db.query("UPDATE return_requests SET status = $1 WHERE id = $2", [status, returnId]);

        // Stage 4: Agent "Verified Collection" (completed)
        // Action: Credit Wallet (Digital Receipt)
        if (status === 'completed') {
            const refundAmount = barrelCount * 200;
            await db.query("UPDATE users SET wallet = wallet + $1 WHERE uid = $2", [refundAmount, userId]);
        }

        // Stage 5: Admin "Refund Allotted" (refunded) - User took cash
        // Action: Debit Wallet (Balance Cash) AND Decrement activeBarrels (Close connection)
        if (status === 'refunded') {
            const refundAmount = barrelCount * 200;
            await db.query("UPDATE users SET wallet = wallet - $1, activeBarrels = activeBarrels - $2 WHERE uid = $3", [refundAmount, barrelCount, userId]);
        }

        await db.query('COMMIT');
        res.json({ success: true, status });
    } catch (err) {
        await db.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
});

// Update District Config (Assign Admin or Update Support Message)
router.patch('/configs', async (req, res) => {
    const { district, adminPhone, supportMsg } = req.body;

    // Build dynamic update query based on what fields are provided
    const updates = [];
    const params = [];
    let idx = 1;

    if (adminPhone !== undefined) {
        updates.push(`adminPhone = $${idx++}`);
        params.push(adminPhone);
    }
    if (supportMsg !== undefined) {
        updates.push(`supportMsg = $${idx++}`);
        params.push(supportMsg);
    }

    if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(district);
    const query = `UPDATE district_configs SET ${updates.join(', ')} WHERE district = $${idx}`;

    try {
        await db.query(query, params);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Interests (For Owner Chart)
router.get('/interests', async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT district, COUNT(*) as count 
            FROM interests 
            GROUP BY district 
            ORDER BY count DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Log Interest (When user selects unserviced district)
router.post('/interests', async (req, res) => {
    const { district } = req.body;
    if (!district) return res.status(400).json({ error: 'District required' });

    const timestamp = Date.now();
    try {
        await db.query("INSERT INTO interests (district, timestamp) VALUES ($1, $2)", [district, timestamp]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete User (Admin/Agent removal)
router.delete('/users/:uid', async (req, res) => {
    const { uid } = req.params;
    try {
        await db.query("DELETE FROM users WHERE uid = $1", [uid]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
