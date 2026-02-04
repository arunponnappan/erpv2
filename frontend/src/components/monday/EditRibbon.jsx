import React from 'react';
import { FiEdit2, FiX, FiCheck, FiLoader } from 'react-icons/fi';

const EditRibbon = ({ isEditMode, modifiedItems, handleCancelEdit, handleSaveChanges, isSaving }) => {
    if (!isEditMode) return null;

    const changesCount = Object.keys(modifiedItems).length;

    return (
        <div className="mt-4 p-5 bg-indigo-50 border border-indigo-100 rounded-xl shadow-sm animate-fadeIn relative mb-4 mx-8">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 p-2 rounded-full">
                        <FiEdit2 className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900">Edit Mode Active</h3>
                        <p className="text-xs text-indigo-700 mt-0.5">
                            Click on cells to modify data. Changes are queued below.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right mr-4">
                        <span className="block text-2xl font-bold text-indigo-700 leading-none">
                            {changesCount}
                        </span>
                        <span className="text-xs text-indigo-600 uppercase font-medium tracking-wide">Pending Changes</span>
                    </div>
                    <button
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-all shadow-sm text-sm font-bold"
                    >
                        <FiX className="w-4 h-4" /> Cancel
                    </button>
                    <button
                        onClick={handleSaveChanges}
                        disabled={isSaving || changesCount === 0}
                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-md hover:shadow-lg text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                        {isSaving ? <FiLoader className="animate-spin w-5 h-5" /> : <FiCheck className="w-5 h-5" />}
                        Save All Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditRibbon;
