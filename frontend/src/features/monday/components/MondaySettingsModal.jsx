import React, { useState, useEffect } from 'react';
import {
    FiX, FiSave, FiSmartphone, FiSettings, FiCheck, FiRefreshCw,
    FiGlobe, FiMapPin, FiSearch, FiSliders, FiLayout, FiDatabase
} from 'react-icons/fi';
import api from '../../../services/api';

const Toggle = ({ label, description, checked, onChange, icon: Icon, color = "indigo" }) => (
    <label className={`flex items-start justify-between p-4 rounded-xl cursor-pointer transition-all border ${checked ? `bg-${color}-50 border-${color}-200` : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
        <div className="flex gap-4">
            <div className={`mt-0.5 p-2.5 rounded-lg ${checked ? `bg-${color}-100 text-${color}-600` : 'bg-gray-100 text-gray-400'}`}>
                <Icon size={20} />
            </div>
            <div className="flex flex-col">
                <span className={`text-sm font-bold ${checked ? 'text-gray-900' : 'text-gray-600'}`}>{label}</span>
                <span className="text-xs text-gray-500 mt-1 leading-relaxed max-w-xs block">{description}</span>
            </div>
        </div>
        <div className="relative inline-flex items-center cursor-pointer mt-2">
            <input
                type="checkbox"
                className="sr-only peer"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
            <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-${color}-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${checked ? `peer-checked:bg-${color}-600` : ''}`}></div>
        </div>
    </label>
);

