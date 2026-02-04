import React from 'react';
import { FiPlus, FiTrash2, FiChevronUp, FiX } from 'react-icons/fi';

const TagInput = ({ value, onChange, placeholder, className }) => {
    return (
        <input
            type="text"
            className={`block w-full border-gray-200 bg-gray-50 rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${className}`}
            placeholder={placeholder}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
        />
    );
};

const MondayFilterBar = ({
    showFilter,
    setShowFilter,
    filters,
    setFilters,
    availableColumns,
    columnsMap,
    filteredCount,
    totalCount
}) => {
    // Handlers
    const addFilter = () => {
        setFilters([...filters, { id: Date.now(), column: 'all', condition: 'contains', value: '' }]);
    };

    const removeFilter = (id) => {
        setFilters(filters.filter(f => f.id !== id));
    };

    const updateFilter = (id, field, val) => {
        setFilters(filters.map(f => f.id === id ? { ...f, [field]: val } : f));
    };

    const clearFilters = () => setFilters([]);

    if (!showFilter) {
        // Summary View when collapsed but active
        const hasActiveFilters = filters.some(f => f.value || f.condition === 'is_duplicate');
        if (hasActiveFilters) {
            return (
                <div className="mx-8 mt-4 pt-4 border-t border-gray-100 flex items-center justify-between animate-fadeIn mb-4">
                    <div className="flex gap-2 flex-wrap">
                        <span className="text-sm text-gray-500 mr-2">Filters:</span>
                        {filters.filter(f => f.value || f.condition === 'is_duplicate').map((f, i) => (
                            <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                {f.column === 'all' ? 'Any' : (columnsMap?.[f.column]?.title || f.column)} {f.condition === 'is_duplicate' ? 'is Duplicate' : `: ${f.value}`}
                            </span>
                        ))}
                    </div>
                </div>
            );
        }
        return null;
    }

    return (
        <div className="mx-8 mt-4 p-5 bg-slate-50 border border-slate-200 rounded-xl shadow-sm animate-fadeIn relative mb-4">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">Active Filters</h3>
                    <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-medium">{filters.length}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={addFilter}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-md hover:bg-indigo-100 transition-colors"
                    >
                        <FiPlus className="w-3 h-3" /> Add Filter
                    </button>
                    <button
                        onClick={clearFilters}
                        className="text-xs font-medium text-gray-500 hover:text-red-600 flex items-center gap-1 px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors"
                        title="Clear All Filters"
                    >
                        Clear All
                    </button>
                    <div className="h-4 w-px bg-gray-300 mx-1"></div>
                    <button
                        onClick={() => setShowFilter(false)}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                    >
                        <FiChevronUp />
                    </button>
                </div>
            </div>

            <div className="space-y-3">
                {filters.length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-lg">
                        No active filters. Click "Add Filter" to start refining results.
                    </div>
                )}
                {filters.map((filter, index) => (
                    <div key={filter.id} className="flex flex-wrap gap-2 items-center bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                        <div className="w-40 flex-shrink-0">
                            <select
                                value={filter.column}
                                onChange={(e) => updateFilter(filter.id, 'column', e.target.value)}
                                className="block w-full py-1.5 pl-2 pr-8 border-gray-200 bg-gray-50 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="all">All Columns</option>
                                <option value="name">Item Name</option>
                                <option value="has_image">Has Image</option>
                                {availableColumns.filter(c => c !== 'name').map(col => (
                                    <option key={col} value={col}>{col === 'name' ? 'Item Name' : (columnsMap?.[col]?.title || col.replace(/_/g, ' '))}</option>
                                ))}
                            </select>
                        </div>
                        <div className="w-32 flex-shrink-0">
                            <select
                                value={filter.condition || 'contains'}
                                onChange={(e) => updateFilter(filter.id, 'condition', e.target.value)}
                                className="block w-full py-1.5 pl-2 pr-8 border-gray-200 bg-gray-50 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="contains">Contains</option>
                                <option value="equals">Equals</option>
                                <option value="is_duplicate">Is Duplicate</option>
                            </select>
                        </div>
                        {filter.condition !== 'is_duplicate' ? (
                            <div className="flex-1 min-w-[200px]">
                                <div className="relative">
                                    <TagInput
                                        value={filter.value}
                                        onChange={(val) => updateFilter(filter.id, 'value', val)}
                                        placeholder="Type to search..."
                                        className="py-1.5 text-sm"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center px-2">
                                <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full border border-orange-100 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                                    Showing duplicate values
                                </span>
                            </div>
                        )}
                        <button
                            onClick={() => removeFilter(filter.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                            title="Remove Filter"
                        >
                            <FiTrash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center text-sm">
                <button
                    onClick={addFilter}
                    className="flex items-center gap-1.5 font-medium text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                >
                    <FiPlus className="w-4 h-4" /> Add Condition
                </button>
                <div className="flex items-center gap-4">
                    <button
                        onClick={clearFilters}
                        className="text-xs text-red-500 hover:text-red-700 underline"
                    >
                        Reset Filters
                    </button>
                    <span className="text-gray-500 font-medium">
                        Showing <span className="text-gray-900">{filteredCount}</span> of {totalCount} items
                    </span>
                </div>
            </div>
        </div>
    );
};

export default MondayFilterBar;
