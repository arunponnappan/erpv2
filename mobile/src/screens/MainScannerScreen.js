
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, TextInput, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Search, LogOut, CheckCircle, RefreshCw, Filter, Database } from 'lucide-react-native';
import api from '../services/api';
import { initDB, saveItems, getItems, updateItemLocal } from '../services/db';
import FilterModal from '../components/FilterModal';

const MainScannerScreen = ({ onLogout }) => {
    // Camera State
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);

    // Data State
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [config, setConfig] = useState(null);
    const [items, setItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [availableColumns, setAvailableColumns] = useState([]);

    // Filter State
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [activeFilterConfig, setActiveFilterConfig] = useState({
        sortField: 'name',
        sortDirection: 'asc',
        filterStatus: 'all', // all, assigned, missing
        showDuplicates: false,
        matchType: 'contains' // contains, exact
    });

    // Scanner UI State
    const [scanFrameHeight, setScanFrameHeight] = useState(150); // Default height

    // Processing State
    const [processing, setProcessing] = useState(false);

    // Initial Load & DB Init
    useEffect(() => {
        initDB();
        loadData(false);
    }, []);

    // Manual load function - user must tap button to load
    const handleManualLoad = () => {
        loadData(true);
    };

    const loadData = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        console.log("Loading MainScannerScreen Data...");
        try {
            // 1. Fetch Config
            const configRes = await api.get('/integrations/monday/config/barcode');

            if (configRes.data && configRes.data.length > 0) {
                const activeConfig = configRes.data[0];
                setConfig(activeConfig);

                // Set Default Sorting from Config
                setActiveFilterConfig(prev => ({
                    ...prev,
                    sortField: activeConfig.sort_column_id || 'name',
                    sortDirection: activeConfig.sort_direction || 'asc'
                }));

                // 2. Load from Local DB First (Offline Support)
                const localData = getItems(activeConfig.board_id);
                if (localData && localData.length > 0) {
                    console.log(`Loaded ${localData.length} items from Local DB`);
                    setItems(localData);
                    generateColumnsList(activeConfig, localData);
                }

                // 3. Fetch from Server (Sync)
                console.log(`Fetching items from Server for board ${activeConfig.board_id}...`);
                const itemsRes = await api.get(`/integrations/monday/boards/${activeConfig.board_id}/items?limit=1000`); // Increased limit

                let serverItems = [];
                if (itemsRes.data && Array.isArray(itemsRes.data.items)) {
                    serverItems = itemsRes.data.items;
                } else if (Array.isArray(itemsRes.data)) {
                    serverItems = itemsRes.data;
                }

                if (serverItems.length > 0) {
                    console.log(`Synced ${serverItems.length} items from Server`);
                    setItems(serverItems);
                    // Save to Local DB
                    saveItems(serverItems, activeConfig.board_id);
                    generateColumnsList(activeConfig, serverItems);
                } else if (localData.length === 0) {
                    Alert.alert("No Items", "Connected to board, but no items were found.");
                }

            } else {
                console.warn("No Barcode Config found");
            }
        } catch (err) {
            console.error("Load Error:", err);
            if (err.response && err.response.status === 401) {
                Alert.alert("Session Expired", "Please Log Out and Log In again.", [{ text: "OK", onPress: onLogout }]);
                return;
            }
            // If offline, we typically silently fail if we have local data
            if (items.length === 0) {
                Alert.alert("Connection Error", "Could not load items. Check your internet connection.");
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Helper: Generate list of columns for Sorting
    const generateColumnsList = (cfg, itemList) => {
        if (!cfg || !itemList || itemList.length === 0) return;

        // We use the first item to find column IDs
        const sampleItem = itemList[0];
        let cols = [];

        if (cfg.display_column_ids) {
            cols = cfg.display_column_ids.map(id => ({ id, title: id }));
        } else {
            // Fallback: extract from sample item
            if (Array.isArray(sampleItem.column_values)) {
                cols = sampleItem.column_values.map(cv => ({ id: cv.id, title: cv.id }));
            }
        }

        // Pretty titles? (Hard without board metadata, just capitalize)
        cols = cols.map(c => ({
            ...c,
            title: c.title.charAt(0).toUpperCase() + c.title.slice(1).replace(/_/g, ' ')
        }));

        setAvailableColumns(cols);
    };

    const handleBarcodeScanned = async ({ type, data, bounds }) => {
        if (scanned || processing) return;

        // 1. Focused Scanning Logic
        if (bounds) {
            const { width, height } = Dimensions.get('window');
            const boxCenterX = bounds.origin.x + (bounds.size.width / 2);
            const boxCenterY = bounds.origin.y + (bounds.size.height / 2);
            const camWidth = width;
            const camHeight = height * 0.4;
            const zoneW = 250;
            const zoneH = scanFrameHeight;
            const minX = (camWidth - zoneW) / 2;
            const maxX = minX + zoneW;
            const minY = (camHeight - zoneH) / 2;
            const maxY = minY + zoneH;
            const inZone = (boxCenterX >= minX && boxCenterX <= maxX) && (boxCenterY >= minY && boxCenterY <= maxY);
            if (!inZone) return;
        }

        if (!selectedItem) {
            // Scan to Find
            const searchColId = config?.search_column_id || 'name';
            const foundItem = items.find(item => {
                let colValuesMap = {};
                if (Array.isArray(item.column_values)) {
                    item.column_values.forEach(cv => colValuesMap[cv.id] = cv.text || cv.value);
                } else if (item.column_values) colValuesMap = item.column_values;

                const val = colValuesMap[searchColId];
                const textVal = (val && typeof val === 'object' ? val.text || val.value : val) || '';
                return String(textVal).trim() === String(data).trim();
            });

            if (foundItem) {
                setScanned(true);
                Alert.alert("Item Found!", `Found: ${foundItem.name}\n\nSelect this item?`, [
                    { text: "Cancel", onPress: () => setScanned(false), style: "cancel" },
                    { text: "Select", onPress: () => { setSelectedItem(foundItem); setScanned(false); } }
                ]);
            } else {
                setScanned(true);
                Alert.alert("Not Found", `No item found with ${searchColId}: ${data}`, [{ text: "OK", onPress: () => setScanned(false) }]);
            }
            return;
        }

        setScanned(true);
        Alert.alert("Confirm Update", `Assign Barcode:\n${data}\n\nTo: ${selectedItem.name}?`, [
            { text: "Cancel", style: "cancel", onPress: () => setScanned(false) },
            { text: "Update", onPress: () => updateBarcode(data) }
        ]);
    };

    const updateBarcode = async (code) => {
        setProcessing(true);
        const previousItems = [...items];

        // 1. Optimistic Update (InMemory + Local DB)
        const updateLocalState = (targetId, newBarcode) => {
            return previousItems.map(i => {
                if (i.id === targetId) {
                    const barcodeColId = config?.barcode_column_id;
                    if (!barcodeColId) return i;

                    let newColVals = Array.isArray(i.column_values) ? [...i.column_values] : [];
                    // Ensure we handle object format if that's what we have

                    const idx = newColVals.findIndex(cv => cv.id === barcodeColId);
                    if (idx >= 0) {
                        newColVals[idx] = { ...newColVals[idx], text: newBarcode, value: newBarcode };
                    } else {
                        newColVals.push({ id: barcodeColId, text: newBarcode, value: newBarcode });
                    }

                    const updatedItem = { ...i, column_values: newColVals };
                    // Save to SQLite
                    updateItemLocal(targetId, updatedItem);
                    return updatedItem;
                }
                return i;
            });
        };

        const newItems = updateLocalState(selectedItem.id, code);
        setItems(newItems);

        try {
            // 2. Background API Call
            await api.post(`/integrations/monday/items/${selectedItem.id}/barcode`, {
                barcode: code
            });
            Alert.alert("Success", "Barcode updated!");
            setScanned(false);
            setSelectedItem(null);
        } catch (error) {
            console.error(error);
            // Revert State? Or Keep Local?
            // If offline, this fails. We should queue it.
            // For now, simpler to Alert failure but KEEP local state so user sees it?
            // Or Revert. User asked for "reliable". Reliable usually means "queue".
            // Since queue is not built, Revert + Alert is safest to avoid desync.

            // However, to be "reliable", maybe we don't revert?
            // Let's Revert for now to avoid lying to user about "Success"
            setItems(previousItems);
            // Revert DB?
            saveItems([selectedItem], config.board_id); // Restore old item to DB

            Alert.alert("Sync Failed", "Could not update server. Check connection.");
            setScanned(false);
        } finally {
            setProcessing(false);
        }
    };


    // Combined Filter Logic
    useEffect(() => {
        if (!items) return;

        let result = [...items];
        const searchColId = config?.search_column_id || 'name';
        const barcodeColId = config?.barcode_column_id;

        const getItemValue = (item, colId) => {
            if (colId === 'name') return item.name;
            let colValuesMap = {};
            if (Array.isArray(item.column_values)) item.column_values.forEach(cv => colValuesMap[cv.id] = cv.text || cv.value);
            else if (item.column_values) colValuesMap = item.column_values;
            const val = colValuesMap[colId];
            return (val && typeof val === 'object' ? val.text || val.value : val) || '';
        };

        if (activeFilterConfig.showDuplicates) {
            const valueCounts = {};
            result.forEach(item => {
                const val = String(getItemValue(item, searchColId)).trim().toLowerCase();
                if (val) valueCounts[val] = (valueCounts[val] || 0) + 1;
            });
            result = result.filter(item => {
                const val = String(getItemValue(item, searchColId)).trim().toLowerCase();
                return val && valueCounts[val] > 1;
            });
        }

        if (searchText) {
            const lower = searchText.toLowerCase();
            const isExact = activeFilterConfig.matchType === 'exact';
            result = result.filter(item => {
                const nameVal = item.name.toLowerCase();
                const colVal = String(getItemValue(item, searchColId)).toLowerCase();
                if (isExact) return nameVal === lower || colVal === lower;
                return nameVal.includes(lower) || colVal.includes(lower);
            });
        }

        if (activeFilterConfig.filterStatus !== 'all' && barcodeColId) {
            result = result.filter(item => {
                const val = getItemValue(item, barcodeColId);
                const hasBarcode = val && String(val).trim().length > 0;
                if (activeFilterConfig.filterStatus === 'assigned') return hasBarcode;
                if (activeFilterConfig.filterStatus === 'missing') return !hasBarcode;
                return true;
            });
        }

        // Sorting
        result.sort((a, b) => {
            const valA = String(getItemValue(a, activeFilterConfig.sortField)).toLowerCase();
            const valB = String(getItemValue(b, activeFilterConfig.sortField)).toLowerCase();
            if (valA < valB) return activeFilterConfig.sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return activeFilterConfig.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        setFilteredItems(result);
    }, [items, searchText, activeFilterConfig, config]);

    const handleSearch = (text) => setSearchText(text);

    const renderItem = ({ item }) => {
        const isSelected = selectedItem?.id === item.id;
        let colValuesMap = {};
        if (Array.isArray(item.column_values)) item.column_values.forEach(cv => colValuesMap[cv.id] = cv.text || cv.value);
        else if (item.column_values) colValuesMap = item.column_values;

        const barcodeColId = config?.barcode_column_id;
        let barcodeVal = colValuesMap[barcodeColId];
        if (barcodeVal && typeof barcodeVal === 'object') barcodeVal = barcodeVal.text || barcodeVal.value;

        const searchColId = config?.search_column_id;
        let mainTitle = item.name;
        if (searchColId && searchColId !== 'name') {
            mainTitle = "---";
            const searchVal = colValuesMap[searchColId];
            const searchValText = (searchVal && typeof searchVal === 'object' ? searchVal.text || searchVal.value : searchVal);
            if (searchValText && String(searchValText).trim().length > 0) mainTitle = searchValText;
        }

        let subTitle = null;
        if (config?.display_column_ids?.includes('name') && searchColId !== 'name') subTitle = item.name;

        return (
            <TouchableOpacity style={[styles.itemCard, isSelected && styles.selectedCard]} onPress={() => setSelectedItem(item)}>
                <View style={styles.itemRow}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={[styles.itemName, isSelected && styles.selectedText]}>{mainTitle}</Text>
                        {subTitle && <Text style={[styles.itemDetail, { fontWeight: '600', marginBottom: 4 }, isSelected && styles.selectedText]}>{subTitle}</Text>}
                        {config?.display_column_ids?.map(colId => {
                            if (colId === barcodeColId || colId === 'name' || colId === searchColId) return null;
                            let val = colValuesMap[colId];
                            if (val && typeof val === 'object') val = val.text || val.value;
                            return val ? <Text key={colId} style={[styles.itemDetail, isSelected && styles.selectedText]}>{val}</Text> : null;
                        })}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        {isSelected ? <CheckCircle color="#2563eb" size={24} /> :
                            (barcodeVal ? <View style={styles.barcodeBadge}><Text style={styles.barcodeText}>{barcodeVal}</Text></View> : <Text style={{ color: '#ddd' }}>--</Text>)}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={{ marginTop: 15 }}>Loading Data...</Text></View>;
    if (!loading && !config) return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <Text style={{ fontSize: 18, marginBottom: 20 }}>No Configuration Found</Text>
            <TouchableOpacity onPress={() => loadData(true)} style={styles.permissionBtn}><Text style={styles.permissionBtnText}>Retry Sync</Text></TouchableOpacity>
            <TouchableOpacity onPress={onLogout} style={{ marginTop: 20 }}><Text style={{ color: 'red' }}>Log Out</Text></TouchableOpacity>
        </View>
    );

    if (!permission || !permission.granted) return <View style={styles.center}><Text>Camera Permission Required</Text><TouchableOpacity onPress={requestPermission} style={styles.permissionBtn}><Text style={styles.permissionBtnText}>Allow</Text></TouchableOpacity></View>;

    return (
        <View style={styles.container}>
            <View style={styles.cameraContainer}>
                <CameraView style={StyleSheet.absoluteFillObject} facing="back" onBarcodeScanned={scanned ? undefined : handleBarcodeScanned} />
                <View style={styles.scanFrameContainer}>
                    <View style={[styles.scanFrame, { height: scanFrameHeight }]}>
                        <View style={[styles.corner, styles.tl]} /><View style={[styles.corner, styles.tr]} /><View style={[styles.corner, styles.bl]} /><View style={[styles.corner, styles.br]} />
                    </View>
                    <Text style={styles.scanInstructionText}>{selectedItem ? "Align barcode" : "Select item first"}</Text>
                    <View style={styles.resizeControls}>
                        <TouchableOpacity onPress={() => setScanFrameHeight(Math.max(50, scanFrameHeight - 20))} style={styles.resizeBtn}><Text style={styles.resizeText}>-</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => setScanFrameHeight(Math.min(300, scanFrameHeight + 20))} style={styles.resizeBtn}><Text style={styles.resizeText}>+</Text></TouchableOpacity>
                    </View>
                </View>
                <View style={styles.overlay}>
                    {!selectedItem ? <View style={styles.warningBanner}><Text style={styles.warningText}>Scanner Paused: Select Item</Text></View>
                        : <View style={styles.successBanner}><Text style={styles.successText}>Ready to Scan: {selectedItem.name}</Text></View>}
                </View>
            </View>

            <View style={styles.listContainer}>
                <View style={styles.listHeader}>
                    <View style={styles.searchContainer}>
                        <Search size={20} color="#6b7280" />
                        <TextInput style={styles.searchInput} placeholder="Search..." value={searchText} onChangeText={handleSearch} />
                        <TouchableOpacity onPress={() => setFilterModalVisible(true)} style={[styles.filterIconBtn, (activeFilterConfig.filterStatus !== 'all') && styles.filterIconBtnActive]}>
                            <Filter size={20} color={activeFilterConfig.filterStatus !== 'all' ? "#2563eb" : "#6b7280"} />
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={() => loadData(true)} style={styles.iconBtn}>
                        {refreshing ? <ActivityIndicator size={24} color="#2563eb" /> : <RefreshCw size={24} color="#2563eb" />}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onLogout} style={styles.iconBtn}><LogOut size={24} color="#ef4444" /></TouchableOpacity>
                </View>

                <FlatList
                    data={filteredItems}
                    keyExtractor={item => String(item.id)}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: '#999' }}>No items found.</Text>}
                />
            </View>

            <FilterModal
                visible={filterModalVisible}
                onClose={() => setFilterModalVisible(false)}
                onApply={setActiveFilterConfig}
                currentConfig={activeFilterConfig}
                columns={availableColumns} // PASS DYNAMIC COLUMNS
            />

            {processing && <View style={styles.loadingOverlay}><ActivityIndicator size="large" color="#fff" /></View>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    permissionCard: { backgroundColor: 'white', padding: 30, borderRadius: 20, alignItems: 'center' },
    permissionBtn: { backgroundColor: '#2563eb', padding: 12, borderRadius: 10, marginTop: 10 },
    permissionBtnText: { color: 'white', fontWeight: 'bold' },
    cameraContainer: { height: '40%', width: '100%', position: 'relative' },
    scanFrameContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
    scanFrame: { width: 250, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)', borderRadius: 12 },
    scanInstructionText: { color: 'white', marginTop: 10, backgroundColor: 'rgba(0,0,0,0.5)', padding: 5, borderRadius: 10 },
    corner: { position: 'absolute', width: 20, height: 20, borderColor: '#3b82f6', borderWidth: 4 },
    tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
    tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
    bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
    br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
    resizeControls: { position: 'absolute', right: 20, top: '40%', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 5 },
    resizeBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    resizeText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
    overlay: { position: 'absolute', top: 40, width: '100%', alignItems: 'center' },
    warningBanner: { backgroundColor: 'rgba(239, 68, 68, 0.9)', padding: 8, borderRadius: 20 },
    warningText: { color: '#fff', fontWeight: 'bold' },
    successBanner: { backgroundColor: 'rgba(34, 197, 94, 0.9)', padding: 8, borderRadius: 20 },
    successText: { color: '#fff', fontWeight: 'bold' },
    listContainer: { flex: 1, backgroundColor: 'white', borderTopLeftRadius: 30, marginTop: -25 },
    listHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 10, marginRight: 10 },
    searchInput: { flex: 1, paddingVertical: 10, marginLeft: 10 },
    iconBtn: { padding: 10, backgroundColor: '#f9fafb', borderRadius: 12, marginLeft: 8 },
    filterIconBtn: { padding: 8, borderRadius: 8, marginRight: 8 },
    filterIconBtnActive: { backgroundColor: '#eff6ff' },
    listContent: { padding: 16 },
    itemCard: { backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f3f4f6' },
    selectedCard: { backgroundColor: '#eff6ff', borderColor: '#2563eb' },
    itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    itemName: { fontWeight: '700', fontSize: 16, color: '#1f2937' },
    itemDetail: { fontSize: 14, color: '#6b7280' },
    selectedText: { color: '#1e40af' },
    loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
    barcodeBadge: { backgroundColor: '#f3f4f6', padding: 4, borderRadius: 6, borderWidth: 1, borderColor: '#e5e7eb' },
    barcodeText: { fontSize: 12, fontWeight: 'bold', color: '#374151', fontFamily: 'monospace' }
});

export default MainScannerScreen;
