import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { X, CheckCircle, List, FileText } from 'lucide-react-native';

const SummaryModal = ({ visible, onClose, totalItems, scannedItems }) => {
    const remainingItems = totalItems - scannedItems;
    const progress = totalItems > 0 ? (scannedItems / totalItems) * 100 : 0;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Scan Summary</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={24} color="#6b7280" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.statsContainer}>
                        {/* Total Items */}
                        <View style={styles.statCard}>
                            <View style={[styles.iconContainer, { backgroundColor: '#eff6ff' }]}>
                                <List size={24} color="#2563eb" />
                            </View>
                            <Text style={styles.statValue}>{totalItems}</Text>
                            <Text style={styles.statLabel}>Total Items</Text>
                        </View>

                        {/* Scanned Items */}
                        <View style={styles.statCard}>
                            <View style={[styles.iconContainer, { backgroundColor: '#f0fdf4' }]}>
                                <CheckCircle size={24} color="#16a34a" />
                            </View>
                            <Text style={styles.statValue}>{scannedItems}</Text>
                            <Text style={styles.statLabel}>Scanned</Text>
                        </View>

                        {/* Remaining Items */}
                        <View style={styles.statCard}>
                            <View style={[styles.iconContainer, { backgroundColor: '#fef2f2' }]}>
                                <FileText size={24} color="#dc2626" />
                            </View>
                            <Text style={styles.statValue}>{remainingItems}</Text>
                            <Text style={styles.statLabel}>Remaining</Text>
                        </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressSection}>
                        <View style={styles.progressLabels}>
                            <Text style={styles.progressText}>Progress</Text>
                            <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
                        </View>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                        </View>
                    </View>

                    <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
                        <Text style={styles.doneBtnText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end', // Bottom sheet style
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        minHeight: '40%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    closeBtn: {
        padding: 4,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 32,
    },
    statCard: {
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1f2937',
    },
    statLabel: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '500',
    },
    progressSection: {
        marginBottom: 32,
    },
    progressLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    progressText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4b5563',
    },
    progressPercent: {
        fontSize: 14,
        fontWeight: '700',
        color: '#2563eb',
    },
    progressBarBg: {
        height: 12,
        backgroundColor: '#f3f4f6',
        borderRadius: 6,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#2563eb',
        borderRadius: 6,
    },
    doneBtn: {
        backgroundColor: '#2563eb',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    doneBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default SummaryModal;
