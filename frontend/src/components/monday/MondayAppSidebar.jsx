import React, { useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiSearch, FiFolder, FiCheck } from 'react-icons/fi';

const MondayAppSidebar = ({ boards, activeBoardId, setActiveBoardId, isCollapsed, setIsCollapsed }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredBoards = boards.filter(board =>
        board.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleBoardSelect = (boardId) => {
        setActiveBoardId(boardId);
        localStorage.setItem('monday_activeBoardId', boardId);
    };

    return (
        <div className={`bg-gradient-to-b from-indigo-600 to-indigo-700 text-white flex flex-col transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'} h-screen flex-shrink-0`}>
            {/* Header */}
            <div className="p-4 border-b border-indigo-500/30 flex items-center justify-between">
                {!isCollapsed && (
                    <h2 className="text-lg font-bold">Boards</h2>
                )}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-2 hover:bg-indigo-500/30 rounded-lg transition-colors ml-auto"
                    title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {isCollapsed ? <FiChevronRight size={20} /> : <FiChevronLeft size={20} />}
                </button>
            </div>

            {/* Search */}
            {!isCollapsed && (
                <div className="p-3">
                    <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-indigo-300" size={16} />
                        <input
                            type="text"
                            placeholder="Search boards..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-3 py-2 bg-indigo-500/30 border border-indigo-400/30 rounded-lg text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-white/20 text-sm"
                        />
                    </div>
                </div>
            )}

            {/* Board List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {isCollapsed ? (
                    // Collapsed view - just icons
                    <div className="p-2 space-y-2">
                        {filteredBoards.map(board => (
                            <button
                                key={board.id}
                                onClick={() => handleBoardSelect(board.id)}
                                className={`w-full p-3 rounded-lg transition-all flex items-center justify-center ${activeBoardId === board.id
                                        ? 'bg-white text-indigo-600 shadow-lg'
                                        : 'hover:bg-indigo-500/30'
                                    }`}
                                title={board.name}
                            >
                                <FiFolder size={20} />
                            </button>
                        ))}
                    </div>
                ) : (
                    // Expanded view - full board cards
                    <div className="p-3 space-y-2">
                        {filteredBoards.length === 0 && (
                            <div className="text-center text-indigo-300 text-sm py-8">
                                No boards found
                            </div>
                        )}
                        {filteredBoards.map(board => (
                            <button
                                key={board.id}
                                onClick={() => handleBoardSelect(board.id)}
                                className={`w-full p-3 rounded-lg transition-all text-left group ${activeBoardId === board.id
                                        ? 'bg-white text-indigo-600 shadow-lg'
                                        : 'hover:bg-indigo-500/30'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <FiFolder size={18} className={activeBoardId === board.id ? 'text-indigo-600' : 'text-indigo-300'} />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate text-sm">
                                            {board.name}
                                        </div>
                                        {board.items_count !== undefined && (
                                            <div className={`text-xs mt-0.5 ${activeBoardId === board.id ? 'text-indigo-500' : 'text-indigo-300'}`}>
                                                {board.items_count} items
                                            </div>
                                        )}
                                    </div>
                                    {activeBoardId === board.id && (
                                        <FiCheck size={16} className="text-indigo-600 flex-shrink-0" />
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer Info */}
            {!isCollapsed && (
                <div className="p-3 border-t border-indigo-500/30 text-xs text-indigo-200">
                    {filteredBoards.length} board{filteredBoards.length !== 1 ? 's' : ''}
                </div>
            )}
        </div>
    );
};

export default MondayAppSidebar;
