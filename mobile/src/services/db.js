
import * as SQLite from 'expo-sqlite';

// Open or Create DB
const db = SQLite.openDatabaseSync('monday_items.db');

export const initDB = () => {
    try {
        db.execSync(`
            CREATE TABLE IF NOT EXISTS items (
                id TEXT PRIMARY KEY,
                board_id TEXT,
                name TEXT,
                json_data TEXT,
                is_synced INTEGER DEFAULT 1,
                updated_at TEXT
            );
        `);
        console.log("Database initialized");
    } catch (e) {
        console.error("DB Init Error:", e);
    }
};


export const saveItems = (items, boardId) => {
    if (!items || items.length === 0) return;

    try {
        db.withTransactionSync(() => {
            items.forEach(item => {
                // Check if item exists and is dirty (unsynced)
                const existing = db.getAllSync(
                    `SELECT is_synced FROM items WHERE id = ?`,
                    [String(item.id)]
                );

                // If item exists and is NOT synced (is_synced === 0), DO NOT Overwrite.
                // We assume Client has newer data that needs to be pushed.
                if (existing.length > 0 && existing[0].is_synced === 0) {
                    console.log(`Skipping update for dirty item ${item.id}`);
                    return;
                }

                db.runSync(
                    `INSERT OR REPLACE INTO items (id, board_id, name, json_data, is_synced, updated_at) VALUES (?, ?, ?, ?, 1, ?)`,
                    [
                        String(item.id),
                        String(boardId),
                        item.name,
                        JSON.stringify(item),
                        new Date().toISOString()
                    ]
                );
            });
        });
        console.log(`Saved/Updated ${items.length} items to Offline DB`);
    } catch (e) {
        console.error("Save Items Error:", e);
    }
};

export const getItems = (boardId) => {
    try {
        const result = db.getAllSync(
            `SELECT * FROM items WHERE board_id = ?`,
            [String(boardId)]
        );
        return result.map(row => {
            const data = JSON.parse(row.json_data);
            // Inject internal sync status for UI if needed
            data._is_synced = row.is_synced;
            return data;
        });
    } catch (e) {
        console.error("Get Items Error:", e);
        return [];
    }
};

export const getUnsyncedItems = (boardId) => {
    try {
        const result = db.getAllSync(
            `SELECT * FROM items WHERE board_id = ? AND is_synced = 0`,
            [String(boardId)]
        );
        return result.map(row => JSON.parse(row.json_data));
    } catch (e) {
        console.error("Get Unsynced Error:", e);
        return [];
    }
};

export const markAsSynced = (itemId) => {
    try {
        db.runSync(
            `UPDATE items SET is_synced = 1 WHERE id = ?`,
            [String(itemId)]
        );
        console.log(`Marked item ${itemId} as Synced`);
    } catch (e) {
        console.error("Mark synced error:", e);
    }
};

export const updateItemLocal = (itemId, newItemData) => {
    try {
        db.runSync(
            `UPDATE items SET json_data = ?, is_synced = 0, updated_at = ? WHERE id = ?`,
            [JSON.stringify(newItemData), new Date().toISOString(), String(itemId)]
        );
        console.log(`Updated Item ${itemId} locally (Dirty)`);
    } catch (e) {
        console.error("Update Item Error:", e);
    }
};
