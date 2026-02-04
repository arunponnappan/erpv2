import React, { useState } from 'react';
import { FiChevronDown, FiChevronRight, FiImage, FiLock } from 'react-icons/fi';
import { CachedImage, getItemImages, EmptyState } from './Shared';

// Helper: Render table cell
const renderCell = (colVal, item, showImages, optimizeImages = false, isEditable = false, onUpdate = null, columnDef = null, isEditMode = false, modifiedItems = null) => {
    if (!colVal) return '-';

    // Status/Dropdown Edit Mode
    const isStatus = columnDef?.type === 'color' || columnDef?.type === 'status';
    const isDropdown = columnDef?.type === 'dropdown';

    // Check pending modification
    const pendingVal = modifiedItems?.[item.id]?.[colVal.id];
    const displayVal = pendingVal !== undefined ? pendingVal : colVal.text;
    const isModified = pendingVal !== undefined;

    if (isEditable && isEditMode && onUpdate && (isStatus || isDropdown)) {
        let options = [];
        try {
            if (columnDef.settings_str) {
                const settings = JSON.parse(columnDef.settings_str);
                if (settings.labels) {
                    options = Object.entries(settings.labels).map(([index, label]) => ({
                        value: index,
                        label: label,
                        color: settings.labels_colors ? settings.labels_colors[index] : null
                    }));
                }
            }
        } catch (e) {
            console.error("Failed to parse column settings", e);
        }

        if (options.length > 0) {
            return (
                <select
                    value={displayVal || ''}
                    onChange={(e) => onUpdate(item.id, colVal.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className={`w-full bg-white border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-md px-2 text-sm h-9 shadow-sm cursor-pointer transition-all ${isModified ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'}`}
                    style={{
                        color: options.find(o => o.label === displayVal)?.color || '#111827',
                        fontWeight: 600
                    }}
                >
                    {options.map(opt => (
                        <option key={opt.label} value={opt.label} style={{ color: opt.color, fontWeight: 500 }}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            );
        }
    }

    // Image Handling (Unified with Card View)
    // Pass colVal.id to ensure we only get images for THIS column
    const images = getItemImages(item, optimizeImages, colVal?.id);
    if (images.length > 0 && showImages) {
        return (
            <div className="flex -space-x-2 overflow-hidden hover:space-x-1 transition-all pl-2">
                {images.map((img, i) => (
                    <div key={i} className="relative group/img z-0 hover:z-20 transition-all hover:scale-110">
                        <CachedImage
                            file={img}
                            proxyUrl={img.proxyUrl}
                            originalUrl={img.originalUrl}
                            usePublic={img.usePublic}
                            className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover bg-gray-100 cursor-pointer shadow-sm"
                            compact={true}
                            shouldLoad={showImages}
                            isLocal={img.isLocal}
                        />
                    </div>
                ))}
            </div>
        );
    } else if (images.length > 0 && !showImages) {
        return <div className="text-xs text-gray-500 px-2 italic">{images.length} images (hidden)</div>;
    }

    // Editable Cell logic (Explicit Mode)
    if (isEditable && isEditMode && onUpdate) {
        return (
            <input
                type="text"
                value={displayVal || ''}
                onChange={(e) => onUpdate(item.id, colVal.id, e.target.value)}
                className={`w-full bg-white border ${isModified ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300'} focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-md px-2 text-sm text-gray-900 h-9 shadow-sm transition-all`}
            />
        );
    }

    // Read-only view with modification highlight
    return (
        <div className={`max-w-[200px] truncate text-gray-900 ${isModified ? 'bg-indigo-50 text-indigo-700 px-1 rounded' : ''}`} title={displayVal}>
            {displayVal || '-'}
        </div>
    );
};

// Component: Table Row
const ItemRow = ({ item, level = 0, columns, onRowClick, showImages, optimizeImages, editableColumns = [], onUpdate = null, columnsMap = null, isEditMode = false, modifiedItems = null }) => {
    const [expanded, setExpanded] = useState(false);
    const hasSubitems = item.subitems && item.subitems.length > 0;
    const paddingLeft = `${level * 20 + 10}px`;

    const handleRowClick = (e) => {
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) return; // Prevent row click on inputs
        if (onRowClick) onRowClick(item);
    };

    return (
        <>
            <tr onClick={handleRowClick} className="hover:bg-gray-50 border-b border-gray-100 last:border-0 group transition-colors cursor-pointer">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-100" style={{ paddingLeft }}>
                    <div className="flex items-center">
                        {hasSubitems ? (
                            <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} className="p-1 rounded hover:bg-gray-200 mr-2 text-gray-500 transition-colors relative z-10">
                                {expanded ? <FiChevronDown /> : <FiChevronRight />}
                            </button>
                        ) : <span className="w-6 mr-2"></span>}

                        {(() => {
                            const isNameEditable = editableColumns.includes('name');
                            const pendingVal = modifiedItems?.[item.id]?.['name'];
                            const displayVal = pendingVal !== undefined ? pendingVal : item.name;
                            const isModified = pendingVal !== undefined;

                            if (isEditMode && isNameEditable) {
                                return (
                                    <input
                                        type="text"
                                        value={displayVal}
                                        onChange={(e) => onUpdate(item.id, 'name', e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        className={`w-full bg-white border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-md px-2 text-sm h-9 shadow-sm transition-all font-semibold ${isModified ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300'}`}
                                    />
                                );
                            }
                            return (
                                <span className={`truncate ${isModified ? 'bg-indigo-50 text-indigo-700 px-1 rounded' : ''}`}>
                                    {displayVal}
                                </span>
                            );
                        })()}
                    </div>
                </td>
                {columns.map((colId) => {
                    const colVal = item.column_values.find(c => c.id === colId) || { id: colId, text: '', value: '' };
                    const isEditable = editableColumns.includes(colId);
                    const colDef = columnsMap ? columnsMap[colId] : null;
                    return <td key={`${item.id}-${colId}`} className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-100 last:border-0">{renderCell(colVal, item, showImages, optimizeImages, isEditable, onUpdate, colDef, isEditMode, modifiedItems)}</td>;
                })}
            </tr>
            {expanded && hasSubitems && item.subitems.map(sub => (
                <ItemRow key={sub.id} item={sub} level={level + 1} columns={columns} onRowClick={onRowClick} showImages={showImages} optimizeImages={optimizeImages} editableColumns={editableColumns} onUpdate={onUpdate} columnsMap={columnsMap} isEditMode={isEditMode} modifiedItems={modifiedItems} />
            ))}
        </>
    );
};

const MondayTable = ({
    items,
    columnsMap,
    boardItems,
    activeBoardId,
    setSelectedItem,
    showImages,
    optimizeImages,
    editableColumns,
    handleUpdateColumn,
    isEditMode,
    modifiedItems,
    isLoading,
    handleLoadMore,
    cursor
}) => {

    // Derived columns from first board item or columnsMap
    // Ideally use columnsMap keys
    const columns = columnsMap ? Object.keys(columnsMap) : (boardItems[0]?.column_values || []).map(c => c.id);

    if (!activeBoardId) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <FiImage className="w-16 h-16 opacity-10 mb-4" />
                <p>Select a board to view items</p>
            </div>
        );
    }

    if (isLoading && items.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!isLoading && items.length === 0) {
        return <EmptyState onSync={() => { }} syncing={false} />;
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 w-64 min-w-[200px]">
                                Item Name
                            </th>
                            {columns.map(colId => {
                                const colDef = columnsMap ? columnsMap[colId] : null;
                                return (
                                    <th key={colId} scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 min-w-[150px]">
                                        <div className="flex items-center gap-1">
                                            {colDef?.title || colId.replace(/_/g, ' ')}
                                            {editableColumns.includes(colId) && isEditMode && <FiLock className="w-3 h-3 text-gray-300" />}
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {items.map(item => (
                            <ItemRow
                                key={item.id}
                                item={item}
                                columns={columns}
                                onRowClick={setSelectedItem}
                                showImages={showImages}
                                optimizeImages={optimizeImages}
                                editableColumns={editableColumns}
                                onUpdate={handleUpdateColumn}
                                columnsMap={columnsMap}
                                isEditMode={isEditMode}
                                modifiedItems={modifiedItems}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
            {((isLoading || cursor) && items.length > 0) && (
                <div className="p-4 border-t border-gray-200 flex justify-center">
                    <button
                        onClick={handleLoadMore}
                        disabled={isLoading}
                        className="flex items-center px-4 py-2 border border-indigo-600 shadow-sm text-sm font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none disabled:opacity-50"
                    >
                        {isLoading ? 'Loading...' : 'Load More'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default MondayTable;
