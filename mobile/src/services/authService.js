
import api from './api';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'access_token';

export const authService = {
    login: async (username, password) => {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        const response = await api.post('/auth/login/access-token', formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        const { access_token } = response.data;
        if (access_token) {
            await SecureStore.setItemAsync(TOKEN_KEY, access_token);
        }
        return response.data;
    },

    logout: async () => {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
    },

    getToken: async () => {
        return await SecureStore.getItemAsync(TOKEN_KEY);
    },

    isAuthenticated: async () => {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        return !!token;
    }
};
