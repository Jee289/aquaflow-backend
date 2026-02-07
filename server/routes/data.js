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

// DEBUG: Inspect Product Data
router.get('/debug-products', async (req, res) => {
    try {
        const { rows } = await db.query("SELECT * FROM products");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Product
router.post('/products', async (req, res) => {
    const { id, name, price, stock, unit, image, type, securityFee, note } = req.body;
    try {
        await db.query(
            "INSERT INTO products (id, name, price, stock, unit, image, type, securityFee, note) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
            [id, name, price, stock, unit || 'unit', image, type || 'REGULAR', securityFee || 0, note || '']
        );
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

// Get Orders (Filter by User, Admin, or Assigned Agent)
router.get('/orders', async (req, res) => {
    const { userId, district, assignedAgentId } = req.query;
    let sql = "SELECT * FROM orders";
    let params = [];

    if (userId) {
        sql += " WHERE userId = $1";
        params = [userId];
    } else if (district) {
        // If assignedAgentId is provided, we might want to filter by that too
        // But typically for Agent View:
        // 1. "My Tasks": assignedAgentId = ME
        // 2. "Pool": district = MY_DISTRICT AND assignedAgentId IS NULL

        if (assignedAgentId) {
            sql += " WHERE district = $1 AND assignedAgentId = $2";
            params = [district, assignedAgentId];
        } else {
            // General district fetch (Admin view or Pool view depending on frontend logic)
            // If frontend wants pool, it should probably filter client side or we add a query param 'unassigned=true'
            // For now, let's return all district orders and let frontend filter, OR support specific query
            sql += " WHERE district = $1";
            params = [district];
        }
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

    // Zone Detection & Auto-Assignment (if enabled)
    try {
        const { zone, agentId } = await detectZoneAndAssign(order);
        if (zone) order.detectedZone = zone;
        if (agentId && !order.assignedAgentId) {
            // Only auto-assign if not manually assigned
            order.assignedAgentId = agentId;
            console.log(`[Auto-Assign] Order ${order.id} → Zone: ${zone}, Agent: ${agentId}`);
        }
    } catch (e) {
        console.error('Zone detection failed:', e.message);
        // Continue without zone assignment
    }

    const sql = `INSERT INTO orders (
        id, userId, userName, userPhone, totalAmount, status, deliveryDate,
        district, state, city, items, address, paymentMethod, deliveryCharge,
        barrelReturns, timestamp, assignedAgentId, detectedZone
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *`;

    const values = [
        order.id, order.userId, order.userName, order.userPhone,
        order.totalAmount, order.status || 'pending', order.deliveryDate,
        order.district, order.state, order.city,
        JSON.stringify(order.items), JSON.stringify(order.address),
        order.paymentMethod, order.deliveryCharge || 0,
        order.barrelReturns || 0, order.timestamp || Date.now(),
        order.assignedAgentId || null, order.detectedZone || null
    ];

    try {
        const { rows } = await db.query(sql, values);
        res.json(rows[0]);
    } catch (err) {
        console.error('Order creation error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update Order Status & Assignment
router.patch('/orders/:id', async (req, res) => {
    const { status, assignedAgentId } = req.body;
    try {
        // Fetch original order
        const { rows } = await db.query("SELECT * FROM orders WHERE id = $1", [req.params.id]);
        const order = rows[0];

        if (!order) return res.status(404).json({ error: 'Order not found' });

        await db.query('BEGIN');

        let updateQuery = "UPDATE orders SET ";
        const updates = [];
        const params = [];
        let pIdx = 1;

        if (status) {
            updates.push(`status = $${pIdx++}`);
            params.push(status);

            if (status === 'shipped' && !order.shippedAt) {
                updates.push(`shippedAt = $${pIdx++}`);
                params.push(Date.now());
            } else if (status === 'delivered' && !order.deliveredAt) {
                updates.push(`deliveredAt = $${pIdx++}`);
                params.push(Date.now());
            }
        }

        if (assignedAgentId !== undefined) {
            updates.push(`assignedAgentId = $${pIdx++}`);
            params.push(assignedAgentId); // Can be null to unassign
        }

        if (updates.length === 0) {
            await db.query('ROLLBACK');
            return res.json({ success: true }); // Nothing to update
        }

        updateQuery += updates.join(', ');
        updateQuery += ` WHERE id = $${pIdx}`;
        params.push(req.params.id);

        await db.query(updateQuery, params);

        // Logic for Active Barrels update & Inventory Replenishment on Delivery
        if (status === 'delivered' && order.status !== 'delivered') {
            const jarItem = (order.items || []).find(i => i.id === '20L');
            if (jarItem && jarItem.quantity > 0) {
                const returned = order.barrelReturns || 0;
                const netIncrease = Math.max(0, jarItem.quantity - returned);

                // Add 20L (20000ml) per jar delivered
                const waterAdded = jarItem.quantity * 20000;

                await db.query(
                    "UPDATE users SET activeBarrels = activeBarrels + $1, home_stock = home_stock + $2, order_count = order_count + 1 WHERE uid = $3",
                    [netIncrease, waterAdded, order.userId]
                );
                console.log(`Inventory Replenished: +${waterAdded}ml and +1 order_count for ${order.userId}`);
            } else {
                // Even if no 20L jars, increment order count for free delivery logic
                await db.query("UPDATE users SET order_count = order_count + 1 WHERE uid = $1", [order.userId]);
            }
        }

        // Logic for SETTLEMENT on Cancellation
        if (status === 'cancelled' && order.status !== 'cancelled') {
            // Only refund if the order was paid via WALLET or UPI
            // For now, we assume all confirmed orders need a refund to internal wallet
            const refundAmount = Number(order.totalAmount);
            if (refundAmount > 0) {
                await db.query("UPDATE users SET wallet = wallet + $1 WHERE uid = $2", [refundAmount, order.userId]);
                console.log(`Refunded ₹${refundAmount} to user ${order.userId} due to cancellation`);
            }
        }

        await db.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await db.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
});

// ... Users routes ...

// Get Return Requests
router.get('/returns', async (req, res) => {
    const { district, assignedAgentId } = req.query;
    let sql = "SELECT * FROM return_requests";
    let params = [];

    if (district) {
        if (assignedAgentId) {
            sql += " WHERE district = $1 AND assignedAgentId = $2";
            params = [district, assignedAgentId];
        } else {
            sql += " WHERE district = $1";
            params = [district];
        }
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
            "INSERT INTO return_requests (id, userId, userName, userPhone, district, state, city, address, returnDate, barrelCount, status, timestamp, assignedAgentId) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)",
            [
                ret.id, ret.userId, ret.userName, ret.userPhone, ret.district, ret.state, ret.city,
                JSON.stringify(ret.address), ret.returnDate, ret.barrelCount, ret.status, ret.timestamp,
                ret.assignedAgentId || null
            ]
        );
        res.json({ success: true, returnRequest: ret });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Return Request Status & Assignment
router.patch('/returns/:id', async (req, res) => {
    const { status, assignedAgentId } = req.body;
    const returnId = req.params.id;

    try {
        const { rows } = await db.query("SELECT * FROM return_requests WHERE id = $1", [returnId]);
        const row = rows[0];
        if (!row) return res.status(404).json({ error: 'Request not found' });

        const { userId, barrelCount } = row;

        await db.query('BEGIN');

        let updateQuery = "UPDATE return_requests SET ";
        const updates = [];
        const params = [];
        let pIdx = 1;

        if (status) {
            updates.push(`status = $${pIdx++}`);
            params.push(status);
        }

        if (assignedAgentId !== undefined) {
            updates.push(`assignedAgentId = $${pIdx++}`);
            params.push(assignedAgentId);
        }

        if (updates.length > 0) {
            updateQuery += updates.join(', ');
            updateQuery += ` WHERE id = $${pIdx}`;
            params.push(returnId);
            await db.query(updateQuery, params);
        }

        // Wallet Logic (Unchanged)
        if (status === 'completed') {
            const refundAmount = barrelCount * 200;
            await db.query("UPDATE users SET wallet = wallet + $1, activeBarrels = activeBarrels - $2 WHERE uid = $3", [refundAmount, barrelCount, userId]);
        }

        if (status === 'refunded') {
            const refundAmount = barrelCount * 200;
            await db.query("UPDATE users SET wallet = wallet - $1 WHERE uid = $2", [refundAmount, userId]);
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
    const { district, state, city } = req.body;
    // if (!district) return res.status(400).json({ error: 'District required' }); // Relaxed for now

    const timestamp = Date.now();
    try {
        await db.query("INSERT INTO interests (district, state, city, timestamp) VALUES ($1, $2, $3, $4)", [district, state, city, timestamp]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Locations
router.get('/locations', async (req, res) => {
    try {
        const { rows } = await db.query("SELECT * FROM locations ORDER BY state, city");
        const parsed = rows.map(r => ({
            ...r,
            agentPhones: r.agentPhones || []
        }));
        res.json(parsed);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Location
router.post('/locations', async (req, res) => {
    const { state, city } = req.body;
    if (!state || !city) return res.status(400).json({ error: 'State and City required' });

    try {
        await db.query("INSERT INTO locations (state, city) VALUES ($1, $2)", [state, city]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Location
router.patch('/locations/:id', async (req, res) => {
    const changes = req.body;
    const id = req.params.id;
    const fields = Object.keys(changes);
    const values = Object.values(changes).map(v => typeof v === 'object' ? JSON.stringify(v) : v);

    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');

    try {
        await db.query(`UPDATE locations SET ${setClause} WHERE id = $${fields.length + 1}`, [...values, id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Location
router.delete('/locations/:id', async (req, res) => {
    const id = req.params.id;
    try {
        await db.query("DELETE FROM locations WHERE id = $1", [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Users (Filter by Role)
router.get('/users', async (req, res) => {
    const { role, district } = req.query;
    let sql = "SELECT * FROM users";
    let params = [];

    if (role) {
        sql += " WHERE role = $1";
        params.push(role);
    }

    if (district) {
        sql += params.length > 0 ? " AND district = $" + (params.length + 1) : " WHERE district = $1";
        params.push(district);
    }

    try {
        const { rows } = await db.query(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Hydration / Home Stock level
router.patch('/users/:uid/hydration', async (req, res) => {
    const { ml } = req.body;
    try {
        await db.query("UPDATE users SET home_stock = home_stock - $1 WHERE uid = $2", [ml, req.params.uid]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Single User
router.get('/users/:uid', async (req, res) => {
    const { uid } = req.params;
    try {
        const { rows } = await db.query("SELECT * FROM users WHERE uid = $1", [uid]);
        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update User (for assignedZones, name, etc.)
router.patch('/users/:uid', async (req, res) => {
    const { uid } = req.params;
    const changes = req.body;
    const fields = Object.keys(changes);
    const values = Object.values(changes).map(v => typeof v === 'object' ? JSON.stringify(v) : v);

    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');

    console.log(`[PATCH User] ${uid} Update:`, changes);
    console.log(`[PATCH User] SQL: UPDATE users SET ${setClause} WHERE uid = $${fields.length + 1} Params:`, [...values, uid]);

    try {
        const result = await db.query(`UPDATE users SET ${setClause} WHERE uid = $${fields.length + 1}`, [...values, uid]);
        console.log(`[PATCH User] Success. Rows affected:`, result.rowCount);
        res.json({ success: true });
    } catch (err) {
        console.error(`[PATCH User] Error:`, err);
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

// ===== ZONE MANAGEMENT =====

// Get Zones (filter by district/state/city)
router.get('/zones', async (req, res) => {
    const { district, state, city } = req.query;
    let sql = "SELECT * FROM zones WHERE isActive = TRUE";
    let params = [];

    if (district) {
        sql += " AND district = $1";
        params.push(district);
    } else if (state && city) {
        sql += " AND state = $1 AND city = $2";
        params = [state, city];
    }

    try {
        const { rows } = await db.query(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Zone
router.post('/zones', async (req, res) => {
    const { district, state, city, name, description, landmarks, postalCodes } = req.body;

    if (!district || !state || !city || !name) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const { rows } = await db.query(
            `INSERT INTO zones (district, state, city, name, description, landmarks, postalCodes, createdAt, isActive) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE) RETURNING *`,
            [district, state, city, name, description, JSON.stringify(landmarks || []), JSON.stringify(postalCodes || []), Date.now()]
        );
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Zone
router.patch('/zones/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, landmarks, postalCodes, isActive } = req.body;

    const updates = [];
    const params = [];
    let paramCount = 1;

    if (name !== undefined) { updates.push(`name = $${paramCount++}`); params.push(name); }
    if (description !== undefined) { updates.push(`description = $${paramCount++}`); params.push(description); }
    if (landmarks !== undefined) { updates.push(`landmarks = $${paramCount++}`); params.push(JSON.stringify(landmarks)); }
    if (postalCodes !== undefined) { updates.push(`postalCodes = $${paramCount++}`); params.push(JSON.stringify(postalCodes)); }
    if (isActive !== undefined) { updates.push(`isActive = $${paramCount++}`); params.push(isActive); }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    params.push(id);
    const sql = `UPDATE zones SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    try {
        const { rows } = await db.query(sql, params);
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Zone
router.delete('/zones/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM zones WHERE id = $1", [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Zone Detection & Auto-Assignment Helper
async function detectZoneAndAssign(order) {
    const { district, address } = order;

    // Get all active zones for this district
    const { rows: zones } = await db.query(
        "SELECT * FROM zones WHERE district = $1 AND isActive = TRUE",
        [district]
    );

    if (zones.length === 0) return { zone: null, agentId: null };

    let detectedZone = null;

    // 1. Check postal code match (highest priority)
    if (address?.pincode) {
        for (const zone of zones) {
            const postalCodes = zone.postalcodes || [];
            if (postalCodes.includes(address.pincode)) {
                detectedZone = zone.name;
                break;
            }
        }
    }

    // 2. Check landmark keywords (secondary)
    if (!detectedZone && address?.fullAddress) {
        const addressLower = address.fullAddress.toLowerCase();
        for (const zone of zones) {
            const landmarks = zone.landmarks || [];
            for (const landmark of landmarks) {
                if (addressLower.includes(landmark.toLowerCase())) {
                    detectedZone = zone.name;
                    break;
                }
            }
            if (detectedZone) break;
        }
    }

    if (!detectedZone) return { zone: null, agentId: null };

    // Auto-assign to agent in this zone (load-based strategy)
    const { rows: agents } = await db.query(
        `SELECT uid FROM users 
         WHERE role = 'AGENT' 
         AND district = $1 
         AND assignedZones IS NOT NULL 
         AND assignedZones::jsonb @> $2::jsonb`,
        [district, JSON.stringify([detectedZone])]
    );

    if (agents.length === 0) return { zone: detectedZone, agentId: null };

    // Load-based: Find agent with fewest pending orders in this zone
    let selectedAgent = null;
    let minOrders = Infinity;

    for (const agent of agents) {
        const { rows: orderCount } = await db.query(
            "SELECT COUNT(*) as count FROM orders WHERE assignedAgentId = $1 AND status = 'pending'",
            [agent.uid]
        );
        const count = parseInt(orderCount[0].count);
        if (count < minOrders) {
            minOrders = count;
            selectedAgent = agent.uid;
        }
    }

    return { zone: detectedZone, agentId: selectedAgent };
}

module.exports = router;