const SelectField = ({ label, value, onChange, options, icon: Icon, placeholder = "-- Select --" }) => (
    <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
            {Icon && <Icon className="w-3.5 h-3.5" />} {label}
        </label>
        <div className="relative">
            <select
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                className="block w-full pl-3 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg text-sm shadow-sm placeholder-gray-400
                focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 appearance-none transition-shadow"
            >
                <option value="">{placeholder}</option>
                {options.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                        {opt.title} ({opt.type})
                    </option>
                ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
        </div>
    </div>
);

const MondaySettingsModal = ({
    isOpen,
    onClose,
    boardId, // Current View Board ID (Default)
    columns = [], // Current View Columns (Default)
    connectedBoards = [], // List of boards available for selection
    activeConfig,
    onSaveConfig
}) => {
    const [activeTab, setActiveTab] = useState('mobile');
    const [loading, setLoading] = useState(false);
    const [selectedBoardId, setSelectedBoardId] = useState(null);
    const [boardColumns, setBoardColumns] = useState([]);
    const [isLoadingColumns, setIsLoadingColumns] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        is_mobile_active: true,
        barcode_column_id: '',
        search_column_id: '',
        sort_column_id: 'name',
        sort_direction: 'asc'
    });

    // 1. Initialize State on Open
    useEffect(() => {
        if (isOpen) {
            if (activeConfig && activeConfig.board_id) {
                setSelectedBoardId(activeConfig.board_id);
                setFormData({
                    is_mobile_active: activeConfig.is_mobile_active !== false,
                    barcode_column_id: activeConfig.barcode_column_id || '',
                    search_column_id: activeConfig.search_column_id || '',
                    sort_column_id: activeConfig.sort_column_id || 'name',
                    sort_direction: activeConfig.sort_direction || 'asc'
                });
            } else {
                const isConnected = connectedBoards.some(b => String(b.id) === String(boardId));
                if (isConnected) {
                    setSelectedBoardId(parseInt(boardId));
                } else if (connectedBoards.length > 0) {
                    setSelectedBoardId(connectedBoards[0].id);
                }
                setFormData({
                    is_mobile_active: true,
                    barcode_column_id: '',
                    search_column_id: '',
                    sort_column_id: 'name',
                    sort_direction: 'asc'
                });
            }
        }
    }, [isOpen, activeConfig, boardId, connectedBoards]);

    // 2. Fetch Columns when Board Selection Changes
    useEffect(() => {
        if (!selectedBoardId) return;

        const fetchColumns = async () => {
            setIsLoadingColumns(true);
            try {
                if (String(selectedBoardId) === String(boardId) && columns.length > 0) {
                    setBoardColumns(columns);
                    setIsLoadingColumns(false);
                    return;
                }
                const targetBoard = connectedBoards.find(b => String(b.id) === String(selectedBoardId));
                if (targetBoard && targetBoard.columns) {
                    let cols = [];
                    if (Array.isArray(targetBoard.columns)) {
                        cols = targetBoard.columns;
                    } else if (typeof targetBoard.columns === 'object') {
                        cols = Object.values(targetBoard.columns);
                    }
                    if (cols.length > 0) {
                        setBoardColumns(cols);
                        setIsLoadingColumns(false);
                        return;
                    }
                }
                setBoardColumns([]);
            } catch (e) {
                console.error("Failed to load columns for board", e);
            } finally {
                setIsLoadingColumns(false);
            }
        };

        fetchColumns();
    }, [selectedBoardId, boardId, columns, connectedBoards]);


    const handleSave = async () => {
        if (!selectedBoardId) {
            alert("Please select a Board");
            return;
        }
        if (!formData.barcode_column_id) {
            alert("Please select a Barcode Column");
            return;
        }

        setLoading(true);
        try {
            await onSaveConfig({
                board_id: parseInt(selectedBoardId),
                ...formData,
                display_column_ids: []
            });
            onClose();
        } catch (error) {
            console.error(error);
            alert("Failed to save settings");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    // Filter relevant columns
    const textColumns = boardColumns.filter(c => ['text', 'name', 'numbers'].includes(c.type));

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto font-sans">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" onClick={onClose}>
                    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full ring-1 ring-black/5">

                    {/* Header */}
                    <div className="bg-white px-8 py-6 border-b border-gray-100 flex justify-between items-center sticky top-0 z-10">
                        <div className="flex items-center gap-4">
                            <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600 shadow-sm border border-indigo-100">
                                <FiSettings size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl leading-6 font-bold text-gray-900">Monday Integration Settings</h3>
                                <p className="text-sm text-gray-500 mt-1">Manage global configuration for boards and mobile devices.</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-500 p-2 rounded-full hover:bg-gray-100 transition-colors">
                            <FiX size={24} />
                        </button>
                    </div>

                    <div className="flex min-h-[500px] bg-gray-50/50">
                        {/* Sidebar Tabs */}
                        <div className="w-64 bg-white border-r border-gray-100 p-4 space-y-1">
                            <button
                                onClick={() => setActiveTab('mobile')}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${activeTab === 'mobile' ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                <FiSmartphone size={18} />
                                <span className="flex-1 text-left">Mobile App</span>
                                {activeTab === 'mobile' && <FiCheck className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={() => setActiveTab('general')}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${activeTab === 'general' ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                <FiLayout size={18} />
                                <span className="flex-1 text-left">Display Settings</span>
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 p-8 relative overflow-y-auto max-h-[600px]">
                            {activeTab === 'mobile' && (
                                <div className="space-y-8 animate-in fade-in duration-300">

                                    {/* Section 1: Source Board */}
                                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FiDatabase className="w-5 h-5" /></div>
                                            <h4 className="text-base font-bold text-gray-900">Data Source</h4>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                                                    Active Board (Synced Only)
                                                </label>
                                                <div className="relative">
                                                    <select
                                                        value={selectedBoardId || ''}
                                                        onChange={(e) => {
                                                            setSelectedBoardId(e.target.value);
                                                            setFormData(prev => ({ ...prev, barcode_column_id: '', search_column_id: '' }));
                                                        }}
                                                        className="block w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 shadow-sm focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none cursor-pointer hover:border-indigo-300"
                                                    >
                                                        <option value="">-- Select a Connected Board --</option>
                                                        {connectedBoards.map(board => (
                                                            <option key={board.id} value={board.id}>
                                                                {board.name} (Synched: {board.last_synced_at ? new Date(board.last_synced_at).toLocaleDateString() : 'Never'})
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                                                        <FiSettings className="w-4 h-4" />
                                                    </div>
                                                </div>
                                                {connectedBoards.length === 0 && (
                                                    <p className="text-xs text-red-500 mt-2 flex items-center gap-1 font-medium"><FiSettings /> No connected boards found. Please sync a board first.</p>
                                                )}
                                                <p className="text-xs text-gray-500 mt-2">This board will be used as the primary data source for the mobile scanner app.</p>
                                            </div>

                                            <Toggle
                                                label="Enable Mobile Access"
                                                description="Make this board visible and accessible in the mobile application."
                                                checked={formData.is_mobile_active}
                                                onChange={(val) => setFormData({ ...formData, is_mobile_active: val })}
                                                icon={FiSmartphone}
                                            />
                                        </div>
                                    </div>

                                    {/* Section 2: Column Mapping */}
                                    <div className={`bg-white p-6 rounded-2xl border border-gray-200 shadow-sm transition-opacity duration-300 ${!selectedBoardId ? 'opacity-50 pointer-events-none grayscale-[0.5]' : ''}`}>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><FiSliders className="w-5 h-5" /></div>
                                            <h4 className="text-base font-bold text-gray-900">Field Mapping</h4>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {isLoadingColumns ? (
                                                <div className="col-span-2 text-center py-8 text-gray-500 flex flex-col items-center justify-center gap-2">
                                                    <FiRefreshCw className="animate-spin w-6 h-6 text-indigo-500" />
                                                    <span className="text-sm font-medium">Loading columns definition...</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <SelectField
                                                        label="Barcode Column (Required)"
                                                        value={formData.barcode_column_id}
                                                        onChange={(val) => setFormData({ ...formData, barcode_column_id: val })}
                                                        options={textColumns}
                                                        icon={FiSearch}
                                                        placeholder="-- Select Barcode Column --"
                                                    />

                                                    <SelectField
                                                        label="Search Column (Mobile Search)"
                                                        value={formData.search_column_id}
                                                        onChange={(val) => setFormData({ ...formData, search_column_id: val })}
                                                        options={boardColumns}
                                                        icon={FiSearch}
                                                        placeholder="-- Default Search --"
                                                    />
                                                </>
                                            )}
                                        </div>
                                        <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-500 leading-relaxed border border-gray-100">
                                            <span className="font-bold text-gray-700">Note:</span> The <strong>Barcode Column</strong> is used to match scanned items. Ensure this column contains unique values ( UPC, EAN, SKU).
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'general' && (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400 animate-in fade-in">
                                    <div className="p-4 bg-gray-100 rounded-full mb-4">
                                        <FiSettings className="w-8 h-8" />
                                    </div>
                                    <p className="font-medium">General settings coming soon.</p>
                                    <p className="text-sm">Configure sorting, filtering defaults, and view preferences here.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-white px-8 py-5 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 z-10">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading || !selectedBoardId}
                            className="inline-flex items-center px-6 py-2.5 border border-transparent rounded-xl shadow-lg shadow-indigo-200 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:shadow-none transition-all hover:-translate-y-0.5"
                        >
                            {loading ? <FiRefreshCw className="animate-spin -ml-1 mr-2 h-4 w-4" /> : <FiSave className="-ml-1 mr-2 h-4 w-4" />}
                            Save Configuration
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MondaySettingsModal;
