import React, { useRef } from 'react';
import { FiRefreshCw, FiLoader, FiSettings, FiEdit2, FiCpu, FiArrowUp, FiArrowDown, FiFilter, FiGrid, FiList, FiLogOut, FiChevronDown, FiTrash2, FiClock } from 'react-icons/fi';
import JobHistory from '../../components/JobHistory';

const MondayHeader = ({
    activeBoardId,
    boards,
    lastSyncInfo, // { sizeMB, optimizedMB, itemCount, lastSyncedAt }
    viewState, // { showHistory, showConfig, showSortMenu, showSyncSettings, showFilter, viewMode }
    setViewState, // setter function or individual setters
    editState, // { isEditMode, setIsEditMode }
    debugState, // { isDebugMode, toggleDebug }
    syncState, // { syncing, message, count... }
    handleSync,
    sortConfig,
    setSortConfig,
    boardItems, // for sort menu
    syncOptions, // { showImages, setShowImages, keepOriginals, setKeepOriginals, optimizeImages, setOptimizeImages, forceSyncImages, setForceSyncImages, setShowClearCache }
    navigate
}) => {
    const syncMenuRef = useRef(null);

    // Helper to toggle view states
    const toggle = (key) => setViewState(prev => ({ ...prev, [key]: !prev[key] }));
    const setView = (key, val) => setViewState(prev => ({ ...prev, [key]: val }));

    const currentBoard = boards.find(b => b.id === activeBoardId);

    return (
        <div className="p-8 pb-0 flex-shrink-0 z-30 relative">
            <div className="mb-6 flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {currentBoard?.name || 'Select a Board'}
                    </h1>
                    {currentBoard && currentBoard.last_synced_at && (
                        <div className="flex flex-col mt-1 gap-0.5">
                            <p className="text-xs text-gray-500 font-medium flex items-center gap-2">
                                <span className="flex items-center gap-1">
                                    <FiRefreshCw className="w-3 h-3" /> {new Date(currentBoard.last_synced_at).toLocaleString()}
                                </span>
                                <span className="text-gray-300">|</span>
                                <span className="font-semibold text-gray-700">{lastSyncInfo.itemCount} items synced</span>
                            </p>
                            {(lastSyncInfo.sizeMB > 0 || lastSyncInfo.optimizedMB > 0) && (
                                <p className="text-[10px] text-gray-400 font-mono pl-0.5">
                                    Storage: <span className="font-medium text-gray-600">{lastSyncInfo.sizeMB?.toFixed(2)} MB</span>
                                    {lastSyncInfo.optimizedMB > 0 && lastSyncInfo.sizeMB > lastSyncInfo.optimizedMB && (
                                        <span className="text-emerald-600 ml-1 font-semibold">
                                            (Optimized to {lastSyncInfo.optimizedMB?.toFixed(2)} MB)
                                        </span>
                                    )}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Toolbar Actions */}
                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 p-1 rounded-lg items-center gap-1">
                        {/* History Toggle */}
                        <button
                            onClick={() => toggle('showHistory')}
                            className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${viewState.showHistory ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                            title="Sync History"
                        >
                            <FiClock size={20} />
                        </button>

                        {/* Config Toggle - Placeholder */}
                        <button
                            onClick={() => toggle('showConfig')}
                            className={`p-2 rounded-lg transition-colors ${viewState.showConfig ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                        >
                            <FiSettings size={20} />
                        </button>

                        {/* Edit Mode Toggle */}
                        {activeBoardId && (
                            <button
                                onClick={() => editState.setIsEditMode(!editState.isEditMode)}
                                className={`p-2 rounded-md transition-all ${editState.isEditMode ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                                title={editState.isEditMode ? "Exit Edit Mode" : "Enter Edit Mode"}
                            >
                                <FiEdit2 />
                            </button>
                        )}

                        {/* Debug Toggle */}
                        <button
                            onClick={debugState.toggleDebug}
                            className={`p-2 rounded-md transition-all ${debugState.isDebugMode ? 'bg-white shadow text-red-600' : 'text-gray-500 hover:text-gray-700'}`}
                            title={debugState.isDebugMode ? "Disable Debug Mode" : "Enable Debug Mode"}
                        >
                            <FiCpu />
                        </button>

                        {/* Sort Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => toggle('showSortMenu')}
                                className={`p-2 rounded-md transition-all ${viewState.showSortMenu ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                                title="Sort Items"
                            >
                                {sortConfig.direction === 'asc' ? <FiArrowUp /> : <FiArrowDown />}
                            </button>

                            {viewState.showSortMenu && (
                                <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 p-2 z-50 animate-fadeIn text-left">
                                    <div className="text-xs font-semibold text-gray-400 px-2 py-1 uppercase tracking-wider">Sort By</div>
                                    <button
                                        onClick={() => { setSortConfig({ ...sortConfig, key: 'name' }); toggle('showSortMenu'); }}
                                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex justify-between items-center ${sortConfig.key === 'name' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                                    >
                                        Name
                                        {sortConfig.key === 'name' && <span className="text-xs bg-indigo-200 text-indigo-800 px-1.5 rounded">Active</span>}
                                    </button>

                                    <div className="my-1 border-t border-gray-100"></div>

                                    <div className="max-h-48 overflow-y-auto">
                                        {(boardItems[0]?.column_values || []).map(c => (
                                            <button
                                                key={c.id}
                                                onClick={() => { setSortConfig({ ...sortConfig, key: c.id }); toggle('showSortMenu'); }}
                                                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex justify-between items-center ${sortConfig.key === c.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                                            >
                                                <span className="truncate">{c.id}</span>
                                                {sortConfig.key === c.id && <span className="text-xs bg-indigo-200 text-indigo-800 px-1.5 rounded">Active</span>}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="my-1 border-t border-gray-100"></div>

                                    <div className="text-xs font-semibold text-gray-400 px-2 py-1 uppercase tracking-wider">Order</div>
                                    <div className="flex gap-1 p-1 bg-gray-50 rounded-lg">
                                        <button
                                            onClick={() => setSortConfig(prev => ({ ...prev, direction: 'asc' }))}
                                            className={`flex-1 flex justify-center items-center py-1.5 rounded-md text-sm transition-all ${sortConfig.direction === 'asc' ? 'bg-white shadow text-indigo-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            Asc
                                        </button>
                                        <button
                                            onClick={() => setSortConfig(prev => ({ ...prev, direction: 'desc' }))}
                                            className={`flex-1 flex justify-center items-center py-1.5 rounded-md text-sm transition-all ${sortConfig.direction === 'desc' ? 'bg-white shadow text-indigo-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            Desc
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={() => toggle('showFilter')}
                        className={`p-2 rounded-md transition-all ${viewState.showFilter ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                        title="Toggle Filter"
                    >
                        <FiFilter />
                    </button>

                    <button
                        onClick={() => setView('viewMode', 'grid')}
                        className={`p-2 rounded-md transition-all ${viewState.viewMode === 'grid' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                        title="Grid View"
                    >
                        <FiGrid />
                    </button>
                    <button
                        onClick={() => setView('viewMode', 'list')}
                        className={`p-2 rounded-md transition-all ${viewState.viewMode === 'list' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                        title="List View"
                    >
                        <FiList />
                    </button>
                </div>

                {/* Sync Menu */}
                <div className="relative mr-2" ref={syncMenuRef}>
                    <div className="inline-flex shadow-sm rounded-md isolate">
                        <button
                            onClick={handleSync}
                            disabled={syncState.syncing}
                            className={`relative inline-flex items-center px-4 py-2 rounded-l-md border border-indigo-600 bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 focus:z-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {syncState.syncing ? <FiLoader className="animate-spin -ml-1 mr-2 h-4 w-4" /> : <FiRefreshCw className="-ml-1 mr-2 h-4 w-4" />}
                            {syncState.syncing ? 'Syncing...' : 'Sync'}
                        </button>
                        <button
                            onClick={() => toggle('showSyncSettings')}
                            disabled={syncState.syncing}
                            className={`relative -ml-px inline-flex items-center px-2 py-2 rounded-r-md border border-l-indigo-700 border-indigo-600 bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 focus:z-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${viewState.showSyncSettings ? 'bg-indigo-800' : ''}`}
                        >
                            <FiChevronDown className="h-4 w-4" />
                        </button>
                    </div>

                    {viewState.showSyncSettings && (
                        <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-[100] animate-fadeIn ring-1 ring-black ring-opacity-5 overflow-hidden text-left">
                            <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sync Settings</span>
                            </div>

                            <div className="p-2 space-y-1">
                                <label className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-700">Fetch Images</span>
                                        <span className="text-xs text-gray-500">Download files locally</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={syncOptions.showImages}
                                        onChange={(e) => syncOptions.setShowImages(e.target.checked)}
                                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 h-4 w-4"
                                    />
                                </label>

                                <label className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-700">Keep Originals</span>
                                        <span className="text-xs text-gray-500">Save high-res copies</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={syncOptions.keepOriginals}
                                        onChange={(e) => {
                                            syncOptions.setKeepOriginals(e.target.checked);
                                            localStorage.setItem('monday_keepOriginals', e.target.checked);
                                        }}
                                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 h-4 w-4"
                                    />
                                </label>

                                <label className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-700">Optimize Images</span>
                                        <span className="text-xs text-gray-500">Convert to WebP (Recommended)</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={syncOptions.optimizeImages}
                                        onChange={(e) => {
                                            syncOptions.setOptimizeImages(e.target.checked);
                                            localStorage.setItem('monday_optimizeImages', e.target.checked);
                                        }}
                                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 h-4 w-4"
                                    />
                                </label>

                                <div className="border-t border-gray-100 my-1"></div>

                                <label className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-orange-50 cursor-pointer transition-colors group">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-700 group-hover:text-orange-700">Force Re-download</span>
                                        <span className="text-xs text-gray-500 group-hover:text-orange-600">Overwrite existing files</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={syncOptions.forceSyncImages}
                                        onChange={(e) => syncOptions.setForceSyncImages(e.target.checked)}
                                        className="rounded border-gray-300 text-orange-500 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50 h-4 w-4"
                                    />
                                </label>
                            </div>

                            <div className="bg-gray-50 p-2 border-t border-gray-100">
                                <button
                                    onClick={() => {
                                        toggle('showSyncSettings');
                                        syncOptions.setShowClearCache(true);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"
                                >
                                    <FiTrash2 className="w-4 h-4" /> Clear Local Cache
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <button
                    onClick={() => navigate('/apps')}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-red-700 hover:bg-red-50 transition-colors"
                >
                    <FiLogOut className="w-4 h-4" />
                    Exit App
                </button>
            </div>

            {/* Panels / Drawers */}
            {viewState.showHistory && (
                <div className="mb-6 animate-in slide-in-from-top-4 duration-200">
                    <JobHistory />
                </div>
            )}

            {viewState.showConfig && (
                <div className="absolute top-20 right-8 z-50 w-96 bg-white dark:bg-neutral-800 p-4 shadow-xl rounded-lg border border-gray-200 dark:border-neutral-700 animate-in slide-in-from-top-4 duration-200 text-left">
                    <h3 className="font-bold mb-2 text-gray-900 dark:text-white">Configuration</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Settings panel coming soon.</p>
                </div>
            )}
        </div>
    );
};

export default MondayHeader;
