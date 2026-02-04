import React from 'react';
import { motion } from 'framer-motion';
import { FiImage, FiSettings, FiExternalLink, FiClock, FiCheckCircle } from 'react-icons/fi';
import { getItemThumbnail } from '../../utils/imageHelpers';

/**
 * Modern Item Card for Gallery View
 * Features premium aesthetics, hover effects, and responsive layout
 */
const ItemCard = ({ item, onClick, onEditClick, isEditMode, columnsMap, cardColumns = [] }) => {
    const thumbnail = getItemThumbnail(item);

    // Helper to get formatted column data (with colors for status)
    const getColumnData = (colId) => {
        const colVal = item.column_values?.find(c => c.id === colId);
        const colDef = columnsMap?.[colId];

        if (!colVal || !colDef) return null;
        if (!colVal.text) return null; // Skip empty

        // Handle Status/Color columns
        if (colDef.type === 'color' || colDef.type === 'status' || colDef.type === 'dropdown') {
            try {
                if (colDef.settings_str) {
                    const settings = JSON.parse(colDef.settings_str);
                    if (settings.labels) {
                        // Find label entry
                        const labelEntry = Object.entries(settings.labels).find(([_, label]) => label === colVal.text);
                        if (labelEntry) {
                            const [index, _] = labelEntry;
                            return {
                                id: colId,
                                title: colDef.title,
                                text: colVal.text,
                                type: 'status',
                                color: settings.labels_colors?.[index]
                            };
                        }
                    }
                }
            } catch (e) {
                // Fallback to plain text on error
            }
        }

        return {
            id: colId,
            title: colDef.title,
            text: colVal.text,
            type: 'text'
        };
    };

    // Determine which columns to show
    // 1. Use cardColumns from config if available
    // 2. Fallback: First 3 columns that are NOT name/file/date(implied)
    const displayColumns = React.useMemo(() => {
        if (cardColumns && cardColumns.length > 0) {
            return cardColumns.map(id => getColumnData(id)).filter(Boolean);
        }

        // Auto-detect important columns
        // Filter out name, logs, files
        if (!item.column_values) return [];

        return item.column_values
            .slice(0, 5) // Look at first few
            .filter(c =>
                c.id !== 'name' &&
                c.type !== 'file' &&
                c.type !== 'subtasks' &&
                c.text // Must have value
            )
            .map(c => getColumnData(c.id))
            .slice(0, 3); // Take top 3
    }, [item, cardColumns, columnsMap]);

    // Helper to determine text color based on background (YIQ contrast)
    const getTextColor = (hexcolor) => {
        if (!hexcolor) return 'black';
        // Remove hash if present
        hexcolor = hexcolor.replace('#', '');
        const r = parseInt(hexcolor.substr(0, 2), 16);
        const g = parseInt(hexcolor.substr(2, 2), 16);
        const b = parseInt(hexcolor.substr(4, 2), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? 'black' : 'white';
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -4, shadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer group shadow-sm flex flex-col h-full hover:border-indigo-300 transition-colors"
            onClick={() => onClick?.(item)}
        >
            {/* Image Container */}
            <div className="aspect-video bg-gray-50 dark:bg-gray-900 relative overflow-hidden flex-shrink-0">
                {thumbnail ? (
                    <img
                        src={thumbnail}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 dark:text-gray-700 bg-gray-100 dark:bg-gray-800">
                        <FiImage size={32} className="mb-2 opacity-50" />
                    </div>
                )}

                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                        className="p-2 bg-white text-gray-900 rounded-full hover:bg-indigo-600 hover:text-white transition-all transform hover:scale-110 shadow-lg"
                        title="View Details"
                    >
                        <FiExternalLink size={18} />
                    </button>
                    {isEditMode && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onEditClick?.(item); }}
                            className="p-2 bg-white text-gray-900 rounded-full hover:bg-indigo-600 hover:text-white transition-all transform hover:scale-110 shadow-lg"
                            title="Edit Item"
                        >
                            <FiSettings size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col flex-grow">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 mb-3 leading-snug min-h-[2.5em] group-hover:text-indigo-600 transition-colors" title={item.name}>
                    {item.name}
                </h3>

                {/* Key Fields Grid */}
                <div className="space-y-2 mb-3 flex-grow">
                    {displayColumns.length > 0 ? (
                        displayColumns.map((col, idx) => (
                            <div key={col.id || idx} className="flex items-center justify-between text-xs">
                                <span className="text-gray-500 dark:text-gray-400 font-medium truncate max-w-[40%]">
                                    {col.title || col.id}:
                                </span>

                                {col.type === 'status' && col.color ? (
                                    <span
                                        className="px-2.5 py-1 rounded-md font-bold text-[10px] uppercase tracking-wide truncate max-w-[55%] shadow-sm"
                                        style={{
                                            backgroundColor: col.color,
                                            color: getTextColor(col.color)
                                        }}
                                    >
                                        {col.text}
                                    </span>
                                ) : (
                                    <span className="text-gray-700 dark:text-gray-300 font-medium truncate max-w-[55%]">
                                        {col.text}
                                    </span>
                                )}
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-gray-400 italic">No key fields</p>
                    )}
                </div>

                {/* Footer Info */}
                <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                        <FiClock size={12} />
                        <span>{item.updated_at ? new Date(item.updated_at).toLocaleDateString() : 'Recently'}</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default ItemCard;
