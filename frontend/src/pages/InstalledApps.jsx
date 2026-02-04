import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import marketplaceService from '../services/marketplaceService';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext'; // Added
import { useLayout } from '../context/LayoutContext'; // Added
import api from '../services/api'; // Added for fetching company users
import { FiSettings, FiTrash2, FiPlay, FiUsers, FiX, FiPlus } from 'react-icons/fi'; // Added icons
import ConfirmationModal from '../components/ConfirmationModal';

const InstalledApps = () => {
    const [apps, setApps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uninstalling, setUninstalling] = useState(null);
    const { user } = useAuth(); // Get user role
    const { setHeader } = useLayout(); // Added
    const toast = useToast();
    const navigate = useNavigate();

    // Access Management State
    const [manageAccessApp, setManageAccessApp] = useState(null); // The app being managed
    const [appUsers, setAppUsers] = useState([]); // Users with access
    const [companyUsers, setCompanyUsers] = useState([]); // All company users (for dropdown)
    const [selectedUserToAdd, setSelectedUserToAdd] = useState('');
    const [loadingAccess, setLoadingAccess] = useState(false);

    // Modal States
    const [uninstallModal, setUninstallModal] = useState({ isOpen: false, appId: null });
    const [revokeModal, setRevokeModal] = useState({ isOpen: false, userId: null });

    useEffect(() => {
        setHeader('Installed Apps'); // Set Header
        fetchInstalledApps();
    }, [setHeader]); // Dependency added

    const fetchInstalledApps = async () => {
        try {
            const data = await marketplaceService.getInstalledApps();
            setApps(data);
        } catch (error) {
            console.error('Failed to fetch installed apps', error);
            toast.error('Error', 'Failed to load installed apps');
        } finally {
            setLoading(false);
        }
    };

    const handleUninstallClick = (appId) => {
        setUninstallModal({ isOpen: true, appId });
    };

    const confirmUninstall = async () => {
        const { appId } = uninstallModal;
        if (!appId) return;

        setUninstalling(appId);
        try {
            await marketplaceService.uninstallApp(appId);
            toast.success('Success', 'App uninstalled successfully');

            // Remove from local state immediately
            setApps(prevApps => prevApps.filter(app => app.app_id !== appId));
        } catch (error) {
            console.error('Failed to uninstall app', error);
            toast.error('Error', 'Failed to uninstall app');
        } finally {
            setUninstalling(null);
            setUninstallModal({ isOpen: false, appId: null });
        }
    };

    const handleConfigure = (appId, appName) => {
        if (appName === "Monday.com Connector") {
            navigate(`/apps/monday/${appId}`);
        } else {
            toast.info('Info', `Configuration for ${appName} is not yet implemented`);
        }
    };

    const openAccessModal = async (app) => {
        setManageAccessApp(app);
        setLoadingAccess(true);
        try {
            const [usersWithAccess, allUsers] = await Promise.all([
                marketplaceService.getAppUsers(app.id),
                api.get('/users').then(res => res.data)
            ]);
            setAppUsers(usersWithAccess);
            setCompanyUsers(allUsers);
        } catch (error) {
            console.error('Failed to load access data', error);
            toast.error('Error', 'Failed to load user list');
        } finally {
            setLoadingAccess(false);
        }
    };

    const handleGrantAccess = async () => {
        if (!selectedUserToAdd || !manageAccessApp) return;
        try {
            await marketplaceService.grantAppAccess(manageAccessApp.id, selectedUserToAdd);
            toast.success('Success', 'Access granted');
            // Refresh list
            const updatedUsers = await marketplaceService.getAppUsers(manageAccessApp.id);
            setAppUsers(updatedUsers);
            setSelectedUserToAdd('');
        } catch (error) {
            console.error('Failed to grant access', error);
            toast.error('Error', 'Failed to grant access');
        }
    };

    const handleRevokeClick = (userId) => {
        setRevokeModal({ isOpen: true, userId });
    };

    const confirmRevoke = async () => {
        const { userId } = revokeModal;
        if (!userId || !manageAccessApp) return;

        try {
            await marketplaceService.revokeAppAccess(manageAccessApp.id, userId);
            toast.success('Success', 'Access revoked');
            setAppUsers(prev => prev.filter(u => u.id !== userId));
        } catch (error) {
            console.error('Failed to revoke access', error);
            toast.error('Error', 'Failed to revoke access');
        } finally {
            setRevokeModal({ isOpen: false, userId: null });
        }
    };

    if (loading) return <div className="p-6">Loading installed apps...</div>;

    return (
        <div className="p-6">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Installed Applications</h1>
                    <p className="text-gray-500">Manage and configure your active integrations.</p>
                </div>
                <button
                    onClick={() => navigate('/marketplace')}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                >
                    Browse Marketplace
                </button>
            </div>

            <div className="space-y-4">
                {apps.map((item) => (
                    <div key={item.id} className="bg-white rounded-lg shadow p-4 border border-gray-100 flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12">
                                <img src={item.app.icon_url} alt={item.app.name} className="w-full h-full object-contain" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">{item.app.name}</h3>
                                <p className="text-sm text-gray-500">Version {item.app.version}</p>
                            </div>
                        </div>

                        <div className="flex space-x-2">
                            <button
                                onClick={() => navigate(`/apps/${item.id}/view`)}
                                className="flex items-center px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition"
                            >
                                <FiPlay className="mr-2" /> Launch Application
                            </button>
                            <button
                                onClick={() => handleConfigure(item.id, item.app.name)}
                                className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                            >
                                <FiSettings className="mr-2" /> Configure
                            </button>

                            {(user?.role === 'admin' || user?.role === 'super_admin') && (
                                <button
                                    onClick={() => openAccessModal(item)}
                                    className="flex items-center px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
                                >
                                    <FiUsers className="mr-2" /> Users
                                </button>
                            )}

                            <button
                                onClick={() => handleUninstallClick(item.app_id)}
                                disabled={uninstalling === item.app_id}
                                className={`flex items-center px-3 py-2 rounded-lg transition ${uninstalling === item.app_id
                                    ? 'bg-red-50 text-red-300 cursor-wait'
                                    : 'bg-red-50 text-red-600 hover:bg-red-100'
                                    }`}
                            >
                                {uninstalling === item.app_id ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Uninstalling...
                                    </>
                                ) : (
                                    <>
                                        <FiTrash2 className="mr-2" /> Uninstall
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ))}

                {apps.length === 0 && (
                    <div className="text-center py-10 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                        <p className="text-gray-500 mb-4">You haven't installed any apps yet.</p>
                        <button
                            onClick={() => navigate('/marketplace')}
                            className="text-indigo-600 font-medium hover:text-indigo-800"
                        >
                            Go to Marketplace
                        </button>
                    </div>
                )}
            </div>

            {/* Access Management Modal */}
            {manageAccessApp && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-xl font-bold text-gray-800">Manage Access: {manageAccessApp.app.name}</h2>
                            <button onClick={() => setManageAccessApp(null)} className="text-gray-400 hover:text-gray-600">
                                <FiX size={24} />
                            </button>
                        </div>

                        <div className="p-6">
                            {/* Add User Section */}
                            <div className="flex gap-4 mb-8 items-end bg-gray-50 p-4 rounded-lg">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Grant Access to User</label>
                                    <select
                                        value={selectedUserToAdd}
                                        onChange={(e) => setSelectedUserToAdd(e.target.value)}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="">Select an employee...</option>
                                        {companyUsers
                                            .filter(u => !appUsers.find(au => au.id === u.id)) // Filter out already added users
                                            .map(user => (
                                                <option key={user.id} value={user.id}>{user.full_name || user.username} ({user.role})</option>
                                            ))
                                        }
                                    </select>
                                </div>
                                <button
                                    onClick={handleGrantAccess}
                                    disabled={!selectedUserToAdd}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                >
                                    <FiPlus className="mr-2" /> Grant Access
                                </button>
                            </div>

                            {/* User List */}
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Users with Access</h3>
                            {loadingAccess ? (
                                <div className="text-center py-8 text-gray-500">Loading users...</div>
                            ) : appUsers.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 italic">No users assigned yet.</div>
                            ) : (
                                <div className="space-y-3">
                                    {appUsers.map(u => (
                                        <div key={u.id} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition">
                                            <div className="flex items-center space-x-3">
                                                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                                    {u.full_name ? u.full_name.charAt(0).toUpperCase() : u.username.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{u.full_name || u.username}</p>
                                                    <p className="text-xs text-gray-500 capitalize">{u.role}</p>
                                                </div>
                                            </div>
                                            {u.id !== user.id && ( // Prevent revoking own access? Or allow it? Better prevent for now or check logic.
                                                <button
                                                    onClick={() => handleRevokeClick(u.id)}
                                                    className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-full transition"
                                                    title="Revoke Access"
                                                >
                                                    <FiX />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={uninstallModal.isOpen}
                onClose={() => setUninstallModal({ ...uninstallModal, isOpen: false })}
                onConfirm={confirmUninstall}
                title="Uninstall App"
                message="Are you sure you want to uninstall this app? Settings will be lost."
                confirmText="Uninstall"
                destructive={true}
            />

            <ConfirmationModal
                isOpen={revokeModal.isOpen}
                onClose={() => setRevokeModal({ ...revokeModal, isOpen: false })}
                onConfirm={confirmRevoke}
                title="Revoke Access"
                message="Are you sure you want to revoke access for this user?"
                confirmText="Revoke"
                destructive={true}
            />
        </div>
    );
};

export default InstalledApps;
