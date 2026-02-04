import api from './api';

const marketplaceService = {
    // Expose raw API for custom calls
    api: api,

    getAvailableApps: async () => {
        const response = await api.get('/marketplace/apps');
        return response.data;
    },

    getInstalledApps: async () => {
        const response = await api.get('/marketplace/installed');
        return response.data;
    },

    installApp: async (appId) => {
        const response = await api.post(`/marketplace/install/${appId}`);
        return response.data;
    },

    uninstallApp: async (appId) => {
        const response = await api.post(`/marketplace/uninstall/${appId}`);
        return response.data;
    },

    updateSettings: async (installedAppId, settings) => {
        const response = await api.put(`/marketplace/settings/${installedAppId}`, settings);
        return response.data;
    },

    upgradeApp: async (installedAppId) => {
        const response = await api.post(`/marketplace/upgrade/${installedAppId}`);
        return response.data;
    },

    // Access Control
    getAppUsers: async (installedAppId) => {
        const response = await api.get(`/marketplace/${installedAppId}/users`);
        return response.data;
    },

    grantAppAccess: async (installedAppId, userId) => {
        const response = await api.post(`/marketplace/${installedAppId}/access`, null, {
            params: { user_id: userId }
        });
        return response.data;
    },

    revokeAppAccess: async (installedAppId, userId) => {
        const response = await api.delete(`/marketplace/${installedAppId}/access/${userId}`);
        return response.data;
    },

    // Connectors
    monday: {
        testConnection: async (apiKey) => {
            const response = await api.post('/integrations/monday/test-connection', { api_key: apiKey });
            return response.data;
        },
        getBoards: async (limit = 100, apiKey = null) => {
            let url = `/integrations/monday/boards?limit=${limit}`;
            if (apiKey) url += `&api_key=${encodeURIComponent(apiKey)}`;
            const response = await api.get(url);
            return response.data;
        },
        getBoardItems: async (boardId, cursor = null, limit = 100) => {
            let url = `/integrations/monday/boards/${boardId}/items?limit=${limit}`;
            if (cursor) {
                url += `&cursor=${encodeURIComponent(cursor)}`;
            }
            const response = await api.get(url);
            return response.data;
        },
        updateItemValue: async (itemId, boardId, columnValues) => {
            const response = await api.put(`/integrations/monday/items/${itemId}`, {
                board_id: boardId,
                column_values: columnValues
            });
            return response.data;
        },
        syncBoard: async (boardId, settings = {}, onProgress) => {
            const token = localStorage.getItem('token');
            const baseURL = api.defaults.baseURL || 'http://127.0.0.1:8000/api/v1';

            const params = new URLSearchParams({
                download_images: settings.showImages || false,
                optimize_images: settings.optimizeImages || false,
                force_sync_images: settings.forceSyncImages || false,
                keep_original_images: settings.keepOriginals !== undefined ? settings.keepOriginals : true,
            });

            const response = await fetch(`${baseURL}/integrations/monday/boards/${boardId}/sync?${params}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    filters: settings.filters || [],
                    filtered_item_ids: settings.itemIds || null
                })
            });

            if (!response.ok) {
                throw new Error(`Sync failed: ${response.statusText}`);
            }

            // Stream Reader
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');

                // Process all complete lines
                buffer = lines.pop(); // Keep the last incompleteChunk

                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const data = JSON.parse(line);
                            if (onProgress) onProgress(data);
                        } catch (e) {
                            console.error("Stream parse error:", e);
                        }
                    }
                }
            }

            return { success: true };
        },

        clearCache: async (boardId, options) => {
            const response = await api.post(`/integrations/monday/boards/${boardId}/clear-cache`, options);
            return response.data;
        },
        resetQueue: async () => {
            const response = await api.post('/integrations/monday/sync/jobs/reset');
            return response.data;
        }
    }
};

export default marketplaceService;
