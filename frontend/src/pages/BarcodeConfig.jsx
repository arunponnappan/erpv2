
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Save, RefreshCw, Smartphone, CheckCircle, AlertTriangle } from 'lucide-react';

const BarcodeConfig = () => {
    const [boards, setBoards] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Config State
    const [selectedBoardId, setSelectedBoardId] = useState('');
    const [barcodeColId, setBarcodeColId] = useState('');
    const [searchColId, setSearchColId] = useState(''); // New State
    const [sortColId, setSortColId] = useState('name'); // Sort State
    const [sortDirection, setSortDirection] = useState('asc'); // Sort Direction
    const [displayColIds, setDisplayColIds] = useState([]); // Array of strings

    // Feedback
    const [message, setMessage] = useState(null); // { type: 'success'|'error', text: '' }

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Boards (with columns)
            // Endpoint: /integrations/monday/boards
            const boardsRes = await api.get('/integrations/monday/boards?limit=100');
            setBoards(boardsRes.data || []);

            // 2. Fetch Current Config
            // Endpoint: /integrations/monday/config/barcode
            const configRes = await api.get('/integrations/monday/config/barcode');
            const configs = configRes.data || [];
            if (configs.length > 0) {
                const activeConfig = configs[0]; // For now assume single active config
                setSelectedBoardId(activeConfig.board_id?.toString());
                setBarcodeColId(activeConfig.barcode_column_id);
                setSearchColId(activeConfig.search_column_id || '');
                setSortColId(activeConfig.sort_column_id || 'name');
                setSortDirection(activeConfig.sort_direction || 'asc');
                setDisplayColIds(activeConfig.display_column_ids || []);
            }

        } catch (error) {
            console.error("Failed to load data", error);
            setMessage({ type: 'error', text: "Failed to load boards/config." });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!selectedBoardId || !barcodeColId) {
            setMessage({ type: 'error', text: "Please select a board and a barcode column." });
            return;
        }

        setSaving(true);
        setMessage(null);
        try {
            const payload = {
                board_id: parseInt(selectedBoardId),
                barcode_column_id: barcodeColId,
                search_column_id: searchColId || null,
                sort_column_id: sortColId || 'name',
                sort_direction: sortDirection || 'asc',
                display_column_ids: displayColIds
            };

            await api.post('/integrations/monday/config/barcode', payload);
            setMessage({ type: 'success', text: "Configuration saved successfully!" });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: "Failed to save configuration." });
        } finally {
            setSaving(false);
        }
    };

    // Helper to get columns of selected board
    const getBoardColumns = () => {
        const board = boards.find(b => String(b.id) === String(selectedBoardId));
        return board?.columns || [];
    };

    const columns = getBoardColumns();

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Smartphone className="text-blue-600" />
                        Mobile App Configuration
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Configure the Barcode Scanner App settings.
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                    title="Refresh Data"
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {message && (
                <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                    {message.text}
                </div>
            )}

            <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700 p-6 space-y-6">

                {/* Board Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Target Board
                    </label>
                    <select
                        value={selectedBoardId}
                        onChange={(e) => {
                            setSelectedBoardId(e.target.value);
                            // Reset cols on board change
                            setBarcodeColId('');
                            setDisplayColIds([]);
                        }}
                        className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        disabled={loading}
                    >
                        <option value="">-- Select a Board --</option>
                        {boards.map(b => (
                            <option key={b.id} value={b.id}>
                                {b.name} (ID: {b.id})
                            </option>
                        ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                        Select the Monday.com board that contains your inventory/items.
                    </p>
                </div>

                {selectedBoardId && (
                    <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-gray-100 dark:border-neutral-700">

                        {/* Barcode Column */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Barcode Column (Write Target)
                            </label>
                            <select
                                value={barcodeColId}
                                onChange={(e) => setBarcodeColId(e.target.value)}
                                className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            >
                                <option value="">-- Select Column --</option>
                                {columns.map(col => (
                                    <option key={col.id} value={col.id}>
                                        {col.title} ({col.type})
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1 text-xs text-gray-500">
                                This column will be updated when a barcode is scanned. (Must be 'text')
                            </p>
                        </div>

                        {/* Primary Column (Search & Title) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Primary Column (Title & Search)
                            </label>
                            <select
                                value={searchColId}
                                onChange={(e) => setSearchColId(e.target.value)}
                                className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            >
                                <option value="">Item Name (Default)</option>
                                {columns.map(col => (
                                    <option key={col.id} value={col.id}>
                                        {col.title} ({col.type})
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1 text-xs text-gray-500">
                                This will be the <b>Main Title</b> of items in the app and used for searching.
                            </p>
                        </div>

                        {/* Sorting Configuration */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Default Mobile Sorting
                            </label>
                            <div className="flex gap-2">
                                <select
                                    value={sortColId}
                                    onChange={(e) => setSortColId(e.target.value)}
                                    className="flex-1 p-2.5 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                >
                                    <option value="name">Item Name</option>
                                    {columns.map(col => (
                                        <option key={col.id} value={col.id}>
                                            {col.title}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={sortDirection}
                                    onChange={(e) => setSortDirection(e.target.value)}
                                    className="w-32 p-2.5 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                >
                                    <option value="asc">Ascending (A-Z)</option>
                                    <option value="desc">Descending (Z-A)</option>
                                </select>
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                                This sets the default order of items in the mobile scanner.
                            </p>
                        </div>

                        {/* Display Columns */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Additional Display Columns
                            </label>
                            <div className="max-h-60 overflow-y-auto border border-gray-300 dark:border-neutral-600 rounded-lg p-2 bg-gray-50 dark:bg-neutral-900">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {/* Manual Option for Name */}
                                    <label className="flex items-center gap-2 p-2 hover:bg-white dark:hover:bg-neutral-800 rounded cursor-pointer transition-colors border border-dashed border-gray-300 dark:border-neutral-700">
                                        <input
                                            type="checkbox"
                                            checked={displayColIds.includes('name')}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setDisplayColIds([...displayColIds, 'name']);
                                                } else {
                                                    setDisplayColIds(displayColIds.filter(id => id !== 'name'));
                                                }
                                            }}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Item Name</span>
                                    </label>

                                    {columns.length === 0 ? (
                                        <span className="text-sm text-gray-500 px-2 col-span-2">No other columns found</span>
                                    ) : (
                                        columns.filter(col => col.id !== 'name').map(col => (
                                            <label key={col.id} className="flex items-center gap-2 p-2 hover:bg-white dark:hover:bg-neutral-800 rounded cursor-pointer transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={displayColIds.includes(col.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setDisplayColIds([...displayColIds, col.id]);
                                                        } else {
                                                            setDisplayColIds(displayColIds.filter(id => id !== col.id));
                                                        }
                                                    }}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{col.title} <span className="text-xs text-gray-400">({col.type})</span></span>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                                Select details to show below the title. Check "Item Name" if you want it as a secondary detail.
                            </p>
                        </div>
                    </div>
                )}

                <div className="pt-6 border-t border-gray-100 dark:border-neutral-700 flex justify-between items-center">

                    {/* Reset Button */}
                    <button
                        onClick={async () => {
                            if (!window.confirm("Are you sure you want to clear the configuration? This will reset the mobile app.")) return;
                            setLoading(true);
                            try {
                                await api.delete('/integrations/monday/config/barcode');
                                setMessage({ type: 'success', text: "Configuration cleared." });
                                await fetchData();
                            } catch (e) {
                                setMessage({ type: 'error', text: "Failed to clear configuration." });
                            } finally {
                                setLoading(false);
                            }
                        }}
                        className="text-red-600 hover:text-red-700 text-sm font-medium px-4 py-2 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                    >
                        Reset Configuration
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={saving || loading || !selectedBoardId}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-white font-medium transition-all ${saving || loading || !selectedBoardId
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20'
                            }`}
                    >
                        {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                        Save Configuration
                    </button>
                </div>

                {/* Debug Info */}
                <div className="mt-4 text-xs text-gray-400 font-mono text-center">
                    Current Config Model Board ID: {selectedBoardId || 'None'}
                </div>

            </div>
        </div>
    );
};

export default BarcodeConfig;
