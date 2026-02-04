import { useEffect } from 'react';
import { useMondayStore } from '../store/mondayStore';
import marketplaceService from '../../../services/marketplaceService';
import { useToast } from '../../../context/ToastContext';

/**
 * Hook for fetching and managing Monday board items
 */
export const useMondayItems = (boardId) => {
    const toast = useToast();
    const {
        items,
        setItems,
        itemsLoading,
        setItemsLoading,
        cursor,
        setCursor,
        addItems
    } = useMondayStore();

    // Fetch items when board changes
    useEffect(() => {
        if (!boardId) return;

        const fetchItems = async () => {
            setItemsLoading(true);
            setItems([]);
            setCursor(null);

            try {
                const data = await marketplaceService.monday.getBoardItems(boardId, null, 10000);
                setItems(Array.isArray(data.items) ? data.items : []);
                setCursor(data.cursor);
            } catch (error) {
                console.error('Failed to fetch items:', error);
                toast.error('Error', 'Failed to fetch board items');
            } finally {
                setItemsLoading(false);
            }
        };

        fetchItems();
    }, [boardId]);

    // Load more items
    const loadMore = async () => {
        if (!boardId || !cursor || itemsLoading) return;

        setItemsLoading(true);
        try {
            const data = await marketplaceService.monday.getBoardItems(boardId, cursor);
            const newItems = Array.isArray(data.items) ? data.items : [];
            addItems(newItems);
            setCursor(data.cursor);
        } catch (error) {
            toast.error('Error', 'Failed to load more items');
        } finally {
            setItemsLoading(false);
        }
    };

    return {
        items,
        loading: itemsLoading,
        hasMore: !!cursor,
        loadMore
    };
};
