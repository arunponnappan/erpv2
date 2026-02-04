import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMondayStore, selectFilteredItems } from '../../store/mondayStore';
import { LoadingState, EmptyState } from '../shared/StateComponents';
import ItemCard from './ItemCard';

/**
 * Responsive Items Grid / Gallery
 * Efficiently handles grid layout and animations for board items
 */
const ItemsGrid = ({ onCardClick, onEditClick }) => {
    const items = useMondayStore(selectFilteredItems);
    const itemsLoading = useMondayStore((state) => state.itemsLoading);
    const isEditMode = useMondayStore((state) => state.isEditMode);

    if (itemsLoading && items.length === 0) {
        return <LoadingState message="Loading gallery view..." />;
    }

    if (!itemsLoading && items.length === 0) {
        return (
            <EmptyState
                title="No items found"
                description="Try adjusting your filters or sync the board to fetch data."
            />
        );
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900 custom-scrollbar">
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6"
            >
                <AnimatePresence>
                    {items.map((item) => (
                        <ItemCard
                            key={item.id}
                            item={item}
                            onClick={onCardClick}
                            onEditClick={onEditClick}
                            isEditMode={isEditMode}
                        />
                    ))}
                </AnimatePresence>
            </motion.div>

            {/* Scroll indicator or pagination could go here */}
        </div>
    );
};

export default ItemsGrid;
