import axios from 'axios';

const API_URL = 'https://pani-gadi-api.onrender.com/api/products';

const items = [
    {
        currentId: 'PRD-1770532477791',
        update: { name: '20L Water Jar (Auto)', price: 50, securityFee: 200, image: 'style:barrel', unit: 'barrel', type: 'REGULAR' }
    },
    {
        currentId: 'PRD-1770532492869',
        update: { name: 'Water Dispenser', price: 250, image: 'style:dispenser', unit: 'unit', type: 'ACCESSORY' }
    },
    {
        currentId: 'PRD-1770532505171',
        update: { name: '1L Bottle Case (12pc)', price: 240, image: 'style:bottle', unit: 'case', type: 'PREMIUM' }
    }
];

async function updateProducts() {
    for (const item of items) {
        try {
            console.log(`Updating ${item.currentId}...`);
            const res = await axios.patch(`${API_URL}/${item.currentId}`, item.update);
            console.log('Success:', res.status, res.data);
        } catch (error) {
            console.error('Error updating', item.currentId, error.response?.data || error.message);
        }
    }
}

updateProducts();
