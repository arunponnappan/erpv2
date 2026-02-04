import React from 'react';
import { motion } from 'framer-motion';
import { useMondayStore, selectFilteredItems, selectActiveBoard } from '../../store/mondayStore';
import { FiActivity, FiBox, FiCheckCircle, FiClock, FiAlertCircle } from 'react-icons/fi';

/**
 * Board Statistics Dashboard
 * Displays visual metrics and summary data for the active board
 */
const BoardStats = () => {
    const items = useMondayStore(selectFilteredItems);
    const activeBoard = useMondayStore(selectActiveBoard);
    const itemsLoading = useMondayStore((state) => state.itemsLoading);

    if (itemsLoading || !activeBoard) return null;

    const stats = [
        {
            label: 'Total Items',
            value: items.length,
            icon: <FiBox size={20} />,
            color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30'
        },
        {
            label: 'Synced',
            value: items.filter(i => i.column_values?.length > 0).length,
            icon: <FiCheckCircle size={20} />,
            color: 'bg-green-50 text-green-700 dark:bg-green-900/30'
        },
        {
            label: 'Active Filters',
            value: useMondayStore.getState().filters.length,
            icon: <FiActivity size={20} />,
            color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30'
        },
        {
            label: 'Last Sync',
            value: '2m ago',
            icon: <FiClock size={20} />,
            color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30'
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
            {stats.map((stat, index) => (
                <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4"
                >
                    <div className={`p-3 rounded-xl ${stat.color}`}>
                        {stat.icon}
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">
                            {stat.label}
                        </p>
                        <p className="text-2xl font-black text-gray-900 dark:text-gray-100">
                            {stat.value}
                        </p>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

export default BoardStats;
