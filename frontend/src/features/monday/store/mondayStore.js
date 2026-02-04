import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// Boards slice
const createBoardsSlice = (set, get) => ({
    boards: [],
    activeBoardId: null,
    sidebarCollapsed: false,

    setBoards: (boards) => set({ boards }),
    setActiveBoardId: (id) => {
        set({ activeBoardId: id });
        localStorage.setItem('monday_activeBoardId', id);
    },
    toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
});

// Items slice
const createItemsSlice = (set, get) => ({
    items: [],
    itemsLoading: false,
    cursor: null,
    selectedItem: null,

    setItems: (items) => set({ items }),
    setItemsLoading: (loading) => set({ itemsLoading: loading }),
    setCursor: (cursor) => set({ cursor }),
    setSelectedItem: (item) => set({ selectedItem: item }),

    addItems: (newItems) => set((state) => ({
        items: [...state.items, ...newItems]
    })),

    updateItem: (itemId, updates) => set((state) => ({
        items: state.items.map(item =>
            item.id === itemId ? { ...item, ...updates } : item
        )
    })),
});

// Filters slice
const createFiltersSlice = (set, get) => ({
    filters: [],
    showFilter: false,
    sortConfig: { key: 'name', direction: 'asc' },

    setFilters: (filters) => set({ filters }),
    addFilter: (filter) => set((state) => ({
        filters: [...state.filters, filter]
    })),
    removeFilter: (index) => set((state) => ({
        filters: state.filters.filter((_, i) => i !== index)
    })),
    toggleFilterBar: () => set((state) => ({ showFilter: !state.showFilter })),
    setSortConfig: (config) => set({ sortConfig: config }),
});

// Sync slice
const createSyncSlice = (set, get) => ({
    syncState: { syncing: false, message: '', count: 0 },
    syncDuration: 0,
    syncLogs: [],
    syncOptions: {
        showImages: true,
        optimizeImages: true,
        keepOriginals: true,
        forceSyncImages: false,
    },

    setSyncState: (state) => set({ syncState: state }),
    setSyncDuration: (duration) => set({ syncDuration: duration }),
    setSyncLogs: (logs) => set({ syncLogs: logs }),
    addSyncLog: (log) => set((state) => ({
        syncLogs: [log, ...state.syncLogs]
    })),
    setSyncOptions: (options) => set((state) => ({
        syncOptions: { ...state.syncOptions, ...options }
    })),
});

// UI slice
const createUISlice = (set, get) => ({
    viewMode: 'list', // 'list' | 'grid'
    showHistory: false,
    showConfig: false,
    showSortMenu: false,
    showSyncSettings: false,
    isEditMode: false,
    modifiedItems: {},

    setViewMode: (mode) => set({ viewMode: mode }),
    toggleHistory: () => set((state) => ({ showHistory: !state.showHistory })),
    toggleConfig: () => set((state) => ({ showConfig: !state.showConfig })),
    toggleSortMenu: () => set((state) => ({ showSortMenu: !state.showSortMenu })),
    toggleSyncSettings: () => set((state) => ({ showSyncSettings: !state.showSyncSettings })),
    setEditMode: (mode) => set({ isEditMode: mode }),

    updateModifiedItem: (itemId, columnId, value) => set((state) => ({
        modifiedItems: {
            ...state.modifiedItems,
            [itemId]: {
                ...(state.modifiedItems[itemId] || {}),
                [columnId]: value
            }
        }
    })),

    clearModifiedItems: () => set({ modifiedItems: {} }),
});

// Main store combining all slices
export const useMondayStore = create(
    devtools(
        persist(
            (set, get) => ({
                ...createBoardsSlice(set, get),
                ...createItemsSlice(set, get),
                ...createFiltersSlice(set, get),
                ...createSyncSlice(set, get),
                ...createUISlice(set, get),
            }),
            {
                name: 'monday-storage',
                partialize: (state) => ({
                    // Only persist these fields
                    activeBoardId: state.activeBoardId,
                    sidebarCollapsed: state.sidebarCollapsed,
                    viewMode: state.viewMode,
                    syncOptions: state.syncOptions,
                    sortConfig: state.sortConfig,
                }),
            }
        )
    )
);

// Selectors for better performance
export const selectBoards = (state) => state.boards;
export const selectActiveBoard = (state) =>
    state.boards.find(b => b.id === state.activeBoardId);
export const selectItems = (state) => state.items;
export const selectFilteredItems = (state) => {
    let result = [...state.items];

    // Apply filters
    if (state.showFilter && state.filters.length > 0) {
        result = result.filter(item => {
            return state.filters.every(filter => {
                const colVal = filter.column === 'all'
                    ? JSON.stringify(item.column_values)
                    : (item.column_values.find(c => c.id === filter.column)?.text || '');

                if (filter.condition === 'contains') {
                    return colVal.toLowerCase().includes(filter.value.toLowerCase());
                }
                if (filter.condition === 'equals') {
                    return colVal.toLowerCase() === filter.value.toLowerCase();
                }
                return true;
            });
        });
    }

    // Apply sorting
    if (state.sortConfig.key) {
        result.sort((a, b) => {
            const valA = state.sortConfig.key === 'name'
                ? a.name
                : (a.column_values.find(c => c.id === state.sortConfig.key)?.text || '');
            const valB = state.sortConfig.key === 'name'
                ? b.name
                : (b.column_values.find(c => c.id === state.sortConfig.key)?.text || '');

            if (valA < valB) return state.sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return state.sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    return result;
};
