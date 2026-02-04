const express = require('express');
const router = express.Router();
const axios = require('axios');

const APP_ID = process.env.CASHFREE_APP_ID || 'TEST_PLACEHOLDER';
const SECRET_KEY = process.env.CASHFREE_SECRET_KEY || 'SECRET_PLACEHOLDER';
const ENV = process.env.NODE_ENV === 'production' ? 'PROD' : 'TEST';

const BASE_URL = ENV === 'TEST' ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg';

router.post('/create-order', async (req, res) => {
    const { orderId, amount, customerId, customerPhone, customerName, customerEmail } = req.body;

    try {
        const response = await axios.post(`${BASE_URL}/orders`, {
            order_id: orderId,
            order_amount: amount,
            order_currency: 'INR',
            customer_details: {
                customer_id: customerId,
                customer_email: customerEmail || 'user@example.com',
                customer_phone: customerPhone,
                customer_name: customerName || 'Customer'
            },
            order_meta: {
                return_url: `http://localhost:3000/dashboard` // Ideally configurable
            }
        }, {
            headers: {
                'x-client-id': APP_ID,
                'x-client-secret': SECRET_KEY,
                'x-api-version': '2023-08-01'
            }
        });

        res.json({
            success: true,
            payment_session_id: response.data.payment_session_id,
            order_id: response.data.order_id
        });

    } catch (error) {
        console.error('Cashfree Create Order Error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: error.response?.data?.message || error.message
        });
    }
});

router.post('/verify', async (req, res) => {
    const { orderId } = req.body;

    if (!orderId) {
        return res.status(400).json({ success: false, error: 'Order ID is required' });
    }

    console.log(`[Cashfree] Verifying order: ${orderId}`);

    try {
        const response = await axios.get(`${BASE_URL}/orders/${orderId}`, {
            headers: {
                'x-client-id': APP_ID,
                'x-client-secret': SECRET_KEY,
                'x-api-version': '2023-08-01'
            },
            timeout: 10000 // 10 second timeout
        });

        console.log(`[Cashfree] Order ${orderId} status:`, response.data.order_status);

        if (response.data.order_status === 'PAID') {
            res.json({ success: true, status: 'PAID', data: response.data });
        } else {
            res.json({
                success: false,
                status: response.data.order_status,
                message: `Order is ${response.data.order_status}. Payment not completed.`
            });
        }

    } catch (error) {
        console.error('[Cashfree] Verify Error:', {
            orderId,
            error: error.response?.data || error.message,
            status: error.response?.status
        });

        // Handle specific error cases
        if (error.response?.status === 404) {
            return res.status(404).json({
                success: false,
                error: 'Order not found in Cashfree. It may have expired or the order ID is invalid.',
                orderId
            });
        }

        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            return res.status(504).json({
                success: false,
                error: 'Cashfree API timeout. Please try again.',
                orderId
            });
        }

        res.status(500).json({
            success: false,
            error: error.response?.data?.message || 'Failed to verify payment. Please contact support if payment was deducted.',
            orderId,
            details: ENV === 'TEST' ? error.message : undefined // Only include details in test mode
        });
    }
});

module.exports = router;
