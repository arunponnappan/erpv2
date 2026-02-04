import React, { useMemo } from 'react';
import { useVirtual } from 'react-virtual';
import { useMondayStore, selectFilteredItems, selectActiveBoard } from '../../store/mondayStore';
import { LoadingState, EmptyState } from '../shared/StateComponents';
import { getItemThumbnail } from '../../utils/imageHelpers';
import { FiImage, FiSettings, FiExternalLink, FiEdit2 } from 'react-icons/fi';

/**
 * Enterprise-grade Virtualized Items Table
 * Handles thousands of items with smooth 60fps scrolling
 */
const ItemsTable = ({ onRowClick, onEditClick }) => {
    const items = useMondayStore(selectFilteredItems);
    const activeBoard = useMondayStore(selectActiveBoard);
    const itemsLoading = useMondayStore((state) => state.itemsLoading);
    const isEditMode = useMondayStore((state) => state.isEditMode);

    const parentRef = React.useRef();

    const rowVirtualizer = useVirtual({
        size: items.length,
        parentRef,
        estimateSize: React.useCallback(() => 56, []), // row height
        overscan: 10,
    });

    const columns = useMemo(() => {
        if (!activeBoard?.columns) return [];
        return activeBoard.columns;
    }, [activeBoard]);

    if (itemsLoading && items.length === 0) {
        return <LoadingState message="Loading board items..." />;
    }

    if (!itemsLoading && items.length === 0) {
        return (
            <EmptyState
                title="No items found"
                description="Try adjusting your filters or sync the board to fetch data."
            />
        );
    }

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            <div
                ref={parentRef}
                className="flex-1 overflow-auto custom-scrollbar"
            >
                <div
                    style={{
                        height: `${rowVirtualizer.totalSize}px`,
                        width: '100%',
                        position: 'relative',
                    }}
                >
                    {/* Table Header */}
                    <div className="sticky top-0 z-10 flex bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 font-medium text-xs text-gray-500 uppercase tracking-wider">
                        <div className="flex-shrink-0 w-16 px-4 py-3 flex items-center justify-center">Log</div>
                        <div className="flex-shrink-0 w-64 px-4 py-3">Name</div>
                        {columns.map(col => (
                            <div key={col.id} className="flex-shrink-0 w-48 px-4 py-3 truncate">
                                {col.title}
                            </div>
                        ))}
                        <div className="flex-1 min-w-[100px]"></div>
                    </div>

                    {/* Table Body */}
                    {rowVirtualizer.virtualItems.map((virtualRow) => {
                        const item = items[virtualRow.index];
                        const thumbnail = getItemThumbnail(item);

                        return (
                            <div
                                key={item.id}
                                onClick={() => onRowClick?.(item)}
                                className="absolute top-0 left-0 w-full flex items-center border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group"
                                style={{
                                    height: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start}px)`,
                                }}
                            >
                                {/* Image Column */}
                                <div className="flex-shrink-0 w-16 px-4 h-full flex items-center justify-center border-r border-gray-100 dark:border-gray-800">
                                    {thumbnail ? (
                                        <img
                                            src={thumbnail}
                                            alt=""
                                            className="w-10 h-10 rounded shadow-sm object-cover bg-gray-100"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                                            <FiImage size={20} />
                                        </div>
                                    )}
                                </div>

                                {/* Name Column */}
                                <div className="flex-shrink-0 w-64 px-4 font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                                    {item.name}
                                </div>

                                {/* Dynamic Columns */}
                                {columns.map(col => {
                                    const val = item.column_values.find(cv => cv.id === col.id);
                                    return (
                                        <div key={col.id} className="flex-shrink-0 w-48 px-4 text-sm text-gray-600 dark:text-gray-400 truncate">
                                            {val?.text || <span className="text-gray-300 dark:text-gray-600">—</span>}
                                        </div>
                                    );
                                })}

                                {/* Actions (Visible on hover) */}
                                <div className="flex-1 flex justify-end px-4 gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {isEditMode && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onEditClick?.(item); }}
                                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                        >
                                            <FiEdit2 size={16} />
                                        </button>
                                    )}
                                    <button className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                                        <FiExternalLink size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ItemsTable;
