import React, { useState } from 'react';
import { FiSearch, FiChevronLeft, FiChevronRight, FiGrid } from 'react-icons/fi';
import { useMondayStore } from '../../store/mondayStore';

/**
 * Sidebar component for board navigation
 */
const MondaySidebar = ({ boards }) => {
    const {
        activeBoardId,
        setActiveBoardId,
        sidebarCollapsed,
        toggleSidebar
    } = useMondayStore();

    const [searchQuery, setSearchQuery] = useState('');

    const filteredBoards = boards.filter(board =>
        board.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-white/10">
                {!sidebarCollapsed && (
                    <h2 className="text-lg font-semibold">Boards</h2>
                )}
                <button
                    onClick={toggleSidebar}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {sidebarCollapsed ? (
                        <FiChevronRight size={20} />
                    ) : (
                        <FiChevronLeft size={20} />
                    )}
                </button>
            </div>

            {/* Search */}
            {!sidebarCollapsed && (
                <div className="p-4">
                    <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" size={16} />
                        <input
                            type="text"
                            placeholder="Search boards..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
                        />
                    </div>
                </div>
            )}

            {/* Board List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-2 space-y-1">
                    {filteredBoards.map((board) => (
                        <button
                            key={board.id}
                            onClick={() => setActiveBoardId(board.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${activeBoardId === board.id
                                    ? 'bg-white text-indigo-700 shadow-lg'
                                    : 'text-white/90 hover:bg-white/10'
                                }`}
                            title={sidebarCollapsed ? board.name : ''}
                        >
                            <FiGrid size={20} className="flex-shrink-0" />
                            {!sidebarCollapsed && (
                                <div className="flex-1 text-left">
                                    <div className="font-medium truncate">{board.name}</div>
                                    {board.items_count !== undefined && (
                                        <div className={`text-xs ${activeBoardId === board.id ? 'text-indigo-600' : 'text-white/60'
                                            }`}>
                                            {board.items_count} items
                                        </div>
                                    )}
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Footer */}
            {!sidebarCollapsed && (
                <div className="p-4 border-t border-white/10">
                    <div className="text-xs text-white/60 text-center">
                        {filteredBoards.length} board{filteredBoards.length !== 1 ? 's' : ''}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MondaySidebar;
