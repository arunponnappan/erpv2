import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import marketplaceService from '../services/marketplaceService';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { useLayout } from '../context/LayoutContext'; // Added
import MarketplaceAppCard from '../components/MarketplaceAppCard';
import ConfirmationModal from '../components/ConfirmationModal';

const Marketplace = () => {
    const [apps, setApps] = useState([]);
    const [installedApps, setInstalledApps] = useState({});
    const [loading, setLoading] = useState(true);
    const [installing, setInstalling] = useState(null);
    const toast = useToast();
    const { user } = useAuth(); // Retrieve user
    const { refreshInstalledApps } = useCompany();
    const { setHeader } = useLayout(); // Added
    const navigate = useNavigate();

    // Modal States
    const [uninstallModal, setUninstallModal] = useState({ isOpen: false, appId: null, installedId: null });
    const [updateModal, setUpdateModal] = useState({ isOpen: false, appId: null, installedId: null });

    useEffect(() => {
        setHeader('App Marketplace'); // Set Header
        fetchApps();
    }, [setHeader]); // Dependency added

    const fetchApps = async () => {
        try {
            const [availableData, installedData] = await Promise.all([
                marketplaceService.getAvailableApps(),
                marketplaceService.getInstalledApps()
            ]);
            setApps(availableData);

            // Map installed apps by app_id for easy lookup
            const installedMap = {};
            installedData.forEach(item => {
                installedMap[item.app_id] = item;
            });
            setInstalledApps(installedMap);

        } catch (error) {
            console.error('Failed to fetch marketplace data', error);
            toast.error('Error', 'Failed to load marketplace');
        } finally {
            setLoading(false);
        }
    };

    const handleInstall = async (appId) => {
        setInstalling(appId);
        try {
            const installedApp = await marketplaceService.installApp(appId);
            console.log('Install success, received:', installedApp);
            toast.success('Success', 'App installed successfully');

            // Update local state immediately
            setInstalledApps(prev => {
                const newState = { ...prev, [appId]: installedApp };
                console.log('New installedApps state:', newState);
                return newState;
            });

            await refreshInstalledApps(); // Update global context for Sidebar
        } catch (error) {
            console.error('Failed to install app', error);
            toast.error('Error', 'Failed to install app');
        } finally {
            setInstalling(null);
        }
    };

    const handleUninstallClick = (appId, installedId) => {
        setUninstallModal({ isOpen: true, appId, installedId });
    };

    const confirmUninstall = async () => {
        const { appId, installedId } = uninstallModal;
        if (!appId || !installedId) return;

        setInstalling(appId);
        try {
            await marketplaceService.uninstallApp(installedId);
            toast.success('Success', 'App uninstalled successfully');

            setInstalledApps(prev => {
                const newState = { ...prev };
                delete newState[appId];
                return newState;
            });
            await refreshInstalledApps();
        } catch (error) {
            console.error('Failed to uninstall app', error);
            toast.error('Error', 'Failed to uninstall app');
        } finally {
            setInstalling(null);
            setUninstallModal({ isOpen: false, appId: null, installedId: null });
        }
    };

    const handleUpdateClick = (appId, installedId) => {
        setUpdateModal({ isOpen: true, appId, installedId });
    };

    const confirmUpdate = async () => {
        const { appId, installedId } = updateModal;
        if (!appId || !installedId) return;

        setInstalling(appId); // Reuse installing state for spinner
        try {
            await marketplaceService.upgradeApp(installedId);
            toast.success('Success', 'App updated successfully');
            await refreshInstalledApps();
        } catch (error) {
            console.error('Failed to update app', error);
            toast.error('Error', 'Failed to update app');
        } finally {
            setInstalling(null);
            setUpdateModal({ isOpen: false, appId: null, installedId: null });
        }
    };

    const handleConfigure = (installedId) => {
        // Only route for apps that have configuration pages
        navigate(`/apps/monday/${installedId}`);
    };

    if (loading) return <div className="p-6">Loading marketplace...</div>;

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">App Marketplace</h1>
                <p className="text-gray-500">Discover and install integrations for your company.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {apps.map((app) => {
                    const isInstalled = !!installedApps[app.id];
                    const installedAppIdx = installedApps[app.id]?.id;

                    // Determine if app supports configuration (hardcoded for now, ideal: from manifest/db)
                    const hasConfiguration = app.name === 'Monday.com Connector';

                    return (
                        <MarketplaceAppCard
                            key={app.id}
                            app={app}
                            isInstalled={isInstalled}
                            installAppId={installedAppIdx}
                            isInstalling={installing === app.id}
                            onInstall={handleInstall}
                            onUninstall={handleUninstallClick}
                            onUpdate={handleUpdateClick}
                            onConfigure={hasConfiguration ? handleConfigure : null}
                            userRole={user?.role}
                        />
                    );
                })}
                {apps.length === 0 && (
                    <div className="col-span-full text-center py-10 text-gray-500">
                        No apps available in the marketplace currently.
                    </div>
                )}
            </div>

            <ConfirmationModal
                isOpen={uninstallModal.isOpen}
                onClose={() => setUninstallModal({ ...uninstallModal, isOpen: false })}
                onConfirm={confirmUninstall}
                title="Uninstall App"
                message="Are you sure you want to uninstall this app? Data may be retained but access to features will be disabled for your company."
                confirmText="Uninstall"
                destructive={true}
            />

            <ConfirmationModal
                isOpen={updateModal.isOpen}
                onClose={() => setUpdateModal({ ...updateModal, isOpen: false })}
                onConfirm={confirmUpdate}
                title="Update App"
                message="Do you want to check for updates and upgrade this module?"
                confirmText="Update"
                destructive={false}
            />
        </div >
    );
};

export default Marketplace;
