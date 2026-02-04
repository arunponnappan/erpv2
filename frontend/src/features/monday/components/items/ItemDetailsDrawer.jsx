import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiImage, FiSettings, FiExternalLink, FiClock, FiCheckCircle, FiInfo } from 'react-icons/fi';
import { getItemThumbnail } from '../../utils/imageHelpers';

/**
 * Item Details Side Drawer
 * Detailed inspection, image preview, and column management
 */
const ItemDetailsDrawer = ({ item, isOpen, onClose }) => {
    if (!item) return null;

    const thumbnail = getItemThumbnail(item);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 overflow-hidden"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-white dark:bg-gray-900 shadow-2xl z-[60] flex flex-col border-l border-gray-200 dark:border-gray-700"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-lg">
                                    <FiInfo size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">
                                        Item Details
                                    </h2>
                                    <p className="text-xs text-gray-500 font-medium">ID: {item.id}</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                            >
                                <FiX size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                            {/* Main Image Segment */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Preview</h3>
                                <div className="aspect-video bg-gray-50 dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 relative group">
                                    {thumbnail ? (
                                        <img src={thumbnail} alt="" className="w-full h-full object-contain" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                                            <FiImage size={48} className="mb-2 opacity-50" />
                                            <span className="text-xs font-medium">No High-Res Image Available</span>
                                        </div>
                                    )}

                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                        <button className="px-4 py-2 bg-white text-gray-900 rounded-lg text-xs font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2">
                                            <FiSettings size={14} /> Edit Image
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Identity Segment */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Basic Information</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1">Item Name</label>
                                        <p className="text-base font-semibold text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-700">
                                            {item.name}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Column Values Segment */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Board Data</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    {item.column_values?.map((col) => (
                                        <div key={col.id} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 transition-hover hover:border-indigo-200 dark:hover:border-indigo-900/50">
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1.5">{col.id}</label>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    {col.text || 'ÔÇö'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                            <button
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <FiCheckCircle size={18} /> Finish Inspection
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ItemDetailsDrawer;
