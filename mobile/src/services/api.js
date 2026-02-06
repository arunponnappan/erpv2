
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Android Emulator loopback address. 
// For physical device, replace with your machine's local IP (e.g., http://192.168.1.X:8000)
// Event Emitter for Auth Errors
const authEventListeners = [];

const notifyAuthError = () => {
    authEventListeners.forEach(callback => callback());
};

export const subscribeToAuthError = (callback) => {
    authEventListeners.push(callback);
    return () => {
        const index = authEventListeners.indexOf(callback);
        if (index > -1) {
            authEventListeners.splice(index, 1);
        }
    };
};

const api = axios.create({
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
    },
});

// Dynamic Base URL Management
export const setApiBaseUrl = async (url) => {
    if (!url) return;
    // Remove trailing slash
    const cleanUrl = url.replace(/\/$/, '');
    api.defaults.baseURL = `${cleanUrl}/api/v1`;
    await SecureStore.setItemAsync('api_url', cleanUrl);
    console.log("API Base URL set to:", api.defaults.baseURL);
};

// Default Production URL (Update this before building APK!)
// const DEFAULT_API_URL = 'https://backend.abuamarllc.com''http://192.168.20.22:8000';

// Local Development URL (Replace with your computer's IP for Expo Go)
// Local Development URL (Auto-detected Host PC IP on Hotspot)
const DEFAULT_API_URL = 'http://192.168.137.1:8000';
// const DEFAULT_API_URL = 'https://backend.abuamarllc.com'; // Production URL

export const loadApiBaseUrl = async () => {
    try {
        const savedUrl = await SecureStore.getItemAsync('api_url');
        if (savedUrl) {
            api.defaults.baseURL = `${savedUrl}/api/v1`;
            console.log("Restored API URL:", api.defaults.baseURL);
            return savedUrl;
        } else {
            // Fallback to Default Production URL if no local config exists
            api.defaults.baseURL = `${DEFAULT_API_URL}/api/v1`;
            console.log("Using Default Production URL:", api.defaults.baseURL);
            return DEFAULT_API_URL;
        }
    } catch (e) {
        console.error("Failed to load API URL", e);
    }
    return null;
};

// Request Interceptor: Add Token
api.interceptors.request.use(
    async (config) => {
        try {
            const token = await SecureStore.getItemAsync('access_token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (error) {
            console.error("Error retrieving token", error);
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            // Token expired, invalid, or forbidden (wrong env)
            await SecureStore.deleteItemAsync('access_token');
            notifyAuthError();
        }
        return Promise.reject(error);
    }
);

export default api;
