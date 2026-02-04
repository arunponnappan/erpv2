import React from 'react';
import { FiRefreshCw, FiGrid, FiList, FiFilter, FiSettings, FiClock, FiLogOut } from 'react-icons/fi';
import { useMondayStore, selectActiveBoard } from '../../store/mondayStore';
import { useNavigate } from 'react-router-dom';

/**
 * Modern header component with actions and board info
 */
const MondayHeader = ({ onSync, syncState }) => {
    const navigate = useNavigate();
    const activeBoard = useMondayStore(selectActiveBoard);
    const {
        viewMode,
        setViewMode,
        showFilter,
        toggleFilterBar,
        toggleSyncSettings,
        toggleHistory
    } = useMondayStore();

    return (
        <div className="px-6 py-4">
            <div className="flex items-center justify-between">
                {/* Left: Board Info */}
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {activeBoard?.name || 'Select a Board'}
                    </h1>
                    {activeBoard?.last_synced_at && (
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                                <FiRefreshCw size={12} />
                                Last synced: {new Date(activeBoard.last_synced_at).toLocaleString()}
                            </span>
                            {activeBoard.items_count !== undefined && (
                                <>
                                    <span>•</span>
                                    <span className="font-medium text-gray-700 dark:text-gray-300">
                                        {activeBoard.items_count} items
                                    </span>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    {/* View Toggle */}
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded transition-colors ${viewMode === 'list'
                                    ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                            title="List view"
                        >
                            <FiList size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded transition-colors ${viewMode === 'grid'
                                    ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                            title="Grid view"
                        >
                            <FiGrid size={18} />
                        </button>
                    </div>

                    {/* Filter Button */}
                    <button
                        onClick={toggleFilterBar}
                        className={`p-2 rounded-lg transition-colors ${showFilter
                                ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                        title="Filters"
                    >
                        <FiFilter size={18} />
                    </button>

                    {/* History Button */}
                    <button
                        onClick={toggleHistory}
                        className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        title="Job history"
                    >
                        <FiClock size={18} />
                    </button>

                    {/* Settings Button */}
                    <button
                        onClick={toggleSyncSettings}
                        className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        title="Sync settings"
                    >
                        <FiSettings size={18} />
                    </button>

                    {/* Sync Button */}
                    <button
                        onClick={onSync}
                        disabled={syncState?.syncing}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <FiRefreshCw
                            size={16}
                            className={syncState?.syncing ? 'animate-spin' : ''}
                        />
                        <span className="font-medium">
                            {syncState?.syncing ? 'Syncing...' : 'Sync'}
                        </span>
                    </button>

                    {/* Exit Button */}
                    <button
                        onClick={() => navigate('/apps')}
                        className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        title="Exit to apps"
                    >
                        <FiLogOut size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MondayHeader;
