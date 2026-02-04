const axios = require('axios');
require('dotenv').config();

const AUTH_KEY = process.env.MSG91_AUTH_KEY;
const TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID;
const PHONE = '7750038967'; // Change to your number for testing
const OTP = '123456';

async function testMSG91() {
    if (!AUTH_KEY || !TEMPLATE_ID) {
        console.error('ERROR: MSG91_AUTH_KEY or MSG91_TEMPLATE_ID missing in .env');
        return;
    }

    const url = `https://api.msg91.com/api/v5/otp?template_id=${TEMPLATE_ID}&mobile=91${PHONE}&authkey=${AUTH_KEY}&otp=${OTP}`;

    console.log('Testing MSG91 OTP Delivery...');
    console.log('URL:', url.replace(AUTH_KEY, 'HIDDEN'));

    try {
        const response = await axios.get(url);
        console.log('RESPONSE:', response.data);
    } catch (err) {
        console.error('ERROR:', err.response ? { status: err.response.status, data: err.response.data } : err.message);
    }
}

testMSG91();
