
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Alert } from 'react-native';
import { authService } from '../services/authService';
import { setApiBaseUrl } from '../services/api';
import api from '../services/api';
import { Lock, User, Settings, X, Check, Server } from 'lucide-react-native';
import { Modal } from 'react-native';

const LoginScreen = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Settings State
    const [showSettings, setShowSettings] = useState(false);
    const [apiUrl, setApiUrl] = useState('');

    // Load current URL when opening settings
    const handleOpenSettings = () => {
        setApiUrl(api.defaults.baseURL?.replace('/api/v1', '') || '');
        setShowSettings(true);
    };

    const handleSaveSettings = async () => {
        if (!apiUrl) {
            Alert.alert("Invalid URL", "Please enter a valid API URL");
            return;
        }
        try {
            await setApiBaseUrl(apiUrl);
            Alert.alert("Saved", "API Configuration updated");
            setShowSettings(false);
        } catch (e) {
            Alert.alert("Error", "Failed to save settings");
        }
    };

    const handleLogin = async () => {
        // Validation: Check if URL is configured
        if (!api.defaults.baseURL) {
            Alert.alert(
                "Configuration Required", 
                "Please tap the Settings (Gear) icon in the top corner to set your Server URL first."
            );
            setShowSettings(true); // Auto-open settings for convenience
            return;
        }

        if (!username || !password) {
            Alert.alert("Error", "Please enter username and password");
            return;
        }

        setLoading(true);
        try {
            await authService.login(username, password);
            onLoginSuccess();
        } catch (error) {
            console.error("LOGIN ERROR:", error);
            if (error.response) {
                console.error("Response Status:", error.response.status);
                console.error("Response Data:", error.response.data);
            } else if (error.request) {
                console.error("No Response Received:", error.request);
            } else {
                console.error("Error Message:", error.message);
            }
            Alert.alert("Login Failed", "Invalid credentials or server unavailable. Check console logs.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Settings Button */}
            <TouchableOpacity
                style={styles.settingsBtn}
                onPress={handleOpenSettings}
            >
                <Settings color="#666" size={24} />
            </TouchableOpacity>

            {/* Settings Modal */}
            <Modal
                visible={showSettings}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowSettings(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Server Configuration</Text>
                            <TouchableOpacity onPress={() => setShowSettings(false)}>
                                <X color="#666" size={24} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalLabel}>API Base URL</Text>
                        <View style={styles.inputContainer}>
                            <Server size={20} color="#666" style={styles.icon} />
                            <TextInput
                                style={styles.input}
                                placeholder="https://your-api.com"
                                value={apiUrl}
                                onChangeText={setApiUrl}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>
                        <Text style={styles.helperText}>
                            Enter the root URL of your backend (without /api/v1)
                        </Text>

                        <TouchableOpacity
                            style={[styles.button, styles.saveBtn]}
                            onPress={handleSaveSettings}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                <Check color="white" size={20} />
                                <Text style={styles.buttonText}>Save Configuration</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            <View style={styles.card}>
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Sign in to scan barcodes</Text>

                <View style={styles.inputContainer}>
                    <User size={20} color="#666" style={styles.icon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Username"
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Lock size={20} color="#666" style={styles.icon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                </View>

                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleLogin}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Login</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
        color: '#333',
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 32,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        backgroundColor: '#f9f9f9',
    },
    icon: {
        marginLeft: 12,
        marginRight: 8,
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        paddingRight: 12,
        fontSize: 16,
        color: '#333',
    },
    button: {
        backgroundColor: '#2563eb', // Blue-600
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        backgroundColor: '#93c5fd',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    // Settings UI
    settingsBtn: {
        position: 'absolute',
        top: 50,
        right: 20,
        padding: 10,
        zIndex: 10,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    modalLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4b5563',
        marginBottom: 8,
    },
    helperText: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 4,
        marginBottom: 20,
    },
    saveBtn: {
        backgroundColor: '#059669', // Emerald-600
        marginTop: 0,
    }
});

export default LoginScreen;
