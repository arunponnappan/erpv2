
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import api from '../services/api'; // Using our configured axios instance
import { Search, LogOut } from 'lucide-react-native';
import { authService } from '../services/authService';

const ItemListScreen = ({ onSelectItem, onLogout }) => {
    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState(null);
    const [items, setItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        console.log("ItemListScreen Mounted. Loading data...");
        loadData();
    }, []);

    const loadData = async () => {
        console.log("Starting loadData...");
        setLoading(true);
        setError(null);
        try {
            console.log("Fetching Barcode Config...");
            // 1. Fetch Config to know which board to load
            const configRes = await api.get('/integrations/monday/config/barcode');
            const configs = configRes.data;
            if (!configs || configs.length === 0) {
                setError("No Barcode Configuration found. Please ask Admin to configure.");
                setLoading(false);
                return;
            }

            // Assume the first config is the active one for now
            const activeConfig = configs[0];
            setConfig(activeConfig);

            // 2. Fetch Items for this board
            console.log(`Fetching items for board ${activeConfig.board_id}...`);
            const itemsRes = await api.get(`/integrations/monday/boards/${activeConfig.board_id}/items?limit=300`);

            console.log("Items API Response Type:", typeof itemsRes.data);
            console.log("Items API Response IsArray:", Array.isArray(itemsRes.data));

            let loadedItems = [];
            if (Array.isArray(itemsRes.data)) {
                loadedItems = itemsRes.data;
            } else {
                console.warn("Unexpected API response format (expected array):", itemsRes.data);
            }

            setItems(loadedItems);
            setFilteredItems(loadedItems);

        } catch (err) {
            console.error(err);
            setError("Failed to load items. Check connection.");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (text) => {
        setSearchText(text);
        if (!text) {
            setFilteredItems(items);
            return;
        }
        const lower = text.toLowerCase();
        const filtered = items.filter(item =>
            item.name.toLowerCase().includes(lower)
        );
        setFilteredItems(filtered);
    };

    const renderItem = ({ item }) => {
        // Find display columns
        // item.column_values is usually a list of dicts: [{id: "col1", text: "Value"}, ...] 
        // OR a dict { "col1": "Value" } depending on backend serialization.
        // Looking at backend `update_item_value`: it treats it as list for update, but `MondayItem` model has `column_values: Dict`.
        // Let's handle both (List or Dict).

        let colValuesMap = {};
        if (Array.isArray(item.column_values)) {
            item.column_values.forEach(cv => {
                colValuesMap[cv.id] = cv.text || cv.value;
            });
        } else if (item.column_values) {
            // If it's a dict of { id: { text: ... } } or just { id: value }
            // SQLModel JSON usually returns what was saved.
            // Let's assume generic object access.
            colValuesMap = item.column_values;
        }

        return (
            <TouchableOpacity
                style={styles.itemCard}
                onPress={() => onSelectItem(item)}
            >
                <Text style={styles.itemName}>{item.name}</Text>

                {/* Display Configured Columns */}
                {config?.display_column_ids?.map(colId => {
                    // Try to find value
                    // If map keys are ids.
                    let val = colValuesMap[colId];
                    // If val is object (from Monday structure), try .text or .value
                    if (val && typeof val === 'object') {
                        val = val.text || val.value || JSON.stringify(val);
                    }

                    if (!val) return null;

                    return (
                        <Text key={colId} style={styles.itemDetail}>
                            {val}
                        </Text>
                    );
                })}
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={{ marginTop: 10 }}>Loading Items...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
                    <Text style={{ color: 'blue' }}>Logout</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={loadData} style={[styles.logoutBtn, { marginTop: 20 }]}>
                    <Text style={{ color: 'blue' }}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Select Item</Text>
                <TouchableOpacity onPress={onLogout}>
                    <LogOut size={24} color="#333" />
                </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <Search size={20} color="#666" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search items..."
                    value={searchText}
                    onChangeText={handleSearch}
                />
            </View>

            {/* List */}
            <FlatList
                data={filteredItems}
                keyExtractor={item => String(item.id)}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No items found.</Text>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        margin: 16,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        marginLeft: 8,
        fontSize: 16,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    itemCard: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    itemName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    itemDetail: {
        fontSize: 14,
        color: '#666',
    },
    errorText: {
        color: 'red',
        textAlign: 'center',
        marginBottom: 20,
    },
    logoutBtn: {
        padding: 10,
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        marginTop: 20,
    }
});

export default ItemListScreen;
