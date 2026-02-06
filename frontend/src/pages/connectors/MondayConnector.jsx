import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import marketplaceService from '../../services/marketplaceService';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useCompany } from '../../context/CompanyContext';
import { useLayout } from '../../context/LayoutContext';
import {
    FiArrowLeft, FiSave, FiCheckCircle, FiAlertCircle, FiRefreshCw, FiUsers, FiLock, FiX,
    FiSmartphone, FiLayout, FiDatabase, FiSliders, FiSearch, FiSettings, FiCheck, FiBox, FiTrash2
} from 'react-icons/fi';
import JobHistoryPanel from '../../features/monday/components/sync/JobHistoryPanel';

// --- Helper Components ---
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

const MondayConnector = () => {
    const { installedAppId } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const { setHeader } = useLayout();
    const { currentCompany } = useCompany();

    // UI State
    const [activeTab, setActiveTab] = useState('general'); // general, boards, mobile

    // General Settings State
    const [apiKey, setApiKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('unknown'); // unknown, success, error

    // Boards State
    const [boards, setBoards] = useState([]);
    const [selectedBoards, setSelectedBoards] = useState([]); // Configuration: IDs of boards to show in app
    const [searchTerm, setSearchTerm] = useState(''); // Board Search Filter

    // Permissions & Access State
    const [permissions, setPermissions] = useState({});
    const [cardColumns, setCardColumns] = useState({});
    const [cardActions, setCardActions] = useState({});
    const [users, setUsers] = useState([]);
    const [accessModal, setAccessModal] = useState({ isOpen: false, boardId: null, boardName: "", currentAccess: [] });
    const [selectedAccessUsers, setSelectedAccessUsers] = useState([]);
    const [accessLoading, setAccessLoading] = useState(false);

    // Mobile App Config State
    const [mobileConfig, setMobileConfig] = useState({
        is_mobile_active: true,
        barcode_column_id: '',
        search_column_id: '',
        sort_column_id: 'name',
        sort_direction: 'asc',
        display_column_ids: [], // New: Required by Backend DTO
        board_id: '' // Selected Board for Mobile
    });
    const [activeMobileBoardColumns, setActiveMobileBoardColumns] = useState([]);
    const [isLoadingMobileColumns, setIsLoadingMobileColumns] = useState(false);
    const [showSyncPanel, setShowSyncPanel] = useState(false);


    const [deleteModal, setDeleteModal] = useState({ isOpen: false, boardId: null, boardName: "" });
    const [isDeleting, setIsDeleting] = useState(false);

    // --- Initialization ---

    const handleBoardDelete = async () => {
        if (!deleteModal.boardId) return;
        setIsDeleting(true);
        try {
            await api.delete(`/integrations/monday/boards/${deleteModal.boardId}`);
            toast.success("Success", "Board data deleted successfully");
            setDeleteModal({ isOpen: false, boardId: null, boardName: "" });
            // Refresh boards to update stats (should clear)
            fetchBoards();
        } catch (e) {
            console.error(e);
            toast.error("Error", "Failed to delete board data");
        } finally {
            setIsDeleting(false);
        }
    };

    useEffect(() => {
        setHeader('Monday.com Connector');
        fetchInitialData();
    }, [installedAppId]);

    const fetchInitialData = async () => {
        try {
            // 1. Fetch App Settings
            const apps = await marketplaceService.getInstalledApps();
            const currentApp = apps.find(a => a.id === parseInt(installedAppId));

            if (currentApp && currentApp.settings) {
                if (currentApp.settings.api_key) setApiKey(currentApp.settings.api_key);
                if (currentApp.settings.selected_board_ids) setSelectedBoards(currentApp.settings.selected_board_ids);
                if (currentApp.settings.column_permissions) setPermissions(currentApp.settings.column_permissions);
                if (currentApp.settings.card_columns) setCardColumns(currentApp.settings.card_columns);
                if (currentApp.settings.card_actions) setCardActions(currentApp.settings.card_actions);

                // Auto Test Connection
                if (currentApp.settings.api_key) {
                    testConnection(currentApp.settings.api_key, true);
                }
            }

            // 2. Fetch Mobile Config
            fetchMobileConfig();

        } catch (error) {
            console.error("Failed to fetch initial settings", error);
        }
    };

    const fetchMobileConfig = async () => {
        try {
            const { data } = await api.get('/integrations/monday/config/barcode');
            if (data && data.board_id) {
                setMobileConfig({
                    is_mobile_active: data.is_mobile_active !== false,
                    barcode_column_id: data.barcode_column_id || '',
                    search_column_id: data.search_column_id || '',
                    sort_column_id: data.sort_column_id || 'name',
                    sort_direction: data.sort_direction || 'asc',
                    display_column_ids: data.display_column_ids || [],
                    board_id: data.board_id
                });
            }
        } catch (error) {
            console.warn("No existing mobile config or failed to fetch", error);
        }
    };

    // --- Actions ---

    const testConnection = async (key = apiKey, silent = false) => {
        try {
            if (!silent) setConnectionStatus('checking');
            await marketplaceService.monday.testConnection(key);
            setConnectionStatus('success');
            if (!silent) toast.success('Success', 'Connected to Monday.com');
            fetchBoards(key);
        } catch (error) {
            setConnectionStatus('error');
            if (!silent) toast.error('Error', 'Failed to connect. Check API Key.');
        }
    };

    const fetchBoards = async (key = apiKey) => {
        try {
            const data = await marketplaceService.monday.getBoards(100, key);
            setBoards(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSaveGeneral = async () => {
        if (!apiKey) return toast.error('Error', 'API Key Required');
        setLoading(true);
        try {
            await marketplaceService.updateSettings(installedAppId, {
                api_key: apiKey,
                selected_board_ids: selectedBoards,
                column_permissions: permissions,
                card_columns: cardColumns,
                card_actions: cardActions
            });
            toast.success('Saved', 'General settings updated');
            testConnection();
        } catch (error) {
            toast.error('Error', 'Failed to save settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveMobile = async () => {
        if (!mobileConfig.board_id) return toast.error('Error', 'Please select a source board');
        if (!mobileConfig.barcode_column_id) return toast.error('Error', 'Barcode Column is required');

        setLoading(true);
        try {
            // Save to Backend
            const { data } = await api.post('/integrations/monday/config/barcode', {
                board_id: parseInt(mobileConfig.board_id),
                ...mobileConfig
            });
            toast.success('Saved', 'Mobile configuration updated');

            // Open Sync Panel if a job was triggered
            if (data.sync_triggered) {
                setShowSyncPanel(true);
            }
        } catch (error) {
            console.error(error);
            toast.error('Error', 'Failed to save mobile config');
        } finally {
            setLoading(false);
        }
    };


    // --- Mobile Logic: Fetch Columns when Board Selected ---
    useEffect(() => {
        if (!mobileConfig.board_id) return;

        const board = boards.find(b => String(b.id) === String(mobileConfig.board_id));
        if (board && board.columns) {
            setActiveMobileBoardColumns(Array.isArray(board.columns) ? board.columns : Object.values(board.columns));
        } else {
            setActiveMobileBoardColumns([]);
        }
    }, [mobileConfig.board_id, boards]);

    // --- Access Management Logic ---
    const fetchUsers = async () => {
        if (users.length > 0) return;
        try {
            const { data } = await api.get('/users/', { params: { company_id: currentCompany?.id } });
            setUsers(data);
        } catch (error) { console.error(error); }
    };

    const handlePermissionsClick = async (e, board) => {
        e.preventDefault(); e.stopPropagation();
        setAccessLoading(true);
        try {
            await fetchUsers();
            const { data } = await api.get(`/integrations/monday/access/users/${board.id}`);
            const userIds = (data.user_ids || []).map(id => parseInt(id));
            setAccessModal({ isOpen: true, boardId: board.id, boardName: board.name, currentAccess: userIds });
            setSelectedAccessUsers(userIds);
        } catch (error) { toast.error("Error", "Failed to fetch access details"); }
        finally { setAccessLoading(false); }
    };

    const handleSaveAccess = async () => {
        const { boardId, currentAccess } = accessModal;
        const toGrant = selectedAccessUsers.filter(id => !currentAccess.includes(id));
        const toRevoke = currentAccess.filter(id => !selectedAccessUsers.includes(id));

        try {
            setAccessLoading(true);
            const promises = [];
            if (toGrant.length > 0) promises.push(api.post('/integrations/monday/access/grant', { board_id: boardId, user_ids: toGrant }));
            if (toRevoke.length > 0) promises.push(api.post('/integrations/monday/access/revoke', { board_id: boardId, user_ids: toRevoke }));
            await Promise.all(promises);
            toast.success("Success", "Permissions updated");
            setAccessModal({ ...accessModal, isOpen: false });
        } catch (error) { toast.error("Error", "Failed to update permissions"); }
        finally { setAccessLoading(false); }
    };


    // --- Render Helpers ---

    return (
        <div className="flex h-[calc(100vh-64px)] bg-gray-50">
            {/* Sidebar */}
            <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-6 border-b border-gray-100">
                    <button onClick={() => navigate('/apps')} className="flex items-center text-gray-500 hover:text-gray-900 mb-4 text-sm font-medium transition-colors">
                        <FiArrowLeft className="mr-2" /> Back to Apps
                    </button>
                    <div className="flex items-center gap-3">
                        <img src="https://cdn-icons-png.flaticon.com/512/5968/5968875.png" alt="Monday" className="w-8 h-8" />
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 leading-tight">Monday</h2>
                            <p className="text-xs text-gray-500">Connector</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    <SidebarItem
                        active={activeTab === 'general'}
                        onClick={() => setActiveTab('general')}
                        icon={FiSettings}
                        label="General Settings"
                        description="API Key & Connection"
                    />
                    <SidebarItem
                        active={activeTab === 'boards'}
                        onClick={() => setActiveTab('boards')}
                        icon={FiLayout}
                        label="Boards Visibility"
                        description="Select visible boards"
                        badge={selectedBoards.length}
                    />
                    <SidebarItem
                        active={activeTab === 'mobile'}
                        onClick={() => setActiveTab('mobile')}
                        icon={FiSmartphone}
                        label="Mobile App"
                        description="Scanner & App Config"
                    />
                </nav>

                <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                    <div className={`rounded-lg p-3 flex items-center gap-3 border ${connectionStatus === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        {connectionStatus === 'success' ? <FiCheckCircle className="text-green-600" /> : <FiAlertCircle className="text-red-500" />}
                        <div>
                            <p className={`text-xs font-bold uppercase ${connectionStatus === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                                {connectionStatus === 'success' ? 'Systems Online' : 'Check Connection'}
                            </p>
                            <p className="text-[10px] text-gray-500">Last checked: Just now</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-8 relative">
                <div className="max-w-4xl mx-auto space-y-8 pb-20">

                    {/* --- GENERAL TAB --- */}
                    {activeTab === 'general' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">General Settings</h1>
                                    <p className="text-gray-500 text-sm mt-1">Manage your API connection and global preferences.</p>
                                </div>
                                <SaveButton onClick={handleSaveGeneral} loading={loading} />
                            </div>

                            <Card title="Connection & Authentication" icon={FiLock} color="blue">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Monday.com API V2 Token</label>
                                        <div className="flex gap-3">
                                            <input
                                                type="password"
                                                value={apiKey}
                                                onChange={(e) => setApiKey(e.target.value)}
                                                placeholder="Enter your Monday.com API Token"
                                                className="flex-1 rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-3 border font-mono"
                                            />
                                            <button
                                                onClick={() => testConnection()}
                                                className="px-6 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 font-bold text-sm hover:bg-gray-50 transition-colors shadow-sm"
                                            >
                                                Test
                                            </button>
                                        </div>
                                        <p className="mt-2 text-xs text-gray-500">
                                            Used to authenticate requests. Ensure this token has scope to read boards and read/write items.
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* --- BOARDS TAB --- */}
                    {activeTab === 'boards' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">Board Visibility</h1>
                                    <p className="text-gray-500 text-sm mt-1">Choose which boards are synced and visible in the ERP system.</p>
                                </div>
                                <SaveButton onClick={handleSaveGeneral} loading={loading} />
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                {/* Search */}
                                <div className="relative">
                                    <FiSearch className="absolute left-4 top-3.5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search boards by name..."
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                                    />
                                </div>

                                {/* Boards List */}
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                    {boards.length === 0 ? (
                                        <div className="p-12 text-center text-gray-500">
                                            <FiRefreshCw className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                                            <p>No boards found. Check API connection.</p>
                                        </div>
                                    ) : (
                                        <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-100">
                                            {boards.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase())).map(board => {
                                                const isSelected = selectedBoards.includes(board.id);
                                                return (
                                                    <div key={board.id} className={`p-4 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-indigo-50/30' : ''}`}>
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-4">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) setSelectedBoards(prev => [...prev, board.id]);
                                                                        else setSelectedBoards(prev => prev.filter(id => id !== board.id));
                                                                    }}
                                                                    className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                                />
                                                                <div>
                                                                    <p className="text-sm font-bold text-gray-900">{board.name}</p>
                                                                    <p className="text-xs text-gray-500 capitalize">{board.state} • ID: {board.id}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={(e) => handlePermissionsClick(e, board)}
                                                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
                                                                >
                                                                    <FiUsers size={14} /> Access
                                                                </button>
                                                            </div>
                                                        </div>
                                                        {/* Inline Settings for Columns if Selected */}
                                                        {isSelected && (
                                                            <div className="mt-4 pl-9 space-y-4 border-t border-gray-100/50 pt-4">
                                                                {/* Stats Row */}
                                                                <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-2">
                                                                    <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100">
                                                                        <FiRefreshCw className="w-3 h-3 text-indigo-400" />
                                                                        <span className="font-medium text-gray-700">Last Sync:</span>
                                                                        <span>{board.last_synced_at ? new Date(board.last_synced_at).toLocaleString() : 'Never'}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100">
                                                                        <FiDatabase className="w-3 h-3 text-blue-400" />
                                                                        <span className="font-medium text-gray-700">Items:</span>
                                                                        <span>{board.last_sync_item_count || 0}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100">
                                                                        <FiBox className="w-3 h-3 text-teal-400" />
                                                                        <span className="font-medium text-gray-700">Size:</span>
                                                                        <span>{board.last_sync_size_bytes ? (board.last_sync_size_bytes / (1024 * 1024)).toFixed(2) + ' MB' : '0 MB'}</span>
                                                                    </div>
                                                                    <div className="flex-1 text-right">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setDeleteModal({ isOpen: true, boardId: board.id, boardName: board.name });
                                                                            }}
                                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors text-xs font-bold flex items-center justify-end gap-1 ml-auto"
                                                                            title="Delete Local Data"
                                                                        >
                                                                            <FiTrash2 className="w-3 h-3" /> Delete Data
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                <ColumnSelector
                                                                    title="Card Visible Fields"
                                                                    columns={board.columns}
                                                                    selected={cardColumns[board.id] || []}
                                                                    onChange={(cols) => setCardColumns({ ...cardColumns, [board.id]: cols })}
                                                                    color="blue"
                                                                />
                                                                <ColumnSelector
                                                                    title="Editable Fields"
                                                                    columns={board.columns}
                                                                    selected={permissions[board.id] || []}
                                                                    onChange={(cols) => setPermissions({ ...permissions, [board.id]: cols })}
                                                                    color="green"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- MOBILE TAB --- */}
                    {activeTab === 'mobile' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">Mobile Scanner</h1>
                                    <p className="text-gray-500 text-sm mt-1">Configure the official mobile app and barcode scanning logic.</p>
                                </div>
                                <SaveButton onClick={handleSaveMobile} loading={loading} />
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                <Card title="Source Configuration" icon={FiDatabase} color="indigo">
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                                Active Scanner Board
                                            </label>
                                            <select
                                                value={mobileConfig.board_id}
                                                onChange={(e) => setMobileConfig({ ...mobileConfig, board_id: e.target.value, barcode_column_id: '' })}
                                                className="block w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 shadow-sm focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="">-- Select a Connected Board --</option>
                                                {boards.filter(b => b.last_synced_at).map(board => (
                                                    <option key={board.id} value={board.id}>
                                                        {board.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="text-xs text-gray-500 mt-2">Only synced boards (enabled in "Boards Visibility") are available.</p>
                                        </div>

                                        <Toggle
                                            label="Enable Mobile App Access"
                                            description="Allow the mobile app to access this board securely."
                                            checked={mobileConfig.is_mobile_active}
                                            onChange={(val) => setMobileConfig({ ...mobileConfig, is_mobile_active: val })}
                                            icon={FiSmartphone}
                                        />
                                    </div>
                                </Card>

                                <div className={`transition-opacity duration-300 ${!mobileConfig.board_id ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <Card title="Field Mapping" icon={FiSliders} color="purple">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <SelectField
                                                label="Barcode Column (Primary Key)"
                                                value={mobileConfig.barcode_column_id}
                                                onChange={(val) => setMobileConfig({ ...mobileConfig, barcode_column_id: val })}
                                                options={activeMobileBoardColumns.filter(c => ['text', 'numbers'].includes(c.type))}
                                                icon={FiSearch}
                                                placeholder="-- Select Barcode Column --"
                                            />
                                            <SelectField
                                                label="Search Column (Secondary)"
                                                value={mobileConfig.search_column_id}
                                                onChange={(val) => setMobileConfig({ ...mobileConfig, search_column_id: val })}
                                                options={activeMobileBoardColumns}
                                                icon={FiSearch}
                                                placeholder="-- Default Search --"
                                            />

                                        </div>
                                        <div className="mt-6">
                                            <ColumnSelector
                                                title="Mobile Card Visible Fields"
                                                columns={activeMobileBoardColumns}
                                                selected={mobileConfig.display_column_ids || []}
                                                onChange={(cols) => setMobileConfig({ ...mobileConfig, display_column_ids: cols })}
                                                color="indigo"
                                            />
                                            <p className="text-xs text-gray-400 mt-2">Select fields to show on the mobile item card.</p>
                                        </div>
                                        <div className="mt-4 p-3 bg-indigo-50 rounded-lg text-xs text-indigo-700 leading-relaxed border border-indigo-100 flex items-start gap-2">
                                            <FiRefreshCw className="mt-0.5 shrink-0" />
                                            <span>
                                                Changes here will trigger a background sync to update the local database schema.
                                            </span>
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteModal.isOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen p-4 text-center">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => !isDeleting && setDeleteModal({ ...deleteModal, isOpen: false })}></div>
                        <div className="inline-block bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:max-w-md sm:w-full p-6 relative z-10">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                                <FiTrash2 className="h-6 w-6 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Delete Board Data?</h3>
                            <p className="text-sm text-gray-500 text-center mb-6">
                                Are you sure you want to delete all local data for <b>{deleteModal.boardName}</b>?
                                <br /><br />
                                This includes all items, downloaded images, and sync history.
                                The board configuration and visibility settings will remain.
                            </p>
                            <div className="flex justify-center gap-3">
                                <button
                                    onClick={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                                    disabled={isDeleting}
                                    className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleBoardDelete}
                                    disabled={isDeleting}
                                    className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors flex items-center gap-2"
                                >
                                    {isDeleting && <FiRefreshCw className="animate-spin w-4 h-4" />}
                                    {isDeleting ? 'Deleting...' : 'Yes, Delete Everything'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Permissions Modal */}
            {accessModal.isOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen p-4 text-center">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setAccessModal({ ...accessModal, isOpen: false })}></div>
                        <div className="inline-block bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full p-6 relative z-10">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <FiUsers className="text-indigo-600" /> Manage Access: {accessModal.boardName}
                            </h3>
                            <div className="max-h-60 overflow-y-auto custom-scrollbar border rounded-xl p-2 mb-6">
                                {users.length === 0 ? <p className="text-sm text-gray-500 p-2">No users found.</p> : (
                                    <div className="space-y-1">
                                        {users.map(u => (
                                            <label key={u.id} className="flex items-center space-x-3 p-2.5 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                                    checked={selectedAccessUsers.includes(u.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedAccessUsers(prev => [...prev, u.id]);
                                                        else setSelectedAccessUsers(prev => prev.filter(id => id !== u.id));
                                                    }}
                                                />
                                                <div>
                                                    <span className="block text-sm font-bold text-gray-900">{u.full_name}</span>
                                                    <span className="block text-xs text-gray-500">{u.role}</span>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setAccessModal({ ...accessModal, isOpen: false })} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                                <button onClick={handleSaveAccess} disabled={accessLoading} className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors">{accessLoading ? 'Saving...' : 'Save Changes'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <JobHistoryPanel isOpen={showSyncPanel} onClose={() => setShowSyncPanel(false)} />
        </div>
    );
};

// --- Sub-components for Cleanliness ---

const SidebarItem = ({ active, onClick, icon: Icon, label, description, badge }) => (
    <button onClick={onClick} className={`w-full flex items-start gap-4 p-3 rounded-xl transition-all duration-200 group ${active ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200' : 'text-gray-600 hover:bg-gray-50'}`}>
        <div className={`mt-1 ${active ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
            <Icon size={20} />
        </div>
        <div className="flex-1 text-left">
            <div className="flex justify-between items-center">
                <span className={`font-bold text-sm ${active ? 'text-gray-900' : 'text-gray-700'}`}>{label}</span>
                {badge > 0 && <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{badge}</span>}
            </div>
            <p className="text-xs text-gray-500 leading-tight mt-0.5">{description}</p>
        </div>
    </button>
);

const Card = ({ title, icon: Icon, color, children }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/30 flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-${color}-50 text-${color}-600`}>
                <Icon size={18} />
            </div>
            <h3 className="font-bold text-gray-900">{title}</h3>
        </div>
        <div className="p-6">
            {children}
        </div>
    </div>
);

const SaveButton = ({ onClick, loading }) => (
    <button
        onClick={onClick}
        disabled={loading}
        className="inline-flex items-center px-6 py-2.5 border border-transparent rounded-xl shadow-lg shadow-indigo-200 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:shadow-none transition-all hover:-translate-y-0.5"
    >
        {loading ? <FiRefreshCw className="animate-spin -ml-1 mr-2 h-4 w-4" /> : <FiSave className="-ml-1 mr-2 h-4 w-4" />}
        Save Changes
    </button>
);

const ColumnSelector = ({ title, columns, selected, onChange, color }) => (
    <div>
        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{title}</h4>
        <div className="flex flex-wrap gap-2">
            {(columns || []).map(col => (
                <label key={col.id} className={`inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs cursor-pointer border transition-all ${selected.includes(col.id) ? `bg-${color}-50 border-${color}-200 text-${color}-700 font-bold ring-1 ring-${color}-200` : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    <input
                        type="checkbox"
                        className="hidden"
                        checked={selected.includes(col.id)}
                        onChange={(e) => {
                            if (e.target.checked) onChange([...selected, col.id]);
                            else onChange(selected.filter(id => id !== col.id));
                        }}
                    />
                    {col.title}
                </label>
            ))}
            {(columns || []).length === 0 && <span className="text-xs text-gray-400 italic">No columns available</span>}
        </div>
    </div>
);

export default MondayConnector;
