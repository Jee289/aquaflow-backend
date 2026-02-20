const express = require('express');
const router = express.Router();
const db = require('../db');

// List Coupons (Admin/Owner/User)
router.get('/', async (req, res) => {
    try {
        const { isActive, publicView } = req.query;
        let query = "SELECT * FROM coupons";
        let params = [];

        if (publicView === 'true') {
            // Only show active and non-expired coupons to users
            query += " WHERE is_active = TRUE AND (expiry IS NULL OR expiry::bigint > $1)";
            params.push(Date.now());
        } else if (isActive === 'true') {
            query += " WHERE is_active = TRUE";
        }

        query += " ORDER BY createdAt DESC";
        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Coupon
router.post('/', async (req, res) => {
    const { code, discountType, discountValue, minOrderValue, expiry, usageLimit, userUsageLimit, applicableProducts } = req.body;
    try {
        await db.query(
            "INSERT INTO coupons (code, discount_type, discount_value, min_order_value, expiry, usage_limit, user_usage_limit, applicable_products, createdAt) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
            [
                code.toUpperCase(),
                discountType,
                discountValue,
                minOrderValue || 0,
                expiry || null,
                usageLimit || 0,
                userUsageLimit || 0,
                applicableProducts ? JSON.stringify(applicableProducts) : null,
                Date.now()
            ]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Coupon
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM coupons WHERE id = $1", [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Coupon (e.g., extend usage limit or expiry)
router.patch('/:id', async (req, res) => {
    const { id } = req.params;
    const { usageLimit, userUsageLimit, expiry, isActive } = req.body;
    try {
        await db.query(
            "UPDATE coupons SET usage_limit = COALESCE($1, usage_limit), user_usage_limit = COALESCE($2, user_usage_limit), expiry = COALESCE($3, expiry), is_active = COALESCE($4, is_active) WHERE id = $5",
            [usageLimit, userUsageLimit, expiry, isActive, id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Validate Coupon (Public)
router.post('/validate', async (req, res) => {
    const { code, totalAmount } = req.body;
    try {
        const { rows } = await db.query("SELECT * FROM coupons WHERE code = $1 AND is_active = TRUE", [code.toUpperCase()]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Invalid or expired coupon code' });
        }

        const coupon = rows[0];

        // Check expiry
        if (coupon.expiry && Date.now() > Number(coupon.expiry)) {
            return res.status(400).json({ error: 'Coupon has expired' });
        }

        // Check usage limit
        if (coupon.usageLimit > 0 && coupon.usageCount >= coupon.usageLimit) {
            return res.status(400).json({ error: 'Coupon usage limit reached' });
        }

        // Check if this specific user has exceeded their individual usage limit
        if (req.body.userId && coupon.userUsageLimit > 0) {
            const { rows: userOrders } = await db.query(
                "SELECT COUNT(*) as count FROM orders WHERE userId = $1 AND coupon_id = $2",
                [req.body.userId, coupon.id]
            );
            const userUsedCount = parseInt(userOrders[0].count);
            if (userUsedCount >= coupon.userUsageLimit) {
                return res.status(400).json({ error: `You have already reached the maximum usage limit (${coupon.userUsageLimit}) for this coupon` });
            }
        } else if (req.body.userId && coupon.userUsageLimit === 0) {
            // Backward compatibility / Default one-time behavior if we want to keep it
            // Actually, if userUsageLimit is 0, it means NO per-user limit (infinite uses per user until global limit hit)
            // But usually, owners want one-time. 
            // Let's decide: if userUsageLimit is 0, we don't check per-user count.
        }

        // Check if coupon is product-specific
        let applicableSubtotal = Number(totalAmount);
        if (coupon.applicableProducts) {
            let productsList = [];
            try {
                productsList = typeof coupon.applicableProducts === 'string' ? JSON.parse(coupon.applicableProducts) : coupon.applicableProducts;
            } catch (e) { productsList = []; }

            if (productsList && productsList.length > 0) {
                const items = req.body.items || [];
                // Calculate subtotal of only applicable products
                const applicableItems = items.filter(item => productsList.includes(item.id));

                if (applicableItems.length === 0) {
                    return res.status(400).json({ error: 'This coupon is not valid for the items in your cart.' });
                }

                applicableSubtotal = applicableItems.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
            }
        }

        // Check minimum order value (against applicable items only)
        if (applicableSubtotal < Number(coupon.minOrderValue)) {
            return res.status(400).json({ error: `Minimum order value for this coupon is ₹${coupon.minOrderValue} worth of applicable items.` });
        }

        let discount = 0;
        if (coupon.discountType === 'FIXED') {
            discount = Number(coupon.discountValue);
        } else {
            discount = (applicableSubtotal * Number(coupon.discountValue)) / 100;
        }

        res.json({
            success: true,
            discount: Math.floor(discount),
            couponId: coupon.id
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
