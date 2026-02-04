import { useState, useEffect, useCallback, useRef } from 'react';
import syncService from '../services/syncService';
import { useToast } from '../../../context/ToastContext';

/**
 * Enterprise-grade hook for Monday sync operations
 * Handles sync state, progress tracking, and error recovery
 */
export const useMondaySync = (boardId) => {
    const toast = useToast();
    const [syncState, setSyncState] = useState({
        syncing: false,
        progress: 0,
        message: '',
        logs: [],
    });
    const [syncDuration, setSyncDuration] = useState(0);
    const timerRef = useRef(null);
    const jobIdRef = useRef(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (jobIdRef.current) {
                syncService.cancelSync(jobIdRef.current);
            }
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    /**
     * Start sync operation
     */
    const startSync = useCallback(async (options = {}) => {
        if (!boardId) {
            toast.error('Error', 'No board selected');
            return null;
        }

        // Check if board is already syncing
        if (syncService.isBoardSyncing(boardId)) {
            toast.warning('Already Syncing', 'This board is currently being synced');
            return null;
        }

        // Check concurrent job limit
        if (syncService.getActiveJobCount() >= 3) {
            toast.error('Too Many Jobs', 'Maximum 3 concurrent syncs allowed. Please wait for existing jobs to complete.');
            return null;
        }

        // Reset state
        setSyncState({
            syncing: true,
            progress: 0,
            message: 'Starting sync...',
            logs: ['[START] Initiating sync...'],
        });
        setSyncDuration(0);

        // Start duration timer
        const startTime = Date.now();
        timerRef.current = setInterval(() => {
            setSyncDuration(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);

        try {
            const result = await syncService.startSync(boardId, {
                ...options,
                onProgress: (progress) => {
                    setSyncState(prev => ({
                        ...prev,
                        message: progress.message || prev.message,
                        logs: progress.logs?.length > 0 ? progress.logs : prev.logs,
                    }));
                },
            });

            // Success
            clearInterval(timerRef.current);
            setSyncState({
                syncing: false,
                progress: 100,
                message: result.message,
                logs: result.logs,
            });

            toast.success('Sync Complete', result.message);
            return result;
        } catch (error) {
            // Error
            clearInterval(timerRef.current);
            const errorMessage = error.response?.data?.detail || error.message || 'Sync failed';

            setSyncState(prev => ({
                ...prev,
                syncing: false,
                message: errorMessage,
                logs: [...prev.logs, `[ERROR]: ${errorMessage}`],
            }));

            toast.error('Sync Failed', errorMessage);
            return null;
        }
    }, [boardId, toast]);

    /**
     * Cancel current sync
     */
    const cancelSync = useCallback(() => {
        if (jobIdRef.current) {
            syncService.cancelSync(jobIdRef.current);
            clearInterval(timerRef.current);
            setSyncState(prev => ({
                ...prev,
                syncing: false,
                message: 'Sync cancelled',
                logs: [...prev.logs, '[INFO] Sync cancelled by user'],
            }));
            toast.info('Cancelled', 'Sync operation cancelled');
        }
    }, [toast]);

    return {
        syncState,
        syncDuration,
        startSync,
        cancelSync,
        isSyncing: syncState.syncing,
    };
};
