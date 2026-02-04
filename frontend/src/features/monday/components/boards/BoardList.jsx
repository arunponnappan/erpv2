import React, { useState } from 'react';
import { useMondayStore, selectActiveBoardId } from '../../store/mondayStore';
import { FiSearch, FiLayers, FiChevronRight, FiCheck } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Sidebar Board List
 * Features search, smooth selection transitions, and board metadata
 */
const BoardList = () => {
    const boards = useMondayStore((state) => state.boards);
    const activeBoardId = useMondayStore(selectActiveBoardId);
    const setActiveBoardId = useMondayStore((state) => state.setActiveBoardId);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredBoards = boards.filter(board =>
        board.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Search Header */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                        type="text"
                        placeholder="Search boards..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                    />
                </div>
            </div>

            {/* List Container */}
            <div className="flex-1 overflow-y-auto px-2 py-2 custom-scrollbar">
                {filteredBoards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                        <FiLayers size={24} className="mb-2 opacity-20" />
                        <span className="text-[10px] font-medium uppercase tracking-widest">No boards found</span>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {filteredBoards.map((board) => {
                            const isActive = activeBoardId === board.id;

                            return (
                                <button
                                    key={board.id}
                                    onClick={() => setActiveBoardId(board.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative group ${isActive
                                            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                                        }`}
                                >
                                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isActive
                                            ? 'bg-indigo-100 dark:bg-indigo-900/50'
                                            : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'
                                        }`}>
                                        <FiLayers size={16} />
                                    </div>

                                    <div className="flex-1 text-left min-w-0">
                                        <p className="text-sm font-semibold truncate leading-tight">
                                            {board.name}
                                        </p>
                                        <p className="text-[10px] opacity-60 font-medium uppercase tracking-tighter">
                                            Synced recently
                                        </p>
                                    </div>

                                    <AnimatePresence>
                                        {isActive && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.5 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.5 }}
                                                className="flex-shrink-0"
                                            >
                                                <FiCheck className="text-indigo-600 dark:text-indigo-400" size={14} />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {!isActive && (
                                        <FiChevronRight
                                            className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-300"
                                            size={14}
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BoardList;
