import { useEffect } from 'react';
import { useMondayStore } from '../store/mondayStore';
import marketplaceService from '../../../services/marketplaceService';
import { useToast } from '../../../context/ToastContext';

/**
 * Hook for fetching and managing Monday board data
 */
export const useMondayBoards = (installedAppId) => {
    const toast = useToast();
    const { boards, setBoards, activeBoardId, setActiveBoardId } = useMondayStore();

    useEffect(() => {
        const fetchBoards = async () => {
            try {
                // Get installed app config
                const installedApps = await marketplaceService.getInstalledApps();
                const currentApp = installedApps.find(app => String(app.id) === String(installedAppId));

                if (!currentApp) {
                    throw new Error('Application not found');
                }

                // Fetch all boards
                const allBoards = await marketplaceService.monday.getBoards(100);
                const selectedIds = currentApp.settings.selected_board_ids || [];
                const visibleBoards = allBoards.filter(b => selectedIds.includes(b.id));

                setBoards(visibleBoards);

                // Set active board
                if (visibleBoards.length > 0 && !activeBoardId) {
                    const savedId = localStorage.getItem('monday_activeBoardId');
                    const restoreBoard = savedId ? visibleBoards.find(b => String(b.id) === String(savedId)) : null;
                    setActiveBoardId(restoreBoard ? restoreBoard.id : visibleBoards[0].id);
                }
            } catch (error) {
                console.error('Failed to fetch boards:', error);
                toast.error('Error', 'Failed to load boards');
            }
        };

        if (installedAppId) {
            fetchBoards();
        }
    }, [installedAppId]);

    return { boards, activeBoardId, setActiveBoardId };
};
