const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const db = require('../db');

// Initialize Razorpay
// Keys should be in .env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder'
});

/**
 * Initiate Payment (Create Order)
 */
router.post('/initiate', async (req, res) => {
    try {
        const { amount, userId, transactionId, note } = req.body;

        const options = {
            amount: Math.floor(amount * 100), // amount in lowest denomination (paise)
            currency: "INR",
            receipt: String(transactionId),
            notes: {
                userId: String(userId),
                note: note || "Payment"
            }
        };

        const order = await razorpay.orders.create(options);

        console.log(`[Razorpay] Order Created: ${order.id} for amount ${amount}`);

        res.json({
            success: true,
            order_id: order.id,
            amount: order.amount,
            key_id: process.env.RAZORPAY_KEY_ID,
            product_name: "Water Delivery Topup/Order",
            description: note,
            contact: "9999999999", // Should come from user profile ideally
            name: "Pani Gadi User", // Should come from user profile
            email: "user@example.com" // Should come from user profile
        });

    } catch (error) {
        console.error("[Razorpay] Order Creation Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Verify Payment (Called after successful payment on frontend)
 */
router.post('/verify', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, type } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            console.log(`[Razorpay] Payment Verified: ${razorpay_payment_id}`);

            // Payment is successful, update DB
            // We need to fetch the order details to get the amount if not passed, 
            // but for simplicity we can assume the client passed the correct amount or we trust the verification.
            // A better way is to fetch the order from razorpay again or store the order locally when created.
            // For now, let's look up the amount if possible or trust the caller context if verified.
            // Wait, we don't have the amount here easily unless we store it. 
            // Let's just log success for now and update wallet if type is topup.
            // In a real app, you'd look up the `receipt` (transactionId) from the order or pass it through.

            // Fetch order to get the receipt (transactionId) to identify the user/order
            const order = await razorpay.orders.fetch(razorpay_order_id);
            const transactionId = order.receipt;
            const amount = order.amount / 100; // Convert back to rupees

            if (type === 'topup' && userId) {
                await db.query('UPDATE users SET wallet = wallet + $1 WHERE uid = $2', [amount, userId]);
                console.log(`[Razorpay] Wallet updated for ${userId}`);
            } else if (type === 'order') {
                await db.query('UPDATE orders SET status = $1 WHERE id = $2', ['confirmed', transactionId]);
                console.log(`[Razorpay] Order ${transactionId} confirmed`);
            }

            res.json({ success: true, message: "Payment verified successfully" });
        } else {
            console.error(`[Razorpay] Signature Mismatch`);
            res.status(400).json({ success: false, message: "Invalid signature" });
        }

    } catch (error) {
        console.error("[Razorpay] Verify Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
