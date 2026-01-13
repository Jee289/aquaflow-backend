import axios from 'axios';

// In production/capacitor, this should be the public IP or domain of your deployed server
// For local Android emulator, use 'http://10.0.2.2:3000'
// For local web, use 'http://localhost:3000'
const BASE_URL = 'http://localhost:3000/api';

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
