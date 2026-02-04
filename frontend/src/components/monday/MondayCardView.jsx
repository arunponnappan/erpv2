import React from 'react';
import { FiImage, FiFileText, FiCalendar, FiUser } from 'react-icons/fi';

const MondayCardView = ({ items, columnsMap, showImages, optimizeImages, setSelectedItem }) => {
    const getImageUrl = (item) => {
        if (!showImages) return null;

        // Look for image columns
        const imageCol = item.column_values?.find(cv =>
            cv.type === 'file' || cv.type === 'image' || cv.value?.includes('http')
        );

        if (imageCol?.value) {
            try {
                const parsed = JSON.parse(imageCol.value);
                if (parsed.files && parsed.files.length > 0) {
                    return optimizeImages ? parsed.files[0].optimized_url || parsed.files[0].url : parsed.files[0].url;
                }
            } catch {
                // If not JSON, might be direct URL
                if (imageCol.value.startsWith('http')) {
                    return imageCol.value;
                }
            }
        }
        return null;
    };

    const getKeyFields = (item) => {
        // Get first 3-4 important columns (excluding images)
        return item.column_values?.slice(0, 4).filter(cv =>
            cv.type !== 'file' && cv.type !== 'image' && cv.text
        ) || [];
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
            {items.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">
                    No items to display
                </div>
            )}
            {items.map(item => {
                const imageUrl = getImageUrl(item);
                const keyFields = getKeyFields(item);

                return (
                    <div
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className="bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-lg transition-all cursor-pointer overflow-hidden group"
                    >
                        {/* Image Thumbnail */}
                        {imageUrl ? (
                            <div className="aspect-video bg-gray-100 relative overflow-hidden">
                                <img
                                    src={imageUrl}
                                    alt={item.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.parentElement.innerHTML = '<div class="flex items-center justify-center h-full text-gray-400"><svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="aspect-video bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
                                <FiFileText className="w-12 h-12 text-indigo-300" />
                            </div>
                        )}

                        {/* Card Content */}
                        <div className="p-4">
                            {/* Title */}
                            <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                                {item.name}
                            </h3>

                            {/* Key Fields */}
                            <div className="space-y-1.5">
                                {keyFields.slice(0, 3).map((field, idx) => (
                                    <div key={idx} className="flex items-start gap-2 text-sm">
                                        <span className="text-gray-500 text-xs font-medium min-w-[80px] truncate">
                                            {columnsMap[field.id]?.title || field.id}:
                                        </span>
                                        <span className="text-gray-700 flex-1 truncate">
                                            {field.text || '-'}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Footer Meta */}
                            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                    <FiFileText size={12} />
                                    ID: {item.id}
                                </span>
                                {item.updated_at && (
                                    <span className="flex items-center gap-1">
                                        <FiCalendar size={12} />
                                        {new Date(item.updated_at).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default MondayCardView;
