import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import marketplaceService from '../../services/marketplaceService';
import api from '../../services/api'; // Add api import
import { useToast } from '../../context/ToastContext';
import { useCompany } from '../../context/CompanyContext'; // Needed for company_id
import { useLayout } from '../../context/LayoutContext'; // Added
import { FiArrowLeft, FiSave, FiCheckCircle, FiAlertCircle, FiRefreshCw, FiUsers, FiLock, FiX } from 'react-icons/fi'; // Add new icons

const MondayConnector = () => {
    const { installedAppId } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const { setHeader } = useLayout(); // Added

    const [apiKey, setApiKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('unknown'); // unknown, success, error
    const [boards, setBoards] = useState([]);
    const [selectedBoards, setSelectedBoards] = useState([]); // Configuration: IDs of boards to show in app
    const [searchTerm, setSearchTerm] = useState(''); // Board Search Filter

    // Column Permissions State: { board_id: [col_id_1, col_id_2] }
    const [permissions, setPermissions] = useState({});

    // Card View Columns State: { board_id: [col_id_1, col_id_2] } - Columns to show on card
    const [cardColumns, setCardColumns] = useState({});

    // Card Actions State: { board_id: [col_id_1, col_id_2] } - Columns to show as actions in footer
    const [cardActions, setCardActions] = useState({});

    // Permission Logic
    const { currentCompany } = useCompany();
    const [users, setUsers] = useState([]);
    const [accessModal, setAccessModal] = useState({ isOpen: false, boardId: null, boardName: "", currentAccess: [] });
    const [selectedAccessUsers, setSelectedAccessUsers] = useState([]);
    const [accessLoading, setAccessLoading] = useState(false);

    const fetchUsers = async () => {
        if (users.length > 0) return;
        try {
            const { data } = await api.get('/users/', { params: { company_id: currentCompany?.id } });
            setUsers(data);
        } catch (error) {
            console.error(error);
            toast.error("Error", "Failed to fetch users");
        }
    };

    const handlePermissionsClick = async (e, board) => {
        e.preventDefault(); // Prevent checkbox toggle
        e.stopPropagation();
        setAccessLoading(true);
        try {
            await fetchUsers();
            const { data } = await api.get(`/integrations/monday/access/users/${board.id}`);
            // Ensure IDs are integers
            const userIds = (data.user_ids || []).map(id => parseInt(id));
            setAccessModal({
                isOpen: true,
                boardId: board.id,
                boardName: board.name,
                currentAccess: userIds
            });
            setSelectedAccessUsers(userIds);
        } catch (error) {
            console.error(error);
            toast.error("Error", "Failed to fetch access details");
        } finally {
            setAccessLoading(false);
        }
    };

    const handleSaveAccess = async () => {
        const boardId = accessModal.boardId;
        const current = accessModal.currentAccess;
        const selected = selectedAccessUsers;

        // Calculate Diff
        const toGrant = selected.filter(id => !current.includes(id));
        const toRevoke = current.filter(id => !selected.includes(id));

        try {
            setAccessLoading(true);
            const promises = [];
            if (toGrant.length > 0) {
                promises.push(api.post('/integrations/monday/access/grant', { board_id: boardId, user_ids: toGrant }));
            }
            if (toRevoke.length > 0) {
                promises.push(api.post('/integrations/monday/access/revoke', { board_id: boardId, user_ids: toRevoke }));
            }
            await Promise.all(promises);
            toast.success("Success", "Permissions updated");
            setAccessModal({ ...accessModal, isOpen: false });
        } catch (error) {
            console.error(error);
            toast.error("Error", "Failed to update permissions");
        } finally {
            setAccessLoading(false);
        }
    };

    useEffect(() => {
        setHeader('Monday.com Connector'); // Set Header
        // Fetch current settings to populate API key (if we want) and selected boards
        const fetchSettings = async () => {
            try {
                const apps = await marketplaceService.getInstalledApps();
                // Find current app
                const currents = apps.find(a => a.id === parseInt(installedAppId));
                if (currents && currents.settings) {
                    if (currents.settings.api_key) setApiKey(currents.settings.api_key);
                    if (currents.settings.selected_board_ids) setSelectedBoards(currents.settings.selected_board_ids);
                    if (currents.settings.column_permissions) setPermissions(currents.settings.column_permissions);
                    if (currents.settings.card_columns) setCardColumns(currents.settings.card_columns);
                    if (currents.settings.card_actions) setCardActions(currents.settings.card_actions);

                    // If we have an API key, auto-test connection
                    if (currents.settings.api_key) {
                        setConnectionStatus('checking');
                        try {
                            // Verify with the fetched key
                            await marketplaceService.monday.testConnection(currents.settings.api_key);
                            setConnectionStatus('success');
                            fetchBoards();
                        } catch (e) {
                            setConnectionStatus('error');
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to fetch settings", error);
            }
        };
        fetchSettings();
    }, [installedAppId]);

    const handleSaveSettings = async () => {
        if (!apiKey) {
            toast.error('Error', 'Please enter an API Key');
            return;
        }
        setLoading(true);
        try {
            await marketplaceService.updateSettings(installedAppId, {
                api_key: apiKey,
                selected_board_ids: selectedBoards,
                column_permissions: permissions, // Save permissions
                card_columns: cardColumns, // Save card columns
                card_actions: cardActions // Save card actions
            });
            toast.success('Success', 'Settings saved successfully');
            // After save, try to test connection
            testConnection();
        } catch (error) {
            console.error(error);
            toast.error('Error', 'Failed to save settings');
        } finally {
            setLoading(false);
        }
    };

    const testConnection = async () => {
        try {
            setConnectionStatus('checking');
            await marketplaceService.monday.testConnection(apiKey);
            setConnectionStatus('success');
            toast.success('Success', 'Connected to Monday.com successfully');
            fetchBoards();
        } catch (error) {
            setConnectionStatus('error');
            toast.error('Error', 'Failed to connect. Check API Key.');
        }
    };

    const fetchBoards = async () => {
        try {
            // Pass apiKey if available (e.g. during test connection before save)
            const data = await marketplaceService.monday.getBoards(100, apiKey);
            setBoards(data);
        } catch (error) {
            console.error(error);
            const errMsg = error.response?.data?.detail || error.message || "Failed to fetch boards";
            toast.error('Error', `Failed to load boards: ${errMsg}`);
            setConnectionStatus('error');
        }
    };

    return (
        <div className="p-6">
            <button
                onClick={() => navigate('/apps')}
                className="flex items-center text-gray-500 hover:text-gray-900 mb-6"
            >
                <FiArrowLeft className="mr-2" /> Back to Installed Apps
            </button>

            <div className="bg-white rounded-lg shadow p-6 border border-gray-100 mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                    <img
                        src="https://cdn-icons-png.flaticon.com/512/5968/5968875.png"
                        alt="Monday"
                        className="w-10 h-10 mr-4"
                    />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 leading-tight">Monday.com Configuration</h1>
                        <p className="text-sm text-gray-500 mt-1">Connect your Monday.com workspace and configure visible data.</p>
                    </div>
                </h1>

                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-bold text-gray-900">Connection Settings</h2>
                            <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center ${connectionStatus === 'success' ? 'bg-green-100 text-green-700' : connectionStatus === 'error' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                                {connectionStatus === 'success' && <FiCheckCircle className="mr-1.5" />}
                                {connectionStatus === 'error' && <FiAlertCircle className="mr-1.5" />}
                                {connectionStatus === 'checking' ? 'Connecting...' : connectionStatus === 'success' ? 'Connected' : connectionStatus === 'error' ? 'Error' : 'Not Connected'}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Monday.com API Token
                                </label>
                                <div className="flex gap-3">
                                    <input
                                        type="password"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        placeholder="Enter your Monday.com API Token"
                                        className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-3 border"
                                    />
                                    {connectionStatus !== 'checking' && (
                                        <button
                                            onClick={testConnection}
                                            className="px-6 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                                        >
                                            Connect
                                        </button>
                                    )}
                                </div>
                                <p className="mt-2 text-xs text-gray-500">
                                    Your API token is used to sync boards and items securely.
                                </p>
                            </div>
                        </div>
                    </div>





                    {/* Board Selection Configuration */}
                    {connectionStatus === 'success' && boards.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-gray-100">
                            <div className="flex justify-between items-end mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Visible Boards</h3>
                                    <p className="text-sm text-gray-500 mt-1">Select boards to display in the application.</p>
                                </div>
                                <div className="w-64">
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search boards..."
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-gray-50 focus:bg-white transition-colors"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                                {boards.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase())).map(board => {
                                    const isSelected = selectedBoards.includes(board.id);
                                    return (
                                        <div key={board.id} className={`border rounded-xl transition-all duration-200 ${isSelected ? 'border-indigo-500 bg-indigo-50/10 shadow-md ring-1 ring-indigo-500' : 'border-gray-200 bg-white shadow-sm hover:border-indigo-300'}`}>
                                            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white rounded-t-xl">
                                                <label className="flex items-center space-x-3 cursor-pointer group">
                                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300 group-hover:border-indigo-400'}`}>
                                                        {isSelected && <FiCheckCircle className="text-white w-3.5 h-3.5" />}
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        className="hidden" // Custom checkbox styling
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedBoards(prev => [...prev, board.id]);
                                                            } else {
                                                                setSelectedBoards(prev => prev.filter(id => id !== board.id));
                                                            }
                                                        }}
                                                    />
                                                    <div>
                                                        <span className={`block text-sm font-bold ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>{board.name}</span>
                                                        <span className="text-[10px] text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded capitalize">{board.state}</span>
                                                    </div>
                                                </label>
                                                <button
                                                    onClick={(e) => handlePermissionsClick(e, board)}
                                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                                                    title="Manage User Access"
                                                >
                                                    <FiUsers size={16} />
                                                </button>
                                            </div>

                                            {isSelected && (
                                                <div className="p-4 bg-white rounded-b-xl space-y-5">
                                                    {/* Permissions */}
                                                    <div>
                                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Editable Columns (List)</h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {(board.columns || []).map(col => (
                                                                <label key={`perm-${col.id}`} className={`inline-flex items-center px-2 py-1 rounded text-xs cursor-pointer border transition-colors ${permissions[board.id]?.includes(col.id) ? 'bg-green-50 border-green-200 text-green-700 font-medium' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-white'}`}>
                                                                    <input
                                                                        type="checkbox"
                                                                        className="hidden"
                                                                        checked={permissions[board.id]?.includes(col.id) || false}
                                                                        onChange={(e) => {
                                                                            const current = permissions[board.id] || [];
                                                                            setPermissions({ ...permissions, [board.id]: e.target.checked ? [...current, col.id] : current.filter(id => id !== col.id) });
                                                                        }}
                                                                    />
                                                                    {col.title}
                                                                </label>
                                                            ))}
                                                            {(board.columns || []).length === 0 && <span className="text-xs text-gray-400 italic">No columns available</span>}
                                                        </div>
                                                    </div>

                                                    {/* Card View Columns */}
                                                    <div>
                                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Card Visible Columns</h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {(board.columns || []).map(col => (
                                                                <label key={`card-${col.id}`} className={`inline-flex items-center px-2 py-1 rounded text-xs cursor-pointer border transition-colors ${cardColumns[board.id]?.includes(col.id) ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-white'}`}>
                                                                    <input
                                                                        type="checkbox"
                                                                        className="hidden"
                                                                        checked={cardColumns[board.id]?.includes(col.id) || false}
                                                                        onChange={(e) => {
                                                                            const current = cardColumns[board.id] || [];
                                                                            setCardColumns({ ...cardColumns, [board.id]: e.target.checked ? [...current, col.id] : current.filter(id => id !== col.id) });
                                                                        }}
                                                                    />
                                                                    {col.title}
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Card Actions */}
                                                    <div>
                                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Action Footer Items</h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {(board.columns || []).map(col => (
                                                                <label key={`action-${col.id}`} className={`inline-flex items-center px-2 py-1 rounded text-xs cursor-pointer border transition-colors ${cardActions[board.id]?.includes(col.id) ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-white'}`}>
                                                                    <input
                                                                        type="checkbox"
                                                                        className="hidden"
                                                                        checked={cardActions[board.id]?.includes(col.id) || false}
                                                                        onChange={(e) => {
                                                                            const current = cardActions[board.id] || [];
                                                                            setCardActions({ ...cardActions, [board.id]: e.target.checked ? [...current, col.id] : current.filter(id => id !== col.id) });
                                                                        }}
                                                                    />
                                                                    {col.title}
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-xl z-50 flex items-center justify-between">
                                <span className="text-sm text-gray-500 ml-8">
                                    {loading ? 'Saving changes...' : 'Don\'t forget to save your changes.'}
                                </span>
                                <button
                                    onClick={handleSaveSettings}
                                    disabled={loading}
                                    className="mr-8 inline-flex justify-center rounded-lg border border-transparent bg-indigo-600 py-3 px-8 text-sm font-bold text-white shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-all transform hover:scale-105"
                                >
                                    {loading ? 'Saving...' : <><FiSave className="mr-2 mt-0.5" /> Save Configuration</>}
                                </button>
                            </div>
                        </div>
                    )}
                    <div className="h-24"></div> {/* Spacer for sticky footer */}
                </div>

                {/* Permission Modal */}
                {accessModal.isOpen && (
                    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setAccessModal({ ...accessModal, isOpen: false })}></div>
                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <div className="sm:flex sm:items-start">
                                        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
                                            <FiLock className="h-6 w-6 text-indigo-600" aria-hidden="true" />
                                        </div>
                                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                            <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                                Manage Access: {accessModal.boardName}
                                            </h3>
                                            <div className="mt-4 max-h-60 overflow-y-auto custom-scrollbar border rounded-md p-2">
                                                {users.length === 0 ? (
                                                    <p className="text-sm text-gray-500 italic p-2">No users found.</p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {users.map(u => (
                                                            <label key={u.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                                    checked={selectedAccessUsers.includes(u.id)}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) {
                                                                            setSelectedAccessUsers(prev => [...prev, u.id]);
                                                                        } else {
                                                                            setSelectedAccessUsers(prev => prev.filter(id => id !== u.id));
                                                                        }
                                                                    }}
                                                                />
                                                                <div className="flex-1">
                                                                    <span className="block text-sm font-medium text-gray-900">{u.full_name}</span>
                                                                    <span className="block text-xs text-gray-500">{u.role}</span>
                                                                </div>
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                    <button
                                        type="button"
                                        onClick={handleSaveAccess}
                                        disabled={accessLoading}
                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                                    >
                                        {accessLoading ? 'Saving...' : 'Save Permissions'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAccessModal({ ...accessModal, isOpen: false })}
                                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <div className="h-24"></div> {/* Spacer for sticky footer */}
            </div>


        </div >
    );
};

export default MondayConnector;
