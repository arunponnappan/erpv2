import React from 'react';
import { FiImage, FiCpu, FiDownload, FiTrash2, FiRefreshCw, FiHardDrive, FiCheck } from 'react-icons/fi';

/**
 * Enhanced Sync Menu Component
 * Provides configuration options for the sync process
 */
const SyncMenu = ({
    optimizeImages,
    setOptimizeImages,
    keepOriginals,
    setKeepOriginals,
    forceSyncImages,
    setForceSyncImages,
    onClearCache,
    onClose
}) => {

    // Toggle Switch Component
    const Toggle = ({ label, description, checked, onChange, icon: Icon, color = "indigo" }) => (
        <label className="flex items-start justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group">
            <div className="flex gap-3">
                <div className={`mt-0.5 p-1.5 rounded-md ${checked ? `bg-${color}-100 text-${color}-600` : 'bg-gray-100 text-gray-400'}`}>
                    <Icon size={16} />
                </div>
                <div className="flex flex-col">
                    <span className={`text-sm font-medium ${checked ? 'text-gray-900' : 'text-gray-600'}`}>{label}</span>
                    <span className="text-xs text-gray-500">{description}</span>
                </div>
            </div>

            <div className="relative inline-flex items-center cursor-pointer mt-1">
                <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                />
                <div className={`w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-${color}-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${checked ? `peer-checked:bg-${color}-600` : ''}`}></div>
            </div>
        </label>
    );

    return (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-[100] animate-fadeIn ring-1 ring-black ring-opacity-5 overflow-hidden">
            {/* Header */}
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <FiRefreshCw className="w-3 h-3" /> Sync Configuration
                </span>
            </div>

            <div className="p-2 space-y-1">
                <div className="px-3 py-1.5">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Assets & Images</span>
                </div>

                <Toggle
                    label="Optimize Images"
                    description="Convert to WebP (Recommended)"
                    checked={optimizeImages}
                    onChange={(val) => {
                        setOptimizeImages(val);
                        localStorage.setItem('monday_optimizeImages', val);
                    }}
                    icon={FiCpu}
                />

                <Toggle
                    label="Keep Originals"
                    description="Save high-res copies"
                    checked={keepOriginals}
                    onChange={(val) => {
                        setKeepOriginals(val);
                        localStorage.setItem('monday_keepOriginals', val);
                    }}
                    icon={FiHardDrive}
                />

                <div className="border-t border-gray-100 my-1"></div>

                <div className="px-3 py-1.5">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Advanced</span>
                </div>

                <Toggle
                    label="Force Re-download"
                    description="Overwrite existing local files"
                    checked={forceSyncImages}
                    onChange={setForceSyncImages}
                    icon={FiRefreshCw}
                    color="orange"
                />
            </div>

            {/* Footer Actions */}
            <div className="bg-gray-50 p-3 border-t border-gray-100 space-y-2">
                <button
                    onClick={() => {
                        onClose();
                        onClearCache();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-red-600 hover:bg-red-100 transition-colors border border-transparent hover:border-red-200"
                >
                    <FiTrash2 className="w-4 h-4" /> Clear Local Cache
                </button>
            </div>
        </div>
    );
};

export default SyncMenu;
