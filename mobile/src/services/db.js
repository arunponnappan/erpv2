
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
                db.runSync(
                    `INSERT OR REPLACE INTO items (id, board_id, name, json_data, updated_at) VALUES (?, ?, ?, ?, ?)`,
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
        console.log(`Saved ${items.length} items to Offline DB`);
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
        return result.map(row => JSON.parse(row.json_data));
    } catch (e) {
        console.error("Get Items Error:", e);
        return [];
    }
};

export const updateItemLocal = (itemId, newItemData) => {
    try {
        db.runSync(
            `UPDATE items SET json_data = ?, is_synced = 0, updated_at = ? WHERE id = ?`,
            [JSON.stringify(newItemData), new Date().toISOString(), String(itemId)]
        );
        console.log(`Updated Item ${itemId} locally`);
    } catch (e) {
        console.error("Update Item Error:", e);
    }
};
