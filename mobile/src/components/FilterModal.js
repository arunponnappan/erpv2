
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { X, Check } from 'lucide-react-native';

const FilterModal = ({ visible, onClose, onApply, currentConfig, columns = [] }) => {
    // Local state for the modal form
    const [searchColumn, setSearchColumn] = useState(currentConfig?.searchColumn || 'all');
    const [sortField, setSortField] = useState(currentConfig?.sortField || 'name');
    const [sortDirection, setSortDirection] = useState(currentConfig?.sortDirection || 'asc');
    const [filterStatus, setFilterStatus] = useState(currentConfig?.filterStatus || 'all');
    const [showDuplicates, setShowDuplicates] = useState(currentConfig?.showDuplicates || false);
    const [matchType, setMatchType] = useState(currentConfig?.matchType || 'contains');

    // Reset local state when modal opens
    useEffect(() => {
        if (visible) {
            setSearchColumn(currentConfig?.searchColumn || 'all');
            setSortField(currentConfig?.sortField || 'name');
            setSortDirection(currentConfig?.sortDirection || 'asc');
            setFilterStatus(currentConfig?.filterStatus || 'all');
            setShowDuplicates(currentConfig?.showDuplicates || false);
            setMatchType(currentConfig?.matchType || 'contains');
        }
    }, [visible, currentConfig]);

    const handleApply = () => {
        onApply({
            searchColumn,
            sortField,
            sortDirection,
            filterStatus,
            showDuplicates,
            matchType
        });
        onClose();
    };

    const handleClear = () => {
        setSearchColumn('all');
        setSortField('name');
        setSortDirection('asc');
        setFilterStatus('all');
        setShowDuplicates(false);
        setMatchType('contains');
    };

    const renderChip = (label, isSelected, onPress, key) => (
        <TouchableOpacity
            key={key}
            style={[styles.chip, isSelected && styles.chipActive]}
            onPress={onPress}
        >
            <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Sort & Filter</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={24} color="#6b7280" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollContent}>
                        {/* 0. Search Column */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Filter By Column</Text>
                            <View style={styles.row}>
                                {renderChip("All Columns (Default)", searchColumn === 'all', () => setSearchColumn('all'))}
                                {renderChip("Name", searchColumn === 'name', () => setSearchColumn('name'))}
                                {columns.map(col => (
                                    renderChip(
                                        col.title || col.id,
                                        searchColumn === col.id,
                                        () => setSearchColumn(col.id),
                                        `search-${col.id}`
                                    )
                                ))}
                            </View>
                        </View>

                        {/* 1. Sort Field */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Sort Column</Text>
                            <View style={styles.row}>
                                {renderChip("Name", sortField === 'name', () => setSortField('name'))}
                                {columns.map(col => (
                                    renderChip(
                                        col.title || col.id,
                                        sortField === col.id,
                                        () => setSortField(col.id),
                                        col.id // Pass key
                                    )
                                ))}
                            </View>
                        </View>

                        {/* 2. Sort Direction */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Sort Order</Text>
                            <View style={styles.row}>
                                {renderChip("Ascending (A-Z)", sortDirection === 'asc', () => setSortDirection('asc'))}
                                {renderChip("Descending (Z-A)", sortDirection === 'desc', () => setSortDirection('desc'))}
                            </View>
                        </View>

                        {/* 2. Status Filter */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Status</Text>
                            <View style={styles.row}>
                                {renderChip("All", filterStatus === 'all', () => setFilterStatus('all'))}
                                {renderChip("Assigned", filterStatus === 'assigned', () => setFilterStatus('assigned'))}
                                {renderChip("Missing", filterStatus === 'missing', () => setFilterStatus('missing'))}
                            </View>
                        </View>

                        {/* 3. Advanced Rules */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Advanced Rules</Text>

                            {/* Duplicate Toggle */}
                            <View style={styles.settingRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.settingLabel}>Show Duplicates Only</Text>
                                    <Text style={styles.settingDesc}>Find items sharing the same search value</Text>
                                </View>
                                <Switch
                                    value={showDuplicates}
                                    onValueChange={setShowDuplicates}
                                    trackColor={{ false: "#d1d5db", true: "#bfdbfe" }}
                                    thumbColor={showDuplicates ? "#2563eb" : "#f3f4f6"}
                                />
                            </View>

                            {/* Match Type */}
                            <View style={{ marginTop: 15 }}>
                                <Text style={[styles.settingLabel, { marginBottom: 8 }]}>Search Match Type</Text>
                                <View style={styles.row}>
                                    {renderChip("Contains", matchType === 'contains', () => setMatchType('contains'))}
                                    {renderChip("Exact Match", matchType === 'exact', () => setMatchType('exact'))}
                                    {renderChip("Does Not Contain", matchType === 'does_not_contain', () => setMatchType('does_not_contain'))}
                                    {renderChip("Not Equal (Is Not)", matchType === 'not_equal', () => setMatchType('not_equal'))}
                                    {renderChip("Is Not Empty", matchType === 'is_not_empty', () => setMatchType('is_not_empty'))}
                                    {renderChip("Is Empty", matchType === 'is_empty', () => setMatchType('is_empty'))}
                                </View>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Footer Actions */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
                            <Text style={styles.clearBtnText}>Reset</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
                            <Text style={styles.applyBtnText}>Apply Filters</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '75%',
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    closeBtn: {
        padding: 4,
    },
    scrollContent: {
        flex: 1,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    chipActive: {
        backgroundColor: '#eff6ff',
        borderColor: '#2563eb',
    },
    chipText: {
        fontSize: 14,
        color: '#4b5563',
        fontWeight: '500',
    },
    chipTextActive: {
        color: '#2563eb',
        fontWeight: '700',
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    settingLabel: {
        fontSize: 16,
        color: '#1f2937',
        fontWeight: '500',
    },
    settingDesc: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2,
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    clearBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        alignItems: 'center',
        justifyContent: 'center',
    },
    clearBtnText: {
        color: '#6b7280',
        fontWeight: '600',
        fontSize: 16,
    },
    applyBtn: {
        flex: 2,
        backgroundColor: '#2563eb',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    applyBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default FilterModal;
