import axios from 'axios';

// Set your Production URL here if you've already deployed
const PROD_URL = 'https://pani-gadi-api.onrender.com/api'; // Correct Render URL
const DEV_URL = 'http://localhost:3000/api';

const BASE_URL = process.env.NODE_ENV === 'production' ? PROD_URL : DEV_URL;

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add logic to include JWT token if exists
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('aqua_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
