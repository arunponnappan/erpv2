
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { RefreshCcw, ArrowLeft, Save } from 'lucide-react-native';
import api from '../services/api';

const ScanUpdateScreen = ({ item, Release, onBack }) => {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [barcodeData, setBarcodeData] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!permission) {
            requestPermission();
        }
    }, [permission]);

    if (!permission) {
        // Camera permissions are still loading.
        return <View />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={{ textAlign: 'center' }}>We need your permission to show the camera</Text>
                <TouchableOpacity onPress={requestPermission} style={styles.button}>
                    <Text style={styles.buttonText}>Grant Permission</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onBack} style={[styles.button, { backgroundColor: '#666', marginTop: 10 }]}>
                    <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleBarcodeScanned = ({ type, data }) => {
        setScanned(true);
        setBarcodeData(data);
        // Alert to confirm? Or auto-save?
        // Requirement: "user will then scan a barcode... value will be saved..."
        // Safe to ask confirmation to avoid accidental scans.
    };

    const confirmSave = async () => {
        if (!barcodeData) return;
        setSaving(true);
        try {
            // POST /items/{id}/barcode
            const payload = { barcode: barcodeData };
            await api.post(`/integrations/monday/items/${item.id}/barcode`, payload);

            Alert.alert("Success", "Barcode updated successfully!", [
                { text: "OK", onPress: onBack } // Go back to list
            ]);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to update item.");
            setSaving(false);
            // setScanned(false); // Allow rescan?
        }
    };

    return (
        <View style={styles.container}>
            {/* Header / Item Info */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={{ paddingRight: 10 }}>
                    <ArrowLeft size={24} color="#333" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.headerSub}>Scan barcode to update</Text>
                </View>
            </View>

            {/* Camera Area */}
            <View style={styles.cameraContainer}>
                {!scanned ? (
                    <CameraView
                        style={styles.camera}
                        facing="back"
                        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                        barcodeScannerSettings={{
                            barcodeTypes: ["qr", "ean13", "ean8", "upc_e", "code128", "code39"],
                        }}
                    >
                        <View style={styles.overlay}>
                            <View style={styles.scanBox} />
                            <Text style={styles.overlayText}>Align barcode within frame</Text>
                        </View>
                    </CameraView>
                ) : (
                    <View style={styles.resultContainer}>
                        <Text style={styles.label}>Scanned Code:</Text>
                        <Text style={styles.codeText}>{barcodeData}</Text>

                        <View style={styles.actions}>
                            <TouchableOpacity
                                onPress={() => { setScanned(false); setBarcodeData(null); }}
                                style={[styles.actionBtn, styles.secondaryBtn]}
                                disabled={saving}
                            >
                                <RefreshCcw size={20} color="#333" />
                                <Text style={styles.secondaryBtnText}>Rescan</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={confirmSave}
                                style={[styles.actionBtn, styles.primaryBtn]}
                                disabled={saving}
                            >
                                {saving ? <ActivityIndicator color="#fff" /> : <Save size={20} color="#fff" />}
                                <Text style={styles.primaryBtnText}>{saving ? "Saving..." : "Save Code"}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    header: {
        height: 80, // Approximate height including status bar area on some devices, safer to use SafeAreaView but simpler here
        paddingTop: 30, // Status bar padding
        paddingHorizontal: 16,
        paddingBottom: 10,
        backgroundColor: 'white',
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    headerSub: {
        color: '#666',
        fontSize: 12,
    },
    cameraContainer: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanBox: {
        width: 250,
        height: 250,
        borderWidth: 2,
        borderColor: '#fff',
        backgroundColor: 'transparent',
    },
    overlayText: {
        color: 'white',
        marginTop: 20,
        fontSize: 14,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 5,
        borderRadius: 4,
    },
    resultContainer: {
        flex: 1,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    label: {
        fontSize: 16,
        color: '#666',
        marginBottom: 10,
    },
    codeText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 40,
        textAlign: 'center',
    },
    actions: {
        flexDirection: 'row',
        gap: 20,
    },
    actionBtn: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    primaryBtn: {
        backgroundColor: '#2563eb',
    },
    secondaryBtn: {
        backgroundColor: '#f3f4f6',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    primaryBtnText: {
        color: 'white',
        fontWeight: 'bold',
    },
    secondaryBtnText: {
        color: '#333',
        fontWeight: 'bold',
    },
    button: {
        backgroundColor: '#2563eb',
        padding: 15,
        borderRadius: 8,
        margin: 20,
    },
    buttonText: {
        color: 'white',
        textAlign: 'center',
        fontWeight: 'bold',
    }
});

export default ScanUpdateScreen;
