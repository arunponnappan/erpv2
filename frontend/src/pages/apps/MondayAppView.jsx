import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import marketplaceService from '../../services/marketplaceService';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useLayout } from '../../context/LayoutContext';
import { useDebug } from '../../context/DebugContext';
import { FiMenu, FiChevronRight, FiChevronLeft, FiChevronDown, FiChevronUp, FiAlertCircle, FiLoader, FiX, FiDownload, FiExternalLink, FiGrid, FiList, FiLogOut, FiFilter, FiSearch, FiImage, FiPlus, FiTrash2, FiZap, FiRefreshCw, FiArrowUp, FiArrowDown, FiEdit2, FiCheck, FiSettings, FiCpu, FiDownloadCloud, FiRotateCw, FiRotateCcw, FiCrop, FiCopy, FiZoomIn, FiZoomOut, FiLock, FiSidebar, FiClock, FiMaximize2, FiMinimize2, FiLayout, FiBriefcase, FiMapPin, FiBox, FiActivity, FiArrowRight, FiTarget, FiFileText, FiMove, FiType, FiDatabase, FiXCircle } from 'react-icons/fi';
import { Html5Qrcode } from 'html5-qrcode';
import Tesseract from 'tesseract.js';
import JobHistoryPanel from '../../features/monday/components/sync/JobHistoryPanel';

import { useMondaySync } from '../../features/monday/hooks/useMondaySync';
import { getProxyUrl } from '../../features/monday/utils/imageHelpers';
import syncService from '../../features/monday/services/syncService';


// --- SHARED HELPERS & COMPONENTS ---

// Component to fetch image to local blob with progress
const CachedImage = ({ file, proxyUrl, originalUrl, usePublic, className, compact = false, shouldLoad = true, isLocal = false, style = {}, imgRef, optimizeImages = false, crossOrigin = undefined }) => {
    // Ensure we have a ref to check 'complete' status, even if parent didn't pass one
    const localRef = useRef(null);
    const resolvedRef = imgRef || localRef;

    const [blobUrl, setBlobUrl] = useState(null);
    const [isLoadingBlob, setIsLoadingBlob] = useState(shouldLoad && !isLocal); // Fetching blob
    const [isImageReady, setIsImageReady] = useState(false); // Image tag ONLOAD fired
    const [error, setError] = useState(false);
    const [failedLocal, setFailedLocal] = useState(false);
    const { isDebugEnabled } = useDebug();
    const isDebugMode = isDebugEnabled;

    useEffect(() => {
        return () => {
        };
    }, []);

    const effectiveIsLocal = isLocal && !failedLocal;

    // Reset fallback state ONLY when underlying props change
    useEffect(() => {
        setFailedLocal(false);
    }, [proxyUrl, originalUrl]);

    // Effect for non-local (proxied/blob) images
    useEffect(() => {
        setIsImageReady(false); // Reset ready state on new load

        // If it's local static file (and we haven't failed back yet) or we shouldn't load, skip fetch logic
        if (effectiveIsLocal || !shouldLoad) {
            setIsLoadingBlob(false);
            return;
        }

        let active = true;
        setIsLoadingBlob(true);
        setError(false);
        setBlobUrl(null); // Fix Flash: Clear previous image immediately

        const fetchImage = async () => {
            try {
                if (usePublic || !proxyUrl) {
                    // No proxy needed, use original
                    setBlobUrl(null);
                    setIsLoadingBlob(false);
                    return;
                }

                const response = await fetch(proxyUrl);
                if (!response.ok) throw new Error('Fetch failed');

                const blob = await response.blob();
                if (active) {
                    const localUrl = URL.createObjectURL(blob);
                    setBlobUrl(localUrl);
                    setIsLoadingBlob(false);
                }
            } catch (err) {
                if (active) {
                    setError(true);
                    setIsLoadingBlob(false);
                }
            }
        };

        fetchImage();

        return () => {
            active = false;
        };
    }, [proxyUrl, originalUrl, usePublic, shouldLoad, effectiveIsLocal]); // Keep effectiveIsLocal to trigger fetch on fallback

    // Force check if image is already cached (browser often skips onLoad for 304s)
    useEffect(() => {
        if (!effectiveIsLocal && !blobUrl && !originalUrl) return; // Nothing to load yet

        if (resolvedRef.current && resolvedRef.current.complete) {
            setIsImageReady(true);
        }
    });

    // Cleanup blob on unmount
    useEffect(() => {
        return () => {
            if (blobUrl && blobUrl.startsWith('blob:')) {
                URL.revokeObjectURL(blobUrl);
            }
        };
    }, [blobUrl]);

    // Determine final source
    const getAbsoluteUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        try {
            // Default to BACKEND (8000) not Frontend (Current Origin) for assets
            const apiOrigin = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

            // Normalize slashes
            const normalizedUrl = url.replace(/\\/g, '/');

            // Clean specific "double slash" patterns often seen in logs (e.g., //assets)
            // We strip ALL leading slashes to ensure cleaner concatenation
            const cleanRelPath = normalizedUrl.replace(/^[\/\\]+/, '');

            // FIX: Check for Double API Prefix
            // If apiOrigin ends with /api/v1 AND cleanRelPath starts with api/v1, we have a problem.
            // We should use the origin of apiOrigin, or just return path if it looks absolute relative to domain.

            // Logic: If path starts with "api/", treat it as relative to the Site Root, not API Root.
            // For most deployments, VITE_API_URL includes /api/v1.
            // If we have api/v1/tools/files..., and we join with API_URL, we get duplication.

            if (cleanRelPath.startsWith('api/')) {
                // Extract Domain from API URL
                try {
                    const originObj = new URL(apiOrigin);
                    return `${originObj.origin}/${cleanRelPath}`;
                } catch (e) {
                    // If API URL is relative or invalid, fall back to simple concat but try to strip common prefix?
                    // If API_URL is "/api/v1", origin is undefined/complex. 
                    // Let's assume absolute URL for production.
                    return `${apiOrigin.replace(/\/api\/v1\/?$/, '')}/${cleanRelPath}`;
                }
            }

            // Fix 404: Route assets/monday_files/ through Backend Static Mount
            // Backend mounts "assets" dir at /assets
            if (cleanRelPath.includes('assets/monday_files/')) {
                // If cleanRelPath is "assets/monday_files/..." -> Result: origin + / + cleanRelPath
                return `${apiOrigin}/${cleanRelPath}`;
            }

            return `${apiOrigin}/${cleanRelPath}`;
        } catch (e) {
            return url;
        }
    };

    const imgSrcBase = (optimizeImages && file?.optimized_path)
        ? getAbsoluteUrl(file.optimized_path)
        : (effectiveIsLocal ? getAbsoluteUrl(proxyUrl) : (blobUrl || (crossOrigin ? getAbsoluteUrl(proxyUrl) : originalUrl)));

    const imgSrc = (imgSrcBase && file?._ts) ? `${imgSrcBase}${imgSrcBase.includes('?') ? '&' : '?'}t=${file._ts}` : imgSrcBase;

    if (error) {
        return (
            <div
                className={`flex items-center justify-center bg-gray-100 text-gray-400 ${className}`}
                title={`Failed to load: ${isLocal ? getAbsoluteUrl(proxyUrl) : (proxyUrl || originalUrl)}`}
            >
                <FiImage className={compact ? "w-4 h-4" : "w-8 h-8"} />
            </div>
        );
    }

    // UX FIX: If it's a local file, show it regardless of "Fetch Immediately" setting!
    // Only show placeholder if it's remote AND user disabled fetching.
    if (!shouldLoad && !effectiveIsLocal) {
        return (
            <div className={`${className} bg-gray-100 flex items-center justify-center text-gray-400`}>
                <FiImage className={compact ? "w-4 h-4" : "w-8 h-8"} />
            </div>
        );
    }

    return (
        <div className={`relative ${compact ? 'inline-block' : 'w-full h-full flex items-center justify-center'}`}>
            {isDebugMode && (
                <div className={`absolute -top-1 -right-1 z-20 w-3 h-3 rounded-full border-2 border-white ${isLocal ? 'bg-green-500' : 'bg-orange-500'}`} title={isLocal ? "Local File" : "Remote (S3)"} />
            )}

            {/* Show Spinner until BOTH Fetching is done AND Image OnLoad fired */}
            {(isLoadingBlob || !isImageReady) && !error && imgSrc && (
                <div className="absolute inset-0 flex items-center justify-center z-10 transition-opacity duration-300">
                    <div className={`${compact ? 'w-5 h-5 border-2' : 'w-10 h-10 border-4'} border-gray-200 border-t-indigo-500 rounded-full animate-spin`}></div>
                </div>
            )}

            {imgSrc && (
                <img
                    key={imgSrc} // Force fresh image element per source to prevent buffer ghosting
                    ref={resolvedRef}
                    src={imgSrc}
                    crossOrigin={crossOrigin}
                    alt={file?.name || 'Image'}
                    className={`${className} transition-opacity duration-300 ${isImageReady ? 'opacity-100' : 'opacity-0'}`}
                    style={style}
                    loading="lazy"
                    draggable={false}
                    onMouseDown={(e) => {
                        // Prevent native drag start if not magic mode
                        e.preventDefault();
                    }}
                    onLoad={() => setIsImageReady(true)}
                    onError={() => {
                        if (isLocal && !failedLocal) {
                            console.warn("CachedImage: Local file failed, falling back to remote.", getAbsoluteUrl(proxyUrl));
                            setFailedLocal(true);
                            // Do NOT set error yet, let it re-render with remote url
                        } else {
                            setError(true);
                            setIsImageReady(true); // Stop spinner
                        }
                    }}
                />
            )}
            {!imgSrc && !isLoadingBlob && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <FiImage className="w-8 h-8 opacity-20" />
                </div>
            )}
        </div>
    );
};

const EmptyState = ({ onSync, syncing }) => (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-fadeIn bg-white rounded-xl border border-dashed border-gray-300 mx-auto max-w-2xl mt-8">
        <div className="bg-indigo-50 p-6 rounded-full mb-6">
            {syncing ? (
                <FiLoader className="w-12 h-12 text-indigo-500 animate-spin" />
            ) : (
                <FiRefreshCw className="w-12 h-12 text-indigo-500" />
            )}
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">It looks emptiness here</h3>
        <p className="text-gray-500 max-w-md mb-8">
            This board hasn't synced any items yet. Click the button below to fetch data from Monday.com.
        </p>
        <button
            onClick={onSync}
            disabled={syncing}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
            {syncing ? (
                <>
                    <FiLoader className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    Syncing...
                </>
            ) : (
                <>
                    <FiRefreshCw className="-ml-1 mr-2 h-5 w-5" />
                    Sync Now
                </>
            )}
        </button>
    </div>
);

// Helper to extract all images for an item
const getItemImages = (item, optimize = false, targetColumnId = null) => {
    const images = [];
    if (!item || !item.column_values) return images;

    for (const col of item.column_values) {
        if (targetColumnId && col.id !== targetColumnId) continue;
        if (col.value) {
            try {
                const parsed = JSON.parse(col.value);
                if (parsed && parsed.files && Array.isArray(parsed.files)) {
                    for (const f of parsed.files) {
                        if (f.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) || f.fileType === 'ASSET') {
                            // Resolve URL logic
                            // Initialize variables
                            let originalUrl = f.url || f.public_url;
                            let localUrl = null;
                            let usePublic = false;
                            let size = Number(f.size || f.file_size || 0);
                            let rotation = 0;
                            let _ts = null; // Declare _ts here

                            let localOriginalUrl = null;
                            let localOptimizedUrl = null;

                            // DEBUG LOG
                            // console.log("DEBUG: Processing File", f.name, "AssetID:", f.assetId, "Has Assets:", !!item.assets);

                            // Check for asset details in 'item.assets'
                            if (item.assets) {
                                const targetAssetId = String(f.assetId || f.id || '');
                                let asset = null;

                                if (Array.isArray(item.assets)) {
                                    asset = item.assets.find(a => String(a.id) === targetAssetId);
                                } else {
                                    asset = item.assets[targetAssetId];
                                }

                                if (asset) {
                                    originalUrl = asset.public_url || asset.url;
                                    usePublic = !!asset.public_url;

                                    // Resolve URLs for Originals and Optimized
                                    // FIXED: Using correct proxy path /api/v1/tools/files/ for local assets
                                    const getProxyPath = (fullPath) => {
                                        if (!fullPath) return null;
                                        try {
                                            const normalized = fullPath.replace(/\\/g, '/');
                                            const split = normalized.split('/assets/');
                                            if (split.length > 1) {
                                                return `/api/v1/tools/files/${split[1]}`;
                                            }
                                            // Fallback if not absolute path (maybe already relative?)
                                            return fullPath.startsWith('/') ? fullPath : `/api/v1/tools/files/${fullPath}`;
                                        } catch (e) { return null; }
                                    };

                                    if (asset.local_path || asset.local_url) {
                                        localOriginalUrl = getProxyPath(asset.local_path || asset.local_url);
                                    }
                                    if (asset.optimized_path || asset.optimized_url) {
                                        localOptimizedUrl = getProxyPath(asset.optimized_path || asset.optimized_url);
                                    }

                                    // Determine preferred local URL for display
                                    if (optimize && localOptimizedUrl) {
                                        localUrl = localOptimizedUrl;
                                    } else if (localOriginalUrl) {
                                        localUrl = localOriginalUrl;
                                    }

                                    if (asset.stats) {
                                        if (asset.stats.original_size) size = asset.stats.original_size;
                                        else if (asset.stats.optimized_size) size = asset.stats.optimized_size;
                                    }
                                    if (asset.rotation) {
                                        rotation = Number(asset.rotation);
                                    }

                                    // Capture timestamp if available (for cache busting)
                                    if (asset._ts || (asset.assets && asset.assets._ts)) {
                                        _ts = asset._ts || asset.assets._ts;
                                    }
                                }
                            }

                            // Proxy fallback if no local URL
                            const optimizeParam = optimize ? '&optimize=true&width=400' : '';
                            const proxyUrl = localUrl
                                ? localUrl
                                : (originalUrl ? `${api.defaults.baseURL}/integrations/monday/proxy?url=${encodeURIComponent(originalUrl)}${usePublic ? '&skip_auth=true' : ''}${optimizeParam}` : null);

                            images.push({ ...f, proxyUrl, originalUrl, usePublic, isLocal: !!localUrl, size, localOriginalUrl, localOptimizedUrl, rotation, itemId: item.id, _ts });
                        }
                    }
                }
            } catch (e) { }
        }
    }
    return images;
};

// Helper: Render table cell
const renderCell = (colVal, item, showImages, optimizeImages = false, isEditable = false, onUpdate = null, columnDef = null, isEditMode = false, modifiedItems = null, refreshKey = 0) => {
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
                        value: index, // Status uses index as value usually? No, API uses label text usually but mutation might need index. 
                        // Check Monday API. usually 'index' or 'label'.
                        // Actually mutation expects { "label": "Done" } or { "index": 1 }
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
    if (images.length > 0 && showImages) { // Only render if showImages is true, else fallback to text? No, maybe icon.
        // Actually, if showImages is false, we might want to show a placeholder icon sequence or nothing.
        // User said "images is not showing". 
        return (
            <div className="flex -space-x-2 overflow-hidden hover:space-x-1 transition-all pl-2">
                {images.map((img, i) => (
                    <div key={i} className="relative group/img z-0 hover:z-20 transition-all hover:scale-110">
                        <CachedImage
                            key={`${i}-${refreshKey}`}
                            file={img}
                            proxyUrl={img.proxyUrl ? `${img.proxyUrl}${img.proxyUrl.includes('?') ? '&' : '?'}t=${refreshKey}` : null}
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
const ItemRow = ({ item, level = 0, columns, onRowClick, showImages, optimizeImages, editableColumns = [], onUpdate = null, columnsMap = null, isEditMode = false, modifiedItems = null, refreshKey }) => {
    const [expanded, setExpanded] = useState(false);
    const hasSubitems = item.subitems && item.subitems.length > 0;
    const paddingLeft = `${level * 20 + 10}px`;

    const handleRowClick = (e) => {
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) return; // Prevent row click on inputs
        if (onRowClick) onRowClick(item);
    };

    // Lazy Load
    const rowRef = useRef(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsVisible(true);
                observer.disconnect();
            }
        }, { rootMargin: '200px' }); // Preload 200px ahead

        if (rowRef.current) observer.observe(rowRef.current);
        return () => observer.disconnect();
    }, []);

    if (!isVisible) {
        return <tr ref={rowRef} className="h-12 border-b border-gray-100"><td colSpan={columns.length + 1} className="bg-white/50 animate-pulse" /></tr>;
    }

    return (
        <>
            <tr ref={rowRef} onClick={handleRowClick} className="hover:bg-gray-50 border-b border-gray-100 last:border-0 group transition-colors cursor-pointer">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-100" style={{ paddingLeft }}>
                    <div className="flex items-center">
                        {hasSubitems ? (
                            <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} className="p-1 rounded hover:bg-gray-200 mr-2 text-gray-500 transition-colors relative z-10">
                                {expanded ? <FiChevronDown /> : <FiChevronRight />}
                            </button>
                        ) : <span className="w-6 mr-2"></span>}

                        {(() => {
                            const isNameEditable = editableColumns.includes('name');
                            const pendingVal = modifiedItems[item.id]?.['name'];
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
                    const colVal = item.column_values.find(c => c.id === colId) || { id: colId, text: '', value: '' }; // Fallback for missing cols
                    const isEditable = editableColumns.includes(colId);
                    const colDef = columnsMap ? columnsMap[colId] : null;
                    return <td key={`${item.id}-${colId}`} className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-100 last:border-0">{renderCell(colVal, item, showImages, optimizeImages, isEditable, onUpdate, colDef, isEditMode, modifiedItems, refreshKey)}</td>;
                })}
            </tr>
            {expanded && hasSubitems && item.subitems.map(sub => (
                <ItemRow key={sub.id} item={sub} level={level + 1} columns={columns} onRowClick={onRowClick} showImages={showImages} optimizeImages={optimizeImages} editableColumns={editableColumns} onUpdate={onUpdate} columnsMap={columnsMap} isEditMode={isEditMode} modifiedItems={modifiedItems} refreshKey={refreshKey} />
            ))}
        </>
    );
};

// Component: Details Drawer
const ItemDetailsDrawer = ({ item, onClose, showImages, optimizeImages, columnsMap, zIndex = 50, inline = false, onItemUpdate, editableColumns = [], refreshKey = 0 }) => {
    const [downloading, setDownloading] = useState({});
    const [isEditing, setIsEditing] = useState(false);
    const [editValues, setEditValues] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (item && isEditing) {
            const initial = {};
            if (columnsMap) {
                Object.keys(columnsMap).forEach(colId => {
                    const existing = item.column_values.find(c => c.id === colId);
                    initial[colId] = existing ? (existing.text || '') : '';
                });
                initial['name'] = item.name;
            } else {
                item.column_values.forEach(c => initial[c.id] = c.text);
                initial['name'] = item.name;
            }
            setEditValues(initial);
        }
    }, [item, columnsMap, isEditing]);

    const handleSave = async () => {
        if (!onItemUpdate) return;
        setIsSaving(true);
        const success = await onItemUpdate(item.id, editValues);
        setIsSaving(false);
        if (success) setIsEditing(false);
    };

    if (!item) return null;

    const allFiles = [];
    const extractFiles = (itm) => {
        itm.column_values.forEach(col => {
            if (col.value) {
                try {
                    const parsed = JSON.parse(col.value);
                    if (parsed && parsed.files && Array.isArray(parsed.files)) {
                        parsed.files.forEach(f => {
                            let assetData = {};
                            let localUrl = null;
                            let originalUrl = f.url || f.public_url;
                            let usePublic = false;
                            let localOriginalUrl = null;

                            if (f.assetId && itm.assets) {
                                const foundAsset = itm.assets.find(a => a.id === String(f.assetId) || a.id === parseInt(f.assetId));
                                if (foundAsset) {
                                    assetData = foundAsset;

                                    // NEW: Use helper to get strictly local URL
                                    localUrl = getProxyUrl(foundAsset, optimizeImages);
                                    // Get explicit original (unoptimized) for "Open Original" button
                                    localOriginalUrl = getProxyUrl(foundAsset, false);

                                    // Fallback to original ONLY if we want to allow public links (BUT requirement is local-only)
                                    // So we store originalUrl just for reference or "Download Original" but NOT for display
                                    originalUrl = foundAsset.public_url || foundAsset.url;
                                }
                            }

                            allFiles.push({
                                ...f,
                                ...assetData,
                                columnId: col.id,
                                itemName: itm.name,
                                proxyUrl: localUrl, // Only populated if local
                                localOriginalUrl,   // Explicit local original
                                originalUrl,        // Monday URL
                                isLocal: !!localUrl
                            });
                        });
                    }
                } catch (e) { }
            }
        });
    };
    extractFiles(item);

    const handleDownload = async (url, filename) => {
        // ... (Keep existing download logic if needed, or better, use Global downloadFile helper if available)
        // For now, reusing existing logic to minimize diff, but note that `downloadFile` in ItemCard is cleaner.
        if (downloading[url]) return;
        try {
            setDownloading(prev => ({ ...prev, [url]: 1 }));
            const response = await fetch(url);
            if (!response.ok) throw new Error('Download failed');
            const reader = response.body.getReader();
            const contentLength = +response.headers.get('Content-Length');
            let receivedLength = 0;
            const chunks = [];
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
                receivedLength += value.length;
                if (contentLength) {
                    const progress = Math.round((receivedLength / contentLength) * 100);
                    setDownloading(prev => ({ ...prev, [url]: progress }));
                }
            }
            const blob = new Blob(chunks);
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(objectUrl);
        } catch (error) {
            console.error("Download error:", error);
            toast.error("Download Failed");
        } finally {
            setDownloading(prev => { const next = { ...prev }; delete next[url]; return next; });
        }
    };

    const content = (
        <div className={`${inline ? 'w-full h-full border-l border-gray-800' : 'w-screen max-w-2xl shadow-xl'} bg-white flex flex-col transform transition ease-in-out duration-500 sm:duration-700`}>
            <div className={`px-4 py-6 ${inline ? 'bg-gray-900 border-b border-gray-700' : 'bg-indigo-600'} sm:px-6 shrink-0`}>
                <div className="flex items-start justify-between">
                    <h2 className="text-lg font-medium text-white break-words pr-4">{isEditing ? 'Editing Item' : item.name}</h2>
                    <div className="flex items-center gap-2">
                        {!isEditing && onItemUpdate && (
                            <button onClick={() => setIsEditing(true)} className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10" title="Edit Item">
                                <FiEdit2 className="w-5 h-5" />
                            </button>
                        )}
                        {isEditing && (
                            <>
                                <button onClick={() => setIsEditing(false)} disabled={isSaving} className="text-white/80 hover:text-white text-xs font-bold px-2 py-1 rounded hover:bg-white/10">
                                    Cancel
                                </button>
                                <button onClick={handleSave} disabled={isSaving} className="bg-white text-indigo-600 px-3 py-1 text-xs font-bold rounded shadow hover:bg-indigo-50 flex items-center gap-1">
                                    {isSaving ? <FiLoader className="animate-spin -ml-1 mr-2 h-5 w-5" /> : <FiCheck className="w-3 h-3" />}
                                    Save
                                </button>
                            </>
                        )}
                        <button onClick={onClose} className="bg-transparent rounded-md text-gray-300 hover:text-white focus:outline-none p-1" title="Hide Details">
                            <FiSidebar className="h-6 w-6" />
                        </button>
                    </div>
                </div>
                <p className={`mt-1 text-sm ${inline ? 'text-gray-400' : 'text-indigo-100'}`}>ID: {item.id}</p>
            </div>
            <div className="relative flex-1 overflow-y-auto p-6">
                {/* Gallery */}
                {
                    allFiles.length > 0 && (
                        <div className="mb-8">
                            <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Attachments ({allFiles.length})</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {allFiles.map((file, idx) => {
                                    const { isLocal, proxyUrl, originalUrl, name } = file;
                                    const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(name || '');
                                    const progress = proxyUrl && downloading[proxyUrl];

                                    return (
                                        <div key={idx} className="group relative border rounded-xl overflow-hidden bg-gray-50 hover:shadow-md transition-shadow">
                                            {/* Image Display */}
                                            <div className="aspect-square bg-gray-200 relative overflow-hidden">
                                                {isImage ? (
                                                    isLocal && proxyUrl ? (
                                                        <img
                                                            src={proxyUrl ? `${proxyUrl}${proxyUrl.includes('?') ? '&' : '?'}t=${refreshKey}` : proxyUrl}
                                                            alt={name}
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                                        />
                                                    ) : (
                                                        // Placeholder for missing/remote image
                                                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-2 text-center">
                                                            <FiImage className="w-8 h-8 opacity-40 mb-1" />
                                                            <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Not Synced</span>
                                                        </div>
                                                    )
                                                ) : (
                                                    // Generic File Placeholder
                                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                                                        <FiDownloadCloud className="w-8 h-8 opacity-40" />
                                                    </div>
                                                )}

                                                {/* Local Image Fallback Hidden Div */}
                                                <div className="hidden w-full h-full flex-col items-center justify-center text-red-400 absolute inset-0 bg-gray-100">
                                                    <FiAlertCircle className="w-6 h-6 mb-1" />
                                                    <span className="text-[10px]">Load Error</span>
                                                </div>
                                            </div>

                                            {/* Overlay Actions */}
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                                                <div className="flex gap-2 justify-center mb-auto pt-8">
                                                    {/* View Action (Only if local) */}
                                                    {isLocal && proxyUrl && (
                                                        <button
                                                            onClick={() => window.open(proxyUrl, '_blank')}
                                                            className="p-1.5 bg-white text-gray-900 rounded-full hover:bg-indigo-600 hover:text-white shadow-sm"
                                                            title="Open File"
                                                        >
                                                            <FiExternalLink size={14} />
                                                        </button>
                                                    )}
                                                    {/* Open Original Link */}
                                                    {(file.localOriginalUrl || file.originalUrl) && (
                                                        <button
                                                            onClick={() => window.open(file.localOriginalUrl || file.originalUrl, '_blank')}
                                                            className="p-1.5 bg-white text-indigo-600 rounded-full hover:bg-orange-600 hover:text-white shadow-sm"
                                                            title="Open Original File"
                                                        >
                                                            <FiExternalLink size={14} />
                                                        </button>
                                                    )}
                                                    {/* Scan Action (New) */}

                                                </div>

                                                {/* Sync / Download Actions */}
                                                {isLocal && proxyUrl ? (
                                                    <button
                                                        onClick={() => handleDownload(proxyUrl, name)}
                                                        className="w-full py-1.5 bg-white text-indigo-600 rounded-md text-xs font-bold hover:bg-indigo-50 flex items-center justify-center gap-1 shadow-sm"
                                                    >
                                                        {progress ? `${progress}%` : <><FiDownload size={14} /> Save</>}
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            try {
                                                                e.target.disabled = true;
                                                                e.target.textContent = 'Syncing...';
                                                                const toastId = toast.info("Syncing image...", { autoClose: false });

                                                                await syncService.startSync(item.board_id, {
                                                                    filtered_item_ids: [String(item.id)],
                                                                    showImages: true,
                                                                    optimizeImages: true
                                                                });

                                                                toast.dismiss(toastId);
                                                                toast.success("Image synced!");
                                                                // Trigger update? The parent usually polls or we might need to force refresh item.
                                                                // For now, user has to refresh or wait for poll using JobHistory
                                                            } catch (err) {
                                                                console.error(err);
                                                                toast.error("Sync Failed");
                                                                e.target.disabled = false;
                                                                e.target.textContent = 'Retry';
                                                            }
                                                        }}
                                                        className="w-full py-1.5 bg-indigo-600 text-white rounded-md text-xs font-bold hover:bg-indigo-700 flex items-center justify-center gap-1 shadow-md border border-indigo-500"
                                                    >
                                                        <FiRefreshCw size={14} /> Get Image
                                                    </button>
                                                )}
                                            </div>

                                            {/* Metadata Footer */}
                                            <div className="p-2 bg-white border-t border-gray-100">
                                                <p className="text-xs font-medium text-gray-900 truncate" title={name}>{name}</p>
                                                <p className="text-[10px] text-gray-400">
                                                    {file.size ? (file.size / 1024).toFixed(0) + ' KB' : 'Unknown Size'}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )
                }
                {/* Details */}
                <div>
                    <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Item Details</h3>
                    {isEditing ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Item Name</label>
                                <input
                                    type="text"
                                    value={editValues['name'] || ''}
                                    onChange={e => setEditValues({ ...editValues, name: e.target.value })}
                                    className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            {(columnsMap ? Object.keys(columnsMap) : item.column_values.map(c => c.id)).map(colId => {
                                const colDef = columnsMap ? columnsMap[colId] : null;
                                const title = colDef?.title || colId.replace(/_/g, ' ');
                                const isEditable = editableColumns.includes(colId);

                                if (!isEditable) {
                                    // Read-Only View for Non-Editable Columns in Edit Mode
                                    const existing = item.column_values.find(c => c.id === colId);
                                    const value = existing ? (existing.text || '-') : '-';
                                    return (
                                        <div key={colId} className="opacity-60">
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                                                {title} <FiLock className="w-3 h-3" />
                                            </label>
                                            <div className="text-sm text-gray-700 p-2 bg-gray-50 rounded border border-transparent">{value}</div>
                                        </div>
                                    );
                                }

                                // Editable Input
                                return (
                                    <div key={colId}>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{title}</label>
                                        {colDef && (colDef.type === 'long-text' || colDef.type === 'text_array') ? (
                                            <textarea
                                                value={editValues[colId] || ''}
                                                onChange={e => setEditValues({ ...editValues, [colId]: e.target.value })}
                                                className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[100px]"
                                            />
                                        ) : (
                                            <input
                                                type={colDef && colDef.type === 'numeric' ? 'number' : 'text'}
                                                value={editValues[colId] || ''}
                                                onChange={e => setEditValues({ ...editValues, [colId]: e.target.value })}
                                                className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <dl className="space-y-4">
                            {/* Show ALL Columns in Read Mode too if requested, or keep existing 'populated only' view? User said 'all fields shuld ad in side panel'. */}
                            {(columnsMap ? Object.keys(columnsMap) : item.column_values.map(c => c.id)).map(colId => {
                                const colDef = columnsMap ? columnsMap[colId] : null;
                                const existing = item.column_values.find(c => c.id === colId);
                                const title = colDef?.title || colId.replace(/_/g, ' ');
                                const value = existing ? (existing.text || '-') : '-';

                                return (
                                    <div key={colId}>
                                        <dt className="text-sm font-medium text-gray-500">{title}</dt>
                                        <dd className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded break-words whitespace-pre-wrap">{value}</dd>
                                    </div>
                                )
                            })}
                        </dl>
                    )}
                </div>
            </div >

        </div >
    );

    if (inline) return content;

    return (
        <div className={`fixed inset-0 overflow-hidden z-[zIndex]`}>
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
                <div className="fixed inset-y-0 right-0 max-w-full flex">
                    {content}
                </div>
            </div>
        </div>
    );
};

// Component: Full Screen Image Gallery Modal
const ImageGalleryModal = ({ item, onClose, showImages, optimizeImages, columnsMap, onItemUpdate, onAssetUpdate, editableColumns, onNext, onPrev, hasNext, hasPrev, refreshKey, onRotationComplete, enterpriseSync, keepOriginals, onScan }) => {
    const [currentIndex, setCurrentIndex] = useState(item?.initialIndex || 0);
    const [viewOriginal, setViewOriginal] = useState(false); // Toggle between Optimized and Original

    // --- Scanner State ---
    const [isScanning, setIsScanning] = useState(false);
    const [scanMode, setScanMode] = useState(() => localStorage.getItem('erp_scanner_mode') || 'barcode'); // 'barcode' | 'ocr'
    const [scanTool, setScanTool] = useState('select'); // 'select' | 'pan'
    const [scanResult, setScanResult] = useState(null);
    const [ocrProgress, setOcrProgress] = useState(0);
    const [crop, setCrop] = useState({ x: 0, y: 0, width: 0, height: 0 }); // Percentages - start with no box
    const [interactionMode, setInteractionMode] = useState('none'); // 'none', 'drawing', 'moving', 'resizing'
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [startCrop, setStartCrop] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const [activeHandle, setActiveHandle] = useState(null);
    const overlayRef = useRef(null); // Ref for scanner overlay
    const [imageLoaded, setImageLoaded] = useState(false); // Track if main image ref is ready
    const [showScanSettings, setShowScanSettings] = useState(false);
    const [selectedSaveColumn, setSelectedSaveColumn] = useState(() => localStorage.getItem('erp_scanner_column')); // Column to save scan result
    const [boardColumns, setBoardColumns] = useState([]); // Board column configuration

    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    const [showExtractMenu, setShowExtractMenu] = useState(false); // New state for Smart Tools dropdown
    const [switchNotification, setSwitchNotification] = useState(null); // Item switch visual feedback
    // Rotation removed for permanent mode
    // Zoom/Details State
    const [zoom, setZoom] = useState(1);
    const [showDetails, setShowDetails] = useState(true); // Default to TRUE as requested

    // Removed "Viewing Item" toast state as per user request (reduced noise)

    const downloadMenuRef = useRef(null);
    const imageRef = useRef(null); // Added missing ref
    const images = getItemImages(item, optimizeImages);
    const saveTimeoutRef = useRef(null);
    const toast = useToast();
    const showToast = (message, type) => {
        if (type === 'error') toast.error(message);
        else if (type === 'success') toast.success(message);
        else toast.info(message);
    };

    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const panStartRef = useRef({ x: 0, y: 0 });

    const currentImage = images[currentIndex];
    // Helper to estimate image size if not provided
    const imageSize = currentImage?.size || 0;

    // Reset rotation/zoom on image change
    useEffect(() => {
        // setRotation(currentImage?.rotation || 0); // Removed for permanent rotation
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, [currentIndex]);

    // Fix: Valid reset when Item Changes (since component is reused without unmount)
    const prevItemIdRef = useRef(item?.id);
    useEffect(() => {
        if (item?.id !== prevItemIdRef.current) {
            // Item changed
            setCurrentIndex(item?.initialIndex || 0);
            setSwitchNotification(item?.name);
            const timer = setTimeout(() => setSwitchNotification(null), 1500);

            // Scanner Resets - DO NOT reset isScanning to allow continuous flow
            setScanResult(null);

            prevItemIdRef.current = item?.id;
            return () => clearTimeout(timer);
        }
    }, [item]);

    // Persist Scanner Mode
    useEffect(() => {
        localStorage.setItem('erp_scanner_mode', scanMode);
    }, [scanMode]);

    // Fetch board columns for scanner settings
    useEffect(() => {
        const fetchBoardColumns = async () => {
            if (item?.board_id) {
                console.log("Fetching board columns for board_id:", item.board_id);
                try {
                    const response = await api.get(`/integrations/monday/boards/${item.board_id}/columns`);
                    console.log("Board columns response:", response.data);

                    if (response.data?.columns) {
                        console.log("Raw columns:", response.data.columns);
                        // Filter to show only editable column types
                        const editableTypes = ['text', 'long-text', 'status', 'dropdown', 'numbers', 'phone', 'email', 'link'];
                        const editableColumns = response.data.columns.filter(col =>
                            editableTypes.includes(col.type)
                        );
                        console.log("Editable columns:", editableColumns);
                        setBoardColumns(editableColumns);
                    } else {
                        console.warn("No columns in response");
                    }
                } catch (err) {
                    console.error("Failed to fetch board columns:", err);
                    console.error("Error details:", err.response?.data);
                }
            } else {
                console.warn("No board_id available, item:", item);
            }
        };
        fetchBoardColumns();
    }, [item?.board_id]);

    // Persistence Effects
    useEffect(() => {
        localStorage.setItem('erp_scanner_mode', scanMode);
    }, [scanMode]);

    useEffect(() => {
        if (selectedSaveColumn) {
            localStorage.setItem('erp_scanner_column', selectedSaveColumn);
        }
    }, [selectedSaveColumn]);

    // Auto-select first column if none selected AND none in localStorage
    useEffect(() => {
        if (boardColumns.length > 0 && !selectedSaveColumn) {
            const saved = localStorage.getItem('erp_scanner_column');
            if (saved && boardColumns.some(c => c.id === saved)) {
                setSelectedSaveColumn(saved);
            } else {
                setSelectedSaveColumn(boardColumns[0].id);
            }
        }
    }, [boardColumns, selectedSaveColumn]);

    // Removed Toast Timer

    // Zoom Handlers
    const handleZoomIn = () => setZoom(z => Math.min(z + 0.5, 5));
    const handleZoomOut = () => {
        setZoom(z => {
            const next = Math.max(z - 0.5, 1);
            if (next === 1) setPan({ x: 0, y: 0 }); // Reset pan on zoom out to 1
            return next;
        });
    };
    const handleWheel = (e) => {
        if (e.ctrlKey) return;
        if (e.deltaY < 0) handleZoomIn();
        else handleZoomOut();
    };

    // Pan Handlers
    const handlePanMouseDown = (e) => {
        if (zoom <= 1) return;
        e.preventDefault();
        setIsPanning(true);
        panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    };

    const handlePanMouseMove = (e) => {
        if (!isPanning) return;
        e.preventDefault();
        const newX = e.clientX - panStartRef.current.x;
        const newY = e.clientY - panStartRef.current.y;
        setPan({ x: newX, y: newY });
    };

    const handlePanMouseUp = () => {
        setIsPanning(false);
    };

    // --- Scanner Helpers & Handlers ---
    const getCoords = (e) => {
        // Always use the overlay ref for coordinate calculation
        // This ensures consistency regardless of which element triggered the event
        if (!overlayRef.current) {
            console.warn("overlayRef not available");
            return { x: 50, y: 50 };
        }

        const rect = overlayRef.current.getBoundingClientRect();
        const clientX = e.clientX || e.touches?.[0]?.clientX;
        const clientY = e.clientY || e.touches?.[0]?.clientY;

        console.log("getCoords:", {
            clientX,
            clientY,
            rectLeft: rect.left,
            rectTop: rect.top,
            rectWidth: rect.width,
            rectHeight: rect.height
        });

        const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));

        console.log("Calculated coords:", { x, y });
        return { x, y };
    };

    const handleScanMouseDown = (e, mode, handle = null) => {
        // Allow panning if tool is 'pan' or middle (1) or right (2) mouse button
        if (scanTool === 'pan' || e.button === 1 || e.button === 2) {
            handlePanMouseDown(e);
            return;
        }

        e.preventDefault();
        e.stopPropagation(); // Prevent panning

        const coords = getCoords(e);
        setDragStart(coords);
        setStartCrop({ ...crop });
        setInteractionMode(mode);
        setActiveHandle(handle);

        if (mode === 'drawing') {
            setCrop({ x: coords.x, y: coords.y, width: 0, height: 0 });
            setStartCrop({ x: coords.x, y: coords.y, width: 0, height: 0 });
        }
    };

    const handleScanMouseMove = (e) => {
        if (interactionMode === 'none') return;
        e.preventDefault();
        e.stopPropagation();

        const current = getCoords(e);

        if (interactionMode === 'moving') {
            const deltaX = current.x - dragStart.x;
            const deltaY = current.y - dragStart.y;
            let newX = Math.max(0, Math.min(100 - startCrop.width, startCrop.x + deltaX));
            let newY = Math.max(0, Math.min(100 - startCrop.height, startCrop.y + deltaY));
            setCrop(prev => ({ ...prev, x: newX, y: newY }));
        }
        else if (interactionMode === 'drawing') {
            const minX = Math.min(dragStart.x, current.x);
            const minY = Math.min(dragStart.y, current.y);
            const width = Math.abs(current.x - dragStart.x);
            const height = Math.abs(current.y - dragStart.y);
            setCrop({ x: minX, y: minY, width, height });
        }
        else if (interactionMode === 'resizing') {
            let { x, y, width, height } = startCrop;
            const deltaX = current.x - dragStart.x;
            const deltaY = current.y - dragStart.y;

            if (activeHandle === 'nw') { x += deltaX; y += deltaY; width -= deltaX; height -= deltaY; }
            else if (activeHandle === 'ne') { y += deltaY; width += deltaX; height -= deltaY; }
            else if (activeHandle === 'sw') { x += deltaX; width -= deltaX; height += deltaY; }
            else if (activeHandle === 'se') { width += deltaX; height += deltaY; }

            if (width < 0) { x += width; width = Math.abs(width); }
            if (height < 0) { y += height; height = Math.abs(height); }
            if (x < 0) { width += x; x = 0; }
            if (y < 0) { height += y; y = 0; }
            if (x + width > 100) { width = 100 - x; }
            if (y + height > 100) { height = 100 - y; }

            setCrop({ x, y, width, height });
        }
    };

    const handleScanMouseUp = () => {
        setInteractionMode('none');
        setActiveHandle(null);
        if (crop.width < 5 || crop.height < 5) {
            if (interactionMode === 'drawing' && crop.width === 0) setCrop({ x: 20, y: 30, width: 60, height: 40 });
        }
    };

    // Save scan result to selected column
    const handleSaveToColumn = async (result) => {
        if (!selectedSaveColumn || !result) {
            toast.error("No column selected or no result to save");
            return;
        }

        try {
            if (onItemUpdate) {
                // Call the parent handler which handles API + Local State + Success Toast
                await onItemUpdate(item.id, { [selectedSaveColumn]: result });

                // Clear the crop box immediately on save
                setCrop({ x: 0, y: 0, width: 0, height: 0 });
                setInteractionMode('none');

                // Auto-advance logic
                if (onNext || (images.length > 1 && currentIndex < images.length - 1)) {
                    toast.info("Auto-advancing to next item...");
                    setTimeout(() => {
                        if (currentIndex < images.length - 1) {
                            setCurrentIndex(prev => prev + 1);
                        } else if (onNext) {
                            onNext();
                        }
                        setScanResult(null); // Clear result for next item
                    }, 1000);
                }
            } else {
                // Fallback (unlikely)
                await api.put(`/integrations/monday/items/${item.id}`, {
                    board_id: item.board_id,
                    column_values: { [selectedSaveColumn]: result }
                });
                toast.success("Saved successfully");
            }
        } catch (err) {
            console.error("Save to column failed:", err);
            toast.error("Failed to save: " + (err.response?.data?.detail || err.message || "Unknown error"));
        }
    };

    // Copy result to clipboard
    const handleCopyResult = (result) => {
        if (!result) {
            toast.error("No result to copy");
            return;
        }

        navigator.clipboard.writeText(result).then(() => {
            toast.success("Copied to clipboard!");
        }).catch(err => {
            console.error("Copy failed:", err);
            toast.error("Failed to copy");
        });
    };

    const scanBlob = async (blob, label) => {
        if (!blob) return { text: null, error: "No blob" };
        const file = new File([blob], `scan_${label}.png`, { type: "image/png" });
        try {
            const html5QrCode = new Html5Qrcode("barcode-scanner-hidden-element", {
                experimentalFeatures: { useBarCodeDetectorIfSupported: true },
                verbose: false
            });
            const result = await html5QrCode.scanFileV2(file, true);
            if (result && result.decodedText) return { text: result.decodedText, error: null };
        } catch (e) {
            return { text: null, error: e.message || String(e) };
        }
        return { text: null, error: "Unknown error" };
    };

    const processImage = (ctx, width, height, mode) => {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        if (mode === 'grayscale_contrast') {
            let totalLumina = 0;
            for (let i = 0; i < data.length; i += 4) totalLumina += (data[i] * 0.299) + (data[i + 1] * 0.587) + (data[i + 2] * 0.114);
            const avgLumina = totalLumina / (data.length / 4);
            for (let i = 0; i < data.length; i += 4) {
                const gray = (data[i] * 0.299) + (data[i + 1] * 0.587) + (data[i + 2] * 0.114);
                const val = gray > avgLumina ? 255 : 0;
                data[i] = data[i + 1] = data[i + 2] = val;
            }
        } else {
            for (let i = 0; i < data.length; i += 4) {
                if (mode === 'invert') {
                    data[i] = 255 - data[i];     // R
                    data[i + 1] = 255 - data[i + 1]; // G
                    data[i + 2] = 255 - data[i + 2]; // B
                } else if (mode === 'grayscale') {
                    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                    data[i] = data[i + 1] = data[i + 2] = gray;
                }
            }
        }
        ctx.putImageData(imageData, 0, 0);
    };

    const handleRunScan = async () => {
        if (!imageRef.current) return;
        setOcrProgress(0);
        setScanResult(null);
        let lastError = null;

        try {
            const image = imageRef.current;
            const naturalWidth = image.naturalWidth;
            const naturalHeight = image.naturalHeight;

            const cropX = (crop.x / 100) * naturalWidth;
            const cropY = (crop.y / 100) * naturalHeight;
            const cropW = (crop.width / 100) * naturalWidth;
            const cropH = (crop.height / 100) * naturalHeight;

            if (cropW <= 0 || cropH <= 0) {
                toast.error("Invalid selection area.");
                return;
            }

            // Scaling & Padding
            const MIN_WIDTH = 800;
            const scaleFactor = Math.max(1, MIN_WIDTH / cropW);
            const scaledW = cropW * scaleFactor;
            const scaledH = cropH * scaleFactor;
            const padding = 40;

            const canvas = document.createElement('canvas');
            canvas.width = scaledW + (padding * 2);
            canvas.height = scaledH + (padding * 2);
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.imageSmoothingEnabled = false;

            const clearCanvas = () => { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height); };
            const drawScaled = () => { ctx.drawImage(image, cropX, cropY, cropW, cropH, padding, padding, scaledW, scaledH); };
            const getCanvasBlob = () => new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

            // --- OCR MODE ---
            if (scanMode === 'ocr') {
                toast.info("Processing...", "Extracting text...");
                clearCanvas();
                drawScaled();
                processImage(ctx, canvas.width, canvas.height, 'grayscale');

                const dataUrl = canvas.toDataURL('image/png');
                const result = await Tesseract.recognize(dataUrl, 'eng', {
                    logger: m => { if (m.status === 'recognizing text') setOcrProgress(Math.round(m.progress * 100)); }
                });

                if (result && result.data && result.data.text.trim().length > 0) {
                    setScanResult(result.data.text);
                    toast.success("Success", "Text Extracted!");
                } else {
                    toast.error("No Text Found", "Could not extract text.");
                }
                return;
            }

            // --- BARCODE MODE ---
            toast.info("Scanning...", "Analyzing barcode...");

            // Strategy 1: Normal
            clearCanvas(); drawScaled();
            let blob = await getCanvasBlob();
            let result = await scanBlob(blob, 'normal');
            if (result.text) { setScanResult(result.text); toast.success("Barcode Detected!"); return; }
            lastError = result.error;

            // Strategy 2: Grayscale
            clearCanvas(); drawScaled(); processImage(ctx, canvas.width, canvas.height, 'grayscale');
            blob = await getCanvasBlob(); result = await scanBlob(blob, 'grayscale');
            if (result.text) { setScanResult(result.text); toast.success("Barcode Detected!"); return; }

            // Strategy 3: Inverted 
            clearCanvas(); drawScaled(); processImage(ctx, canvas.width, canvas.height, 'invert');
            blob = await getCanvasBlob(); result = await scanBlob(blob, 'inverted');
            if (result.text) { setScanResult(result.text); toast.success("Barcode Detected!"); return; }

            // Strategy 4: High Contrast
            clearCanvas(); drawScaled(); processImage(ctx, canvas.width, canvas.height, 'grayscale_contrast');
            blob = await getCanvasBlob(); result = await scanBlob(blob, 'high_contrast');
            if (result.text) { setScanResult(result.text); toast.success("Barcode Detected!"); return; }

            toast.error("Scan Failed", "Could not detect barcode.");

        } catch (e) {
            console.error("Scan Error:", e);
            toast.error("Error", e.message);
        }
    };

    // ... (keep getRelativeCoords)







    // Refs for Event Listeners
    const dragStartRef = useRef(null);
    const dragEndRef = useRef(null);

    // --- Fetch Barcode Config ---


    // Clean up timeout
    useEffect(() => {
        return () => {
            // Removed timeout
        };
    }, []);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
                setShowDownloadMenu(false);
            }
        };
        if (showDownloadMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showDownloadMenu]);

    if (!item) return null;

    const handleNext = (e) => {
        e?.stopPropagation();
        if (currentIndex < images.length - 1) {
            setCurrentIndex((prev) => prev + 1);
        } else if (hasNext && onNext) {
            onNext();
        }
    };

    const handlePrev = (e) => {
        e?.stopPropagation();
        if (currentIndex > 0) {
            setCurrentIndex((prev) => prev - 1);
        } else if (hasPrev && onPrev) {
            onPrev();
        }
    };

    const handleRotateCw = async (e) => {
        e?.stopPropagation();
        if (!currentImage?.isLocal && !currentImage?.usePublic) {
            if (!currentImage.isLocal) {
                showToast("Can only rotate local synched images.", "error");
                return;
            }
        }

        try {
            // New Endpoint for Physical Rotation
            const res = await api.post(`/integrations/monday/items/${currentImage.itemId}/assets/${currentImage.assetId || currentImage.id}/rotate`, { angle: 90 });

            // Check success
            if (res.data.status === 'success') {
                const timestamp = Date.now();
                // Update local state: Reset rotation to 0, add timestamp to force reload
                if (onAssetUpdate) {
                    onAssetUpdate(currentImage.itemId, currentImage.assetId || currentImage.id, {
                        rotation: 0,
                        _ts: timestamp // Helper to trigger cache bust in URL generation
                    });
                }
                if (onRotationComplete) onRotationComplete();
            }

        } catch (err) {
            console.error("Rotation failed", err);
            showToast("Rotation failed: " + (err.message || "Unknown error"), "error");
        }
    };

    const handleRotateCcw = async (e) => {
        e?.stopPropagation();
        if (!currentImage?.isLocal) {
            showToast("Can only rotate local synched images.", "error");
            return;
        }

        try {
            // New Endpoint for Physical Rotation
            const res = await api.post(`/integrations/monday/items/${currentImage.itemId}/assets/${currentImage.assetId || currentImage.id}/rotate`, { angle: -90 });

            if (res.data.status === 'success') {
                const timestamp = Date.now();
                if (onAssetUpdate) {
                    onAssetUpdate(currentImage.itemId, currentImage.assetId || currentImage.id, {
                        rotation: 0,
                        _ts: timestamp
                    });
                }
                if (onRotationComplete) onRotationComplete();
            }

        } catch (err) {
            console.error("Rotation failed", err);
            showToast("Rotation failed: " + (err.message || "Unknown error"), "error");
        }
    };



    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'ArrowUp') handleRotateCw();
            if (e.key === 'ArrowDown') handleRotateCcw();
            // Zoom keys
            if (e.key === '+' || e.key === '=') handleZoomIn();
            if (e.key === '-') handleZoomOut();
            if (e.key === '0') setZoom(1);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [images.length, showDetails, zoom, currentIndex]);

    const handleForceDownload = async (url, filename) => {
        try {
            // Fix CORS: Use Proxy Endpoint for local assets
            let fetchUrl = url;
            const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

            // If URL points to /assets/, route it through /api/v1/tools/files/
            if (url.includes('/assets/monday_files/')) {
                // Extract relative path after /assets/
                const parts = url.split('/assets/');
                if (parts.length > 1) {
                    const relativePath = parts[1];
                    // Construct API URL: /api/v1/tools/files/monday_files/...
                    fetchUrl = `${backendUrl}/api/v1/tools/files/${relativePath}`;
                }
            }

            const response = await fetch(fetchUrl);
            if (!response.ok) throw new Error('Download failed');
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = filename || 'download';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(objectUrl);
        } catch (error) {
            console.error("Download error:", error);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black bg-opacity-95 flex flex-row overflow-hidden">
            <style>{`
                @keyframes scanner-pan {
                    0% { transform: translateY(0); }
                    50% { transform: translateY(100%); opacity: 0.8; }
                    100% { transform: translateY(0); }
                }
            `}</style>
            {/* Left Side: Image & Controls */}
            <div className="flex-1 flex flex-col relative min-w-0 bg-black/50">
                {/* Header */}
                <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-[60] text-white bg-gradient-to-b from-black/50 to-transparent">
                    <div className="flex items-center gap-4 min-w-0">
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors shrink-0">
                            <FiX className="w-6 h-6" />
                        </button>
                        <div className="flex flex-col min-w-0">
                            <h3 className="font-medium text-lg leading-tight truncate text-white" title={item.name}>{item.name}</h3>
                            <span className="text-xs text-gray-300 font-mono">
                                Image {currentIndex + 1} of {images.length}
                            </span>
                        </div>
                    </div>

                    {/* Right Actions Group */}
                    <div className="flex items-center gap-3 pr-2">

                        {/* 1. Rotation Group */}
                        <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md rounded-lg p-1 border border-white/5">
                            <button onClick={handleRotateCcw} className="p-2 hover:bg-white/20 rounded-md text-gray-200 hover:text-white transition-colors" title="Rotate Left">
                                <FiRotateCcw className="w-5 h-5" />
                            </button>
                            <div className="w-px h-4 bg-white/10"></div>
                            <button onClick={handleRotateCw} className="p-2 hover:bg-white/20 rounded-md text-gray-200 hover:text-white transition-colors" title="Rotate Right">
                                <FiRotateCw className="w-5 h-5" />
                            </button>
                        </div>

                        {/* 2. Scan Toggle (Replaces Smart Tools) */}
                        <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md rounded-lg p-1 border border-white/5">
                            <button
                                onClick={() => {
                                    if (isScanning) {
                                        console.log("Disabling scan mode");
                                        setIsScanning(false);
                                        setScanResult(null);
                                    } else {
                                        console.log("Enabling scan mode");
                                        setIsScanning(true);
                                        setScanMode('barcode');
                                        setInteractionMode('none');
                                        // Start with no crop - user draws from scratch
                                        setCrop({ x: 0, y: 0, width: 0, height: 0 });
                                        console.log("Scan mode enabled, ready to draw");
                                    }
                                }}
                                className={`h-8 px-3 rounded-md flex items-center gap-2 transition-all ${isScanning ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20' : 'text-gray-200 hover:bg-white/20 hover:text-white'}`}
                                title="Toggle Scan Mode"
                            >
                                <FiCrop className="w-4 h-4" />
                                <span className="hidden sm:inline text-sm font-medium">{isScanning ? 'Done' : 'Scan'}</span>
                            </button>

                            {/* Scanner Settings Button */}
                            {isScanning && (
                                <div className="relative">
                                    <button
                                        onClick={() => setShowScanSettings(!showScanSettings)}
                                        className={`h-8 w-8 rounded-md flex items-center justify-center transition-all ${showScanSettings ? 'bg-teal-600 text-white' : 'text-gray-300 hover:bg-white/20 hover:text-white'}`}
                                        title="Scanner Settings"
                                    >
                                        <FiSettings className="w-4 h-4" />
                                    </button>

                                    {/* Settings Dropdown */}
                                    {showScanSettings && (
                                        <>
                                            <div className="fixed inset-0 z-[60]" onClick={() => setShowScanSettings(false)}></div>
                                            <div className="absolute top-10 right-0 w-64 bg-white rounded-lg shadow-xl z-[70] overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
                                                <div className="p-3 border-b border-gray-200 bg-gray-50">
                                                    <h3 className="text-sm font-semibold text-gray-700">Scanner Settings</h3>
                                                </div>
                                                <div className="p-3">
                                                    <label className="block text-xs font-medium text-gray-600 mb-2">Save Result To Column:</label>
                                                    <div className="flex gap-2">
                                                        <select
                                                            value={selectedSaveColumn || ''}
                                                            onChange={(e) => {
                                                                const val = e.target.value || null;
                                                                setSelectedSaveColumn(val);
                                                                if (val) {
                                                                    const colObj = boardColumns.find(c => c.id === val);
                                                                    toast.success(`Target column: ${colObj?.title || val}`);
                                                                }
                                                            }}
                                                            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-gray-900"
                                                        >
                                                            <option value="" className="text-gray-900">Don't save (copy only)</option>
                                                            {boardColumns.map(column => (
                                                                <option key={column.id} value={column.id} className="text-gray-900">
                                                                    {column.title}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <div className="flex-none bg-teal-50 text-teal-600 border border-teal-200 rounded-md px-2 flex items-center justify-center" title="Column selected">
                                                            <FiCheck className="w-4 h-4" />
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-2">Select a column to automatically save scan results</p>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 3. Download Button (Simplified) */}
                        <div className="relative h-10 flex items-center bg-teal-600 hover:bg-teal-500 rounded-lg text-white shadow-lg shadow-teal-900/20 transition-all border border-teal-500/50 group">
                            <button
                                onClick={() => handleForceDownload(currentImage?.localOriginalUrl || currentImage?.originalUrl, currentImage?.name)}
                                className="px-4 h-full flex items-center gap-2 font-medium border-r border-teal-700/50 hover:bg-teal-400/10 rounded-l-lg"
                                title="Download Original"
                            >
                                <FiDownloadCloud className="w-5 h-5" />
                                <span className="hidden md:inline">Download</span>
                            </button>
                            <button
                                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                                className="px-2 h-full flex items-center justify-center hover:bg-teal-400/10 rounded-r-lg"
                                title="More Options"
                            >
                                <FiChevronDown className={`w-4 h-4 transition-transform ${showDownloadMenu ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Download Menu */}
                            {showDownloadMenu && (
                                <>
                                    <div className="fixed inset-0 z-[60]" onClick={() => setShowDownloadMenu(false)}></div>
                                    <div className="absolute top-12 right-0 w-56 bg-white rounded-lg shadow-xl z-[70] overflow-hidden py-1 border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
                                        <button
                                            onClick={() => { handleForceDownload(currentImage?.localOriginalUrl || currentImage?.originalUrl, currentImage?.name); setShowDownloadMenu(false); }}
                                            className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-gray-700 text-sm"
                                        >
                                            <FiDownload className="w-4 h-4 text-teal-600" />
                                            <div className="flex flex-col">
                                                <span>Original Quality</span>
                                                <span className="text-xs text-gray-400 font-normal">
                                                    {imageSize > 0 ? (imageSize / 1024).toFixed(1) + ' KB' : 'Full Size'}
                                                </span>
                                            </div>
                                        </button>

                                        {currentImage?.localOptimizedUrl && (
                                            <button
                                                onClick={() => { handleForceDownload(currentImage.localOptimizedUrl, `optimized_${currentImage?.name}`); setShowDownloadMenu(false); }}
                                                className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-gray-700 text-sm border-t border-gray-100"
                                            >
                                                <FiZap className="w-4 h-4 text-indigo-600" />
                                                <div className="flex flex-col">
                                                    <span>Optimized (Web)</span>
                                                    <span className="text-xs text-gray-400 font-normal">
                                                        Faster download
                                                    </span>
                                                </div>
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* 4. Hide Details Toggle */}
                        <button
                            onClick={() => setShowDetails(!showDetails)}
                            className={`h-10 px-3 rounded-lg flex items-center gap-2 border transition-all ${showDetails ? 'bg-white text-gray-900 border-white font-medium' : 'bg-white/10 border-white/10 text-gray-300 hover:bg-white/20 hover:text-white'}`}
                            title="Toggle Information Panel"
                        >
                            <FiSidebar className="w-5 h-5" />
                            <span className="hidden lg:inline text-sm">{showDetails ? 'Hide' : 'Info'}</span>
                        </button>

                        {/* 5. Show Original Toggle */}
                        <button
                            onClick={() => setViewOriginal(!viewOriginal)}
                            className={`h-10 px-3 rounded-lg flex items-center gap-2 border transition-all ${viewOriginal ? 'bg-indigo-600 text-white border-indigo-500 font-medium shadow-indigo-500/20 shadow-lg' : 'bg-white/10 border-white/10 text-gray-300 hover:bg-white/20 hover:text-white'}`}
                            title={viewOriginal ? "Showing Original Image" : "Switch to Original Quality"}
                        >
                            <FiImage className="w-5 h-5" />
                            <span className="hidden lg:inline text-sm">{viewOriginal ? 'Original' : 'Optimized'}</span>
                        </button>
                    </div>
                </div>

                {/* Image Metadata Overlay */}
                {
                    currentImage && (
                        <div className="absolute top-20 left-4 bg-black/60 text-white px-3 py-1.5 rounded-full text-xs backdrop-blur-sm z-30 flex items-center gap-3 border border-white/10">
                            <span className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${currentImage.isLocal ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-orange-500'}`}></span>
                                {currentImage.isLocal ? 'Local Cache' : 'Remote Source'}
                            </span>
                            <span className="w-px h-3 bg-white/20"></span>
                            <span>
                                {imageSize > 0 ? (
                                    `${(imageSize / 1024).toFixed(1)} KB`
                                ) : 'Size Unknown'}
                            </span>

                            <span className="w-px h-3 bg-white/20"></span>
                            <span>{Math.round(zoom * 100)}%</span>
                        </div>
                    )
                }

                {/* SCANNER ACTION BAR (When Scanning) */}
                {/* SCANNER ACTION BAR (Enterprise Style) */}
                {/* SCANNER ACTION BAR (Premium Vertical Palette Style) */}
                {isScanning && (
                    <div className="absolute top-24 left-6 flex flex-col gap-2 z-50 animate-in slide-in-from-left-4 duration-500 ease-out">
                        {/* Main Tools Palette - Glassmorphic */}
                        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 p-2 flex flex-col gap-3 transition-all hover:scale-[1.02]">
                            {/* Mode Selectors */}
                            <button
                                onClick={() => { setScanMode('barcode'); setScanResult(null); }}
                                className={`group relative p-3 rounded-xl flex flex-col items-center gap-1 transition-all duration-300 ${scanMode === 'barcode' ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
                            >
                                <FiTarget className="w-5 h-5" />
                                {/* Tooltip */}
                                <span className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-[10px] rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl translate-x-2 group-hover:translate-x-0 duration-200">
                                    Barcode Mode
                                </span>
                            </button>

                            <button
                                onClick={() => { setScanMode('ocr'); setScanResult(null); }}
                                className={`group relative p-3 rounded-xl flex flex-col items-center gap-1 transition-all duration-300 ${scanMode === 'ocr' ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
                            >
                                <FiType className="w-5 h-5" />
                                {/* Tooltip */}
                                <span className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-[10px] rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl translate-x-2 group-hover:translate-x-0 duration-200">
                                    OCR Mode
                                </span>
                            </button>

                            {/* Scan Action */}
                            {!scanResult && (
                                <>
                                    <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent my-1" />

                                    {/* Tool Toggles */}
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => setScanTool('select')}
                                            className={`group relative p-3 rounded-xl flex flex-col items-center gap-1 transition-all duration-300 ${scanTool === 'select' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 shadow-inner' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                        >
                                            <FiCrop className="w-5 h-5" />
                                            <span className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-[10px] rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl translate-x-2 group-hover:translate-x-0 duration-200">
                                                Select Area
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => setScanTool('pan')}
                                            className={`group relative p-3 rounded-xl flex flex-col items-center gap-1 transition-all duration-300 ${scanTool === 'pan' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 shadow-inner' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                        >
                                            <FiMove className="w-5 h-5" />
                                            <span className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-[10px] rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl translate-x-2 group-hover:translate-x-0 duration-200">
                                                Pan Image
                                            </span>
                                        </button>
                                    </div>

                                    <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent my-1" />

                                    <button
                                        onClick={handleRunScan}
                                        className="group relative p-3 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 text-white shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 hover:scale-105 active:scale-95 transition-all duration-300 flex flex-col items-center gap-1"
                                    >
                                        <FiZap className="w-5 h-5 group-hover:animate-pulse" />
                                        {/* Tooltip */}
                                        <span className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-[10px] rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl translate-x-2 group-hover:translate-x-0 duration-200">
                                            Run Scan
                                        </span>
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Result Panel (Expands to Right with Glassmorphism) */}
                        {scanResult && (
                            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 p-4 w-80 animate-in slide-in-from-left-8 fade-in zoom-in-95 duration-300 absolute left-full top-0 ml-4 ring-1 ring-black/5">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Result</span>
                                        <button onClick={() => setScanResult(null)} className="text-gray-400 hover:text-red-500 transition-colors p-1 hover:bg-red-50 rounded-full">
                                            <FiX className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {scanMode === 'barcode' ? (
                                        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-mono text-slate-700 dark:text-slate-300 break-all shadow-inner">
                                            {scanResult}
                                        </div>
                                    ) : (
                                        <textarea
                                            className="w-full h-32 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-800 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-inner"
                                            value={scanResult}
                                            onChange={(e) => setScanResult(e.target.value)}
                                        />
                                    )}

                                    {selectedSaveColumn && (
                                        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium border border-blue-100 dark:border-blue-800/50">
                                            <FiDatabase className="w-3.5 h-3.5 flex-none" />
                                            <span className="truncate flex-1">
                                                Saving to: <span className="font-bold">{boardColumns.find(c => c.id === selectedSaveColumn)?.title || 'Target'}</span>
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex gap-2 pt-1">
                                        <button
                                            onClick={() => handleSaveToColumn(scanResult)}
                                            className="flex-1 py-2.5 px-4 inline-flex justify-center items-center gap-2 rounded-xl border border-transparent font-bold bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm transition-all duration-200"
                                        >
                                            <FiCheck className="w-4 h-4" /> Save
                                        </button>
                                        <button
                                            onClick={() => handleCopyResult(scanResult)}
                                            className="py-2.5 px-4 inline-flex justify-center items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 font-medium bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-200 text-sm transition-all"
                                            title="Copy"
                                        >
                                            <FiCopy className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Main Image */}
                <div
                    className="flex-1 flex items-center justify-center p-4 relative overflow-hidden group cursor-default"
                    onWheel={handleWheel}
                    onContextMenu={(e) => e.preventDefault()} // Disable context menu for right-click panning
                >
                    {/* Item Change Notification Overlay */}
                    {switchNotification && (
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none animate-in fade-in zoom-in duration-300">
                            <div className="bg-black/40 backdrop-blur-xl text-white px-8 py-4 rounded-3xl shadow-2xl border border-white/10 flex flex-col items-center">
                                <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-1 font-semibold">Switched To</span>
                                <span className="text-2xl font-medium tracking-tight max-w-md truncate text-center px-2">{switchNotification}</span>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={handlePrev}
                        className="absolute left-4 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-sm z-20 opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0"
                    >
                        <FiChevronRight className="transform rotate-180 w-8 h-8" />
                    </button>

                    {/* Vertical Zoom Slider */}
                    <div className="absolute right-24 top-1/2 transform -translate-y-1/2 z-30 flex flex-col items-center gap-2 transition-opacity duration-300">
                        <div className="bg-black/40 backdrop-blur-md p-2 rounded-full border border-white/10 flex flex-col items-center gap-3 shadow-xl">
                            <button onClick={handleZoomIn} className="p-2 hover:bg-white/20 rounded-full text-white transition-colors" title="Zoom In">
                                <FiZoomIn className="w-4 h-4" />
                            </button>

                            <div className="h-32 w-6 relative flex items-center justify-center">
                                <input
                                    type="range"
                                    min="1"
                                    max="5"
                                    step="0.1"
                                    value={zoom}
                                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                                    className="absolute w-32 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer -rotate-90 origin-center accent-teal-500 hover:accent-teal-400"
                                    style={{
                                        WebkitAppearance: 'none',
                                    }}
                                />
                            </div>

                            <button onClick={handleZoomOut} className="p-2 hover:bg-white/20 rounded-full text-white transition-colors" title="Zoom Out">
                                <FiZoomOut className="w-4 h-4" />
                            </button>

                            <button
                                onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                                className="text-[10px] text-gray-400 hover:text-white font-mono font-bold"
                                title="Reset Zoom"
                            >
                                {Math.round(zoom * 100)}%
                            </button>
                            <div className="w-full h-px bg-white/20 my-1"></div>
                        </div>
                    </div>

                    <div className="w-full h-full flex items-center justify-center relative">
                        {/* Hidden div for library requirement - Must be in layout tree for some internal canvas ops */}
                        <div id="barcode-scanner-hidden-element" className="fixed top-0 left-0 opacity-0 pointer-events-none w-1 h-1 overflow-hidden"></div>

                        {/* Render ONLY current image */}
                        {currentImage ? (
                            <div
                                className={`relative w-full h-full flex items-center justify-center transition-transform duration-200 ease-out origin-center
                                    ${isScanning
                                        ? (scanTool === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair')
                                        : (zoom > 1 ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : '')
                                    }`}
                                style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${currentImage.rotation || 0}deg)` }}
                                onMouseDown={(e) => {
                                    if (isScanning) handleScanMouseDown(e, 'drawing');
                                    else handlePanMouseDown(e);
                                }}
                                onMouseMove={(e) => {
                                    if (isPanning) handlePanMouseMove(e); // Prioritize panning
                                    else if (isScanning) handleScanMouseMove(e);
                                }}
                                onMouseUp={() => {
                                    if (isPanning) handlePanMouseUp();
                                    if (isScanning) handleScanMouseUp();
                                }}
                                onMouseLeave={() => {
                                    if (isPanning) handlePanMouseUp();
                                    if (isScanning) handleScanMouseUp();
                                }}
                                onTouchStart={(e) => {
                                    // Basic touch support for scanning
                                    if (isScanning) handleScanMouseDown(e, 'drawing');
                                }}
                                onTouchMove={(e) => {
                                    if (isScanning) handleScanMouseMove(e);
                                }}
                                onTouchEnd={() => {
                                    if (isScanning) handleScanMouseUp();
                                }}
                            >
                                <CachedImage
                                    key={`${currentIndex}-${refreshKey}-${viewOriginal}`}
                                    file={currentImage}
                                    proxyUrl={
                                        viewOriginal
                                            ? (currentImage.localOriginalUrl || currentImage.originalUrl)
                                            : (currentImage.proxyUrl ? `${currentImage.proxyUrl}${currentImage.proxyUrl.includes('?') ? '&' : '?'}t=${refreshKey}` : null)
                                    }
                                    originalUrl={currentImage.originalUrl}
                                    usePublic={currentImage.usePublic}
                                    className="block max-w-full max-h-full object-contain drop-shadow-2xl pointer-events-none select-none"
                                    shouldLoad={true}
                                    isLocal={currentImage.isLocal}
                                    imgRef={imageRef}
                                    crossOrigin="anonymous"
                                    optimizeImages={!viewOriginal && optimizeImages}
                                    onLoad={() => setImageLoaded(true)}
                                />

                                {/* CROP OVERLAY - Positioned to match image exactly, accounting for zoom */}
                                {(() => {
                                    console.log("Overlay render check:", { isScanning, imageLoaded, crop, interactionMode, zoom, pan });

                                    // Calculate overlay position to match image
                                    let overlayStyle = { zIndex: 100, border: '2px solid red' };

                                    if (imageRef.current && isScanning) {
                                        // Since overlay and image are siblings in the same transformed container,
                                        // we can position the overlay to match the image's natural rendered size
                                        // The image uses object-contain, so we need to match its actual rendered dimensions
                                        const img = imageRef.current;

                                        // Get the image's natural aspect ratio
                                        const naturalAspect = img.naturalWidth / img.naturalHeight;
                                        const containerAspect = img.parentElement.offsetWidth / img.parentElement.offsetHeight;

                                        let imgWidth, imgHeight, imgLeft, imgTop;

                                        // Calculate actual rendered size with object-contain
                                        if (naturalAspect > containerAspect) {
                                            // Image is wider - fits to width
                                            imgWidth = img.parentElement.offsetWidth;
                                            imgHeight = imgWidth / naturalAspect;
                                            imgLeft = 0;
                                            imgTop = (img.parentElement.offsetHeight - imgHeight) / 2;
                                        } else {
                                            // Image is taller - fits to height
                                            imgHeight = img.parentElement.offsetHeight;
                                            imgWidth = imgHeight * naturalAspect;
                                            imgTop = 0;
                                            imgLeft = (img.parentElement.offsetWidth - imgWidth) / 2;
                                        }

                                        overlayStyle = {
                                            ...overlayStyle,
                                            position: 'absolute',
                                            left: `${imgLeft}px`,
                                            top: `${imgTop}px`,
                                            width: `${imgWidth}px`,
                                            height: `${imgHeight}px`,
                                            pointerEvents: 'auto'
                                        };

                                        console.log("Overlay positioning:", {
                                            overlayStyle,
                                            naturalAspect,
                                            containerAspect,
                                            imgWidth,
                                            imgHeight,
                                            zoom,
                                            pan
                                        });
                                    }

                                    return isScanning && (
                                        <div
                                            ref={overlayRef}
                                            style={overlayStyle}
                                            onMouseDown={(e) => {
                                                if (interactionMode === 'none') {
                                                    handleScanMouseDown(e, 'drawing');
                                                }
                                            }}
                                            onMouseMove={handleScanMouseMove}
                                            onMouseUp={handleScanMouseUp}
                                            onMouseLeave={handleScanMouseUp}
                                            onTouchStart={(e) => {
                                                if (interactionMode === 'none') {
                                                    handleScanMouseDown(e, 'drawing');
                                                }
                                            }}
                                            onTouchMove={handleScanMouseMove}
                                            onTouchEnd={handleScanMouseUp}
                                        >
                                            {console.log("Rendering scan overlay!")}
                                            {/* Guide Lines (Crosshairs) - Show only when drawing or interacting */}
                                            {(interactionMode === 'drawing' || interactionMode === 'moving' || interactionMode === 'resizing') && (
                                                <div className="absolute inset-0 pointer-events-none">
                                                    {/* Horizontal center line */}
                                                    <div className="absolute left-0 right-0 h-px bg-teal-400/40" style={{ top: '50%' }} />
                                                    {/* Vertical center line */}
                                                    <div className="absolute top-0 bottom-0 w-px bg-teal-400/40" style={{ left: '50%' }} />
                                                    {/* Third lines */}
                                                    <div className="absolute left-0 right-0 h-px bg-teal-400/25" style={{ top: '33.33%' }} />
                                                    <div className="absolute left-0 right-0 h-px bg-teal-400/25" style={{ top: '66.66%' }} />
                                                    <div className="absolute top-0 bottom-0 w-px bg-teal-400/25" style={{ left: '33.33%' }} />
                                                    <div className="absolute top-0 bottom-0 w-px bg-teal-400/25" style={{ left: '66.66%' }} />
                                                </div>
                                            )}

                                            {/* Crop Box - Show if width/height > 0 */}
                                            {crop.width > 0 && crop.height > 0 && (
                                                <div
                                                    className={`absolute border-2 pointer-events-auto cursor-move flex items-center justify-center group touch-none transition-shadow ${interactionMode !== 'none' ? 'border-teal-400 shadow-[0_0_15px_rgba(45,212,191,0.4)]' : 'border-teal-500/70 shadow-sm'}`}
                                                    style={{
                                                        left: `${crop.x}%`,
                                                        top: `${crop.y}%`,
                                                        width: `${crop.width}%`,
                                                        height: `${crop.height}%`,
                                                        backgroundColor: 'rgba(45, 212, 191, 0.05)',
                                                        boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                                                    }}
                                                    onMouseDown={(e) => handleScanMouseDown(e, 'moving')}
                                                    onTouchStart={(e) => handleScanMouseDown(e, 'moving')}
                                                >
                                                    {/* Corner Handles - invisible but interactable (scaled inversely to zoom) */}
                                                    <div className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full cursor-nw-resize z-10 opacity-0" style={{ transform: `scale(${1 / zoom})` }} onMouseDown={(e) => handleScanMouseDown(e, 'resizing', 'nw')} />
                                                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full cursor-ne-resize z-10 opacity-0" style={{ transform: `scale(${1 / zoom})` }} onMouseDown={(e) => handleScanMouseDown(e, 'resizing', 'ne')} />
                                                    <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 rounded-full cursor-sw-resize z-10 opacity-0" style={{ transform: `scale(${1 / zoom})` }} onMouseDown={(e) => handleScanMouseDown(e, 'resizing', 'sw')} />
                                                    <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 rounded-full cursor-se-resize z-10 opacity-0" style={{ transform: `scale(${1 / zoom})` }} onMouseDown={(e) => handleScanMouseDown(e, 'resizing', 'se')} />

                                                    {/* Scan Indicator (Subtle) */}
                                                    {interactionMode === 'none' && !scanResult && (
                                                        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                                                            <div className="w-full h-px bg-teal-400 shadow-[0_0_8px_#2dd4bf] animate-[scanner-pan_3s_infinite_linear]"></div>
                                                        </div>
                                                    )}

                                                    {/* Move Icon (top-right, with indicator) */}
                                                    <div className="absolute -top-7 -right-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity flex items-center gap-1">
                                                        <span className="text-xs text-white bg-black/60 px-2 py-0.5 rounded whitespace-nowrap">Drag to Move</span>
                                                        <div className="bg-teal-500 rounded p-1 shadow-lg">
                                                            <FiMove className="w-3 h-3 text-white" />
                                                        </div>
                                                    </div>

                                                    {/* Dimensions Label */}
                                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-teal-500 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none">
                                                        {Math.round(crop.width)}% × {Math.round(crop.height)}%
                                                    </div>
                                                </div>
                                            )}

                                            {/* Instruction Text (when no crop box drawn) */}
                                            {(!crop.width || !crop.height || crop.width === 0 || crop.height === 0) && (
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/70 text-white px-6 py-4 rounded-lg text-center pointer-events-none">
                                                    <FiCrop className="w-8 h-8 mx-auto mb-2 text-teal-400" />
                                                    <p className="font-medium">Click and drag to select scan area</p>
                                                    <p className="text-sm text-gray-300 mt-1">Draw a rectangle around the barcode or text</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        ) : (
                            <div className="text-gray-500 flex flex-col items-center">
                                <FiImage className="w-16 h-16 mb-4 opacity-50" />
                                <p>No Image Available</p>
                            </div>
                        )}
                    </div >

                    <button
                        onClick={handleNext}
                        className="absolute right-4 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-sm z-20 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0"
                    >
                        <FiChevronRight className="w-8 h-8" />
                    </button>



                </div>



                {/* Item Name Transition Toast REMOVED */}



                {/* Thumbnails moved before Right Panel */}
                <div className="h-24 bg-black/80 flex items-center gap-2 overflow-x-auto p-2 px-4 justify-center border-t border-white/10 shrink-0 z-40">
                    {images.map((img, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                setCurrentIndex(idx);
                            }}
                            className={`relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${idx === currentIndex ? 'border-teal-500 scale-105 shadow-lg' : 'border-transparent opacity-50 hover:opacity-100'}`}
                        >
                            <CachedImage
                                file={img}
                                proxyUrl={img.proxyUrl}
                                originalUrl={img.originalUrl}
                                usePublic={img.usePublic}
                                className="w-full h-full object-cover"
                                compact={true}
                                shouldLoad={showImages}
                                isLocal={img.isLocal}
                            />
                        </button>
                    ))}
                </div>
            </div > {/* End of Left Column */}

            {/* Right Side: Inline Details Panel */}
            {
                showDetails && (
                    <div className="w-[400px] bg-white relative z-50 shrink-0 flex flex-col animate-slideInRight shadow-2xl">
                        <ItemDetailsDrawer
                            item={item}
                            onClose={() => setShowDetails(false)}
                            showImages={showImages}
                            optimizeImages={optimizeImages}
                            columnsMap={columnsMap}
                            inline={true}
                            onItemUpdate={onItemUpdate}
                            editableColumns={editableColumns}
                            refreshKey={refreshKey}
                        />
                    </div>
                )
            }
        </div >
    );
};

// Component: Tag Input for Filters
const TagInput = ({ value, onChange, placeholder }) => {
    // Parse value string into tags array
    const tags = value ? value.split(',').map(t => t.trim()).filter(Boolean) : [];
    const [input, setInput] = useState('');

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const newTag = input.trim();
            if (newTag) {
                // Check for duplicates if needed, or allow them. Currently allowing.
                // Reconstruct string: current tags + new tag
                const newTags = [...tags, newTag];
                onChange(newTags.join(', '));
                setInput('');
            }
        } else if (e.key === 'Backspace' && !input && tags.length > 0) {
            // Remove last tag on backspace if input is empty
            const newTags = tags.slice(0, -1);
            onChange(newTags.join(', '));
        }
    };

    const removeTag = (index) => {
        const newTags = tags.filter((_, i) => i !== index);
        onChange(newTags.join(', '));
    };

    return (
        <div className="flex-1 flex flex-wrap items-center gap-2 px-3 py-2 border border-gray-300 rounded-md bg-white focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500 min-h-[38px]">
            <FiSearch className="text-gray-400 mr-1" />
            {tags.map((tag, i) => (
                <span key={i} className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2 py-0.5 rounded flex items-center">
                    {tag}
                    <button
                        onClick={() => removeTag(i)}
                        className="ml-1 text-indigo-600 hover:text-indigo-900 focus:outline-none"
                    >
                        <FiX className="w-3 h-3" />
                    </button>
                </span>
            ))}
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                    if (input.trim()) {
                        const newTags = [...tags, input.trim()];
                        onChange(newTags.join(', '));
                        setInput('');
                    }
                }}
                placeholder={tags.length === 0 ? placeholder : ''}
                className="flex-1 outline-none text-sm min-w-[80px] bg-transparent"
            />
        </div>
    );
};

// Component: Clear Cache Modal
const ClearCacheModal = ({ onClose, onConfirm, boardName }) => {
    const [options, setOptions] = useState({
        clear_db: true,
        clear_assets: false,
        clear_optimized: true,
        clear_originals: false
    });
    const [isClearing, setIsClearing] = useState(false);

    const handleConfirm = async () => {
        setIsClearing(true);
        await onConfirm(options);
        setIsClearing(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
                    <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                <FiTrash2 className="h-6 w-6 text-red-600" />
                            </div>
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                    Clear Cache for "{boardName}"
                                </h3>
                                <div className="mt-2">
                                    <p className="text-sm text-gray-500 mb-4">
                                        Select which cached data you want to remove. Using "Sync" later will re-fetch data.
                                    </p>

                                    <div className="space-y-3">
                                        <div className="flex items-start">
                                            <div className="flex items-center h-5">
                                                <input
                                                    id="clear_db"
                                                    type="checkbox"
                                                    checked={options.clear_db}
                                                    onChange={(e) => setOptions({ ...options, clear_db: e.target.checked })}
                                                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                                                />
                                            </div>
                                            <div className="ml-3 text-sm">
                                                <label htmlFor="clear_db" className="font-medium text-gray-700">Local Database</label>
                                                <p className="text-gray-500">Removes all items. Use this to fix missing items or sync errors.</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start">
                                            <div className="flex items-center h-5">
                                                <input
                                                    id="clear_assets"
                                                    type="checkbox"
                                                    checked={options.clear_assets}
                                                    onChange={(e) => setOptions({ ...options, clear_assets: e.target.checked })}
                                                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                                                />
                                            </div>
                                            <div className="ml-3 text-sm">
                                                <label htmlFor="clear_assets" className="font-medium text-gray-700">Downloaded Assets</label>
                                                <p className="text-gray-500">Removes all original images and files downloaded from Monday.</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start">
                                            <div className="flex items-center h-5">
                                                <input
                                                    id="clear_originals"
                                                    type="checkbox"
                                                    checked={options.clear_originals}
                                                    onChange={(e) => setOptions({ ...options, clear_originals: e.target.checked })}
                                                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                                                />
                                            </div>
                                            <div className="ml-3 text-sm">
                                                <label htmlFor="clear_originals" className="font-medium text-gray-700">Original Images Only</label>
                                                <p className="text-gray-500">Deleted high-res originals. Keeps optimized thumbnails.</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start">
                                            <div className="flex items-center h-5">
                                                <input
                                                    id="clear_optimized"
                                                    type="checkbox"
                                                    checked={options.clear_optimized}
                                                    onChange={(e) => setOptions({ ...options, clear_optimized: e.target.checked })}
                                                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                                                />
                                            </div>
                                            <div className="ml-3 text-sm">
                                                <label htmlFor="clear_optimized" className="font-medium text-gray-700">Optimized Images</label>
                                                <p className="text-gray-500">Removes generated WebP thumbnails (clean up space).</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            type="button"
                            disabled={isClearing || (!options.clear_db && !options.clear_assets && !options.clear_optimized && !options.clear_originals)}
                            onClick={handleConfirm}
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                        >
                            {isClearing ? 'Clearing...' : 'Clear Selected'}
                        </button>
                        <button
                            type="button"
                            disabled={isClearing}
                            onClick={onClose}
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Component: Card Item with Carousel
const CardItem = ({ item, onClick, onImageClick, showImages, optimizeImages, editableColumns = [], onUpdate = null, columnsMap = null, isEditMode = false, modifiedItems = null, cardColumns = [], cardActions = [], refreshKey }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const images = getItemImages(item, optimizeImages);
    const hasMultiple = images.length > 1;

    const handleNext = (e) => {
        e.stopPropagation();
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const handlePrev = (e) => {
        e.stopPropagation();
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    const currentImage = images[currentImageIndex];

    // Lazy Load Optimization
    const cardRef = useRef(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect(); // Load once and keep
                }
            },
            { rootMargin: '100px' } // Preload 100px before
        );

        if (cardRef.current) {
            observer.observe(cardRef.current);
        }

        return () => observer.disconnect();
    }, []);

    // Placeholder until visible
    if (!isVisible) {
        return (
            <div
                ref={cardRef}
                className={`group bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[300px] animate-pulse`}
            >
                <div className="h-48 bg-gray-100 rounded-t-xl" />
                <div className="p-4 flex-1 space-y-3">
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
            </div>
        );
    }

    return (
        <div
            ref={cardRef} // Keep ref for resize/other observers if needed, though mostly for hole placeholder logic replacement
            onClick={() => onClick(item)}
            className={`group bg-white rounded-xl border transition-all cursor-pointer overflow-hidden flex flex-col ${isEditMode ? 'border-indigo-300 shadow-md ring-1 ring-indigo-50' : 'border-gray-200 shadow-sm hover:shadow-md'}`}
        >
            <div
                className="aspect-w-16 aspect-h-10 bg-gray-100 relative overflow-hidden h-48"
                onClick={(e) => {
                    e.stopPropagation();
                    if (onImageClick) onImageClick(item, currentImageIndex);
                }}
            >
                {images.length > 0 ? (
                    images.map((img, idx) => (
                        <div
                            key={idx}
                            className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${idx === currentImageIndex ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
                        >
                            <CachedImage
                                key={`${item.id}-${idx}-${refreshKey}`}
                                file={img}
                                proxyUrl={img.proxyUrl ? `${img.proxyUrl}${img.proxyUrl.includes('?') ? '&' : '?'}t=${refreshKey}` : null}
                                originalUrl={img.originalUrl}
                                usePublic={img.usePublic}
                                isLocal={img.isLocal}
                                className="w-full h-full object-cover"
                                shouldLoad={showImages}
                            />
                        </div>
                    ))
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <FiImage className="text-4xl text-gray-400" />
                    </div>
                )}

                {/* Carousel Controls */}
                {hasMultiple && (
                    <>
                        <button
                            onClick={handlePrev}
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20"
                        >
                            <FiChevronRight className="transform rotate-180 w-4 h-4" />
                        </button>
                        <button
                            onClick={handleNext}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20"
                        >
                            <FiChevronRight className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                            {images.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`w-1.5 h-1.5 rounded-full ${idx === currentImageIndex ? 'bg-white' : 'bg-white/50'}`}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
            <div className="p-4 flex-1 flex flex-col">
                {/* Header: Name */}
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
                                className={`font-semibold text-gray-900 mb-2 w-full bg-gray-50 border focus:bg-white focus:ring-2 focus:ring-indigo-500 rounded px-2 h-8 transition-all ${isModified ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
                                placeholder="Item Name"
                            />
                        );
                    }
                    return (
                        <h3 className={`font-semibold text-gray-900 mb-2 line-clamp-2 ${isModified ? 'text-indigo-700 bg-indigo-50 px-1 rounded' : ''}`} title={item.name}>{displayVal}</h3>
                    );
                })()}

                {/* Body Columns */}
                <div className="space-y-2 mb-4">
                    {(() => {
                        let columnsToShow = [];
                        if (cardColumns && cardColumns.length > 0) {
                            columnsToShow = cardColumns.map(colId => item.column_values.find(c => c.id === colId)).filter(Boolean);
                        } else {
                            columnsToShow = item.column_values.slice(0, 3);
                        }
                        return columnsToShow.map(col => renderField(col));
                    })()}
                </div>

                {/* Action Footer - Only show if column is editable AND User is in Edit Mode */}
                {(() => {
                    const effectiveActions = (cardActions || []).filter(colId => editableColumns.includes(colId));

                    // Hide footer if no valid actions OR not in Edit Mode (User Request: "untle the edit is enebled")
                    if (effectiveActions.length === 0 || !isEditMode) return null;

                    return (
                        <div className="mt-auto py-3 px-4 bg-indigo-50/50 border-t border-indigo-100 grid grid-cols-1 gap-2 rounded-b-xl -mx-4 -mb-4">
                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Quick Actions</p>
                            {effectiveActions.map(colId => {
                                const col = item.column_values.find(c => c.id === colId);
                                if (!col) return null;
                                return renderField(col, true);
                            })}
                        </div>
                    );
                })()}
            </div>
        </div>
    );

    function renderField(col, isAction = false) {
        if (!col.text && !isAction) return null; // Actions might be empty but we want to show the input
        const isEditable = editableColumns.includes(col.id);
        const colDef = columnsMap ? columnsMap[col.id] : null;

        // Check pending modification
        const pendingVal = modifiedItems?.[item.id]?.[col.id];
        const displayVal = pendingVal !== undefined ? pendingVal : col.text;
        const isModified = pendingVal !== undefined;

        // Helper for contrast
        const getTextColor = (hexcolor) => {
            if (!hexcolor) return 'black';
            hexcolor = hexcolor.replace('#', '');
            if (hexcolor.length === 3) hexcolor = hexcolor.split('').map(c => c + c).join('');
            const r = parseInt(hexcolor.substr(0, 2), 16);
            const g = parseInt(hexcolor.substr(2, 2), 16);
            const b = parseInt(hexcolor.substr(4, 2), 16);
            const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
            return (yiq >= 128) ? 'black' : 'white';
        };

        return (
            <div key={col.id} className={`flex items-center justify-between text-sm py-1 ${isAction ? 'w-full' : ''}`}>
                {!isAction && <span className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold">{colDef?.title || col.title || col.id.replace(/_/g, ' ')}</span>}
                {isAction && <span className="text-indigo-600 uppercase tracking-wider text-[10px] font-bold w-1/3 truncate" title={colDef?.title || col.title || col.id}>{colDef?.title || col.title || col.id.replace(/_/g, ' ')}</span>}

                {isEditable && onUpdate ? ( // Always check isEditable permission first
                    (isEditMode || isAction) ? (
                        ((colDef?.type === 'color' || colDef?.type === 'dropdown' || colDef?.type === 'status') && colDef.settings_str) ? (
                            // Dropdown
                            (() => {
                                try {
                                    const settings = JSON.parse(colDef.settings_str);
                                    const options = settings.labels ? Object.entries(settings.labels).map(([idx, label]) => ({
                                        value: idx,
                                        label: label,
                                        color: settings.labels_colors ? settings.labels_colors[idx] : null
                                    })) : [];

                                    if (options.length === 0) throw new Error("No options");

                                    return (
                                        <div onClick={(e) => e.stopPropagation()} className={`${isAction ? 'flex-1' : 'w-[60%]'} relative`}>
                                            <select
                                                value={displayVal || ''}
                                                onChange={(e) => {
                                                    e.stopPropagation(); // Stop propagation on change
                                                    onUpdate(item.id, col.id, e.target.value);
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Critical: Stop click from triggering card click
                                                }}
                                                onMouseDown={(e) => e.stopPropagation()} // Extra safety
                                                className={`font-medium text-xs border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 px-2 w-full text-right outline-none h-8 rounded-md transition-shadow cursor-pointer shadow-sm ${isModified ? 'bg-indigo-50 border-indigo-400 text-indigo-700' : 'bg-white border-gray-300 hover:border-indigo-300'}`}
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
                                        </div>
                                    );
                                } catch (e) { return null; }
                            })() || (
                                <input
                                    type="text"
                                    value={displayVal || ''}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => onUpdate(item.id, col.id, e.target.value)}
                                    className={`font-medium text-gray-900 border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 px-2 text-right outline-none h-8 text-xs rounded-md shadow-sm transition-all ${isModified ? 'border-indigo-400 bg-indigo-50' : 'bg-white border-gray-300 hover:border-indigo-300'} ${isAction ? 'flex-1' : 'w-[60%]'}`}
                                />
                            )
                        ) : (
                            <input
                                type="text"
                                value={displayVal || ''}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => onUpdate(item.id, col.id, e.target.value)}
                                placeholder="Value"
                                className={`font-medium text-gray-900 border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 px-2 text-right outline-none h-8 text-xs rounded-md shadow-sm transition-all ${isModified ? 'border-indigo-400 bg-indigo-50' : 'bg-white border-gray-300 hover:border-indigo-300'} ${isAction ? 'flex-1' : 'w-[60%]'}`}
                            />
                        )
                    ) : (
                        // Read Only (Mode=Edit but not Active) - Render Badges for Status
                        ((colDef?.type === 'color' || colDef?.type === 'dropdown' || colDef?.type === 'status') && colDef.settings_str) ? (
                            (() => {
                                try {
                                    const settings = JSON.parse(colDef.settings_str);
                                    const color = Object.entries(settings.labels).find(([_, l]) => l === displayVal)?.[0]
                                        ? settings.labels_colors[Object.entries(settings.labels).find(([_, l]) => l === displayVal)[0]]
                                        : '#6b7280';
                                    return (
                                        <span
                                            className={`font-semibold truncate max-w-[60%] text-xs px-2.5 py-1 rounded-md shadow-sm ${isModified ? 'ring-2 ring-indigo-400' : ''}`}
                                            style={{ backgroundColor: color, color: getTextColor(color) }}
                                        >
                                            {displayVal}
                                        </span>
                                    );
                                } catch {
                                    return <span className={`font-medium truncate max-w-[60%] text-sm ${isModified ? 'bg-indigo-50 text-indigo-700 px-1 rounded' : 'text-gray-900'}`}>{displayVal}</span>;
                                }
                            })()
                        ) : (
                            <span className={`font-medium truncate max-w-[60%] text-sm ${isModified ? 'bg-indigo-50 text-indigo-700 px-1 rounded' : 'text-gray-900'}`}>{displayVal}</span>
                        )
                    )
                ) : (
                    // Not Editable - Render Badges for Status
                    ((colDef?.type === 'color' || colDef?.type === 'dropdown' || colDef?.type === 'status') && colDef.settings_str) ? (
                        (() => {
                            try {
                                const settings = JSON.parse(colDef.settings_str);
                                const color = Object.entries(settings.labels).find(([_, l]) => l === displayVal)?.[0]
                                    ? settings.labels_colors[Object.entries(settings.labels).find(([_, l]) => l === displayVal)[0]]
                                    : '#6b7280';
                                return (
                                    <span
                                        className={`font-semibold truncate max-w-[60%] text-xs px-2.5 py-1 rounded-md shadow-sm ${isModified ? 'ring-2 ring-indigo-400' : ''}`}
                                        style={{ backgroundColor: color, color: getTextColor(color) }}
                                    >
                                        {displayVal}
                                    </span>
                                );
                            } catch {
                                return <span className={`font-medium truncate max-w-[60%] text-sm ${isModified ? 'bg-indigo-50 text-indigo-700 px-1 rounded' : 'text-gray-900'}`}>{displayVal}</span>;
                            }
                        })()
                    ) : (
                        <span className={`font-medium truncate max-w-[60%] text-sm ${isModified ? 'bg-indigo-50 text-indigo-700 px-1 rounded' : 'text-gray-900'}`}>{displayVal}</span>
                    )
                )}
            </div>
        );
    };
};

// --- MAIN COMPONENT ---

const MondayAppView = () => {
    const { installedAppId } = useParams();
    const navigate = useNavigate();
    const toast = useToast();

    const [viewMode, setViewMode] = useState(() => localStorage.getItem('monday_viewMode') || 'grid');

    const [loading, setLoading] = useState(true);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('monday_sidebarCollapsed') === 'true');
    // Edit Mode State
    const [isEditMode, setIsEditMode] = useState(false);
    const [modifiedItems, setModifiedItems] = useState({}); // {itemId: {colId: value } }
    const [isSaving, setIsSaving] = useState(false);
    // const [showJobHistory, setShowJobHistory] = useState(false); // Already declared below? No, it was missing.


    // Search & Filter State (Moved to top to prevent ReferenceError)
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState(() => {
        const saved = localStorage.getItem('monday_sortConfig');
        return saved ? JSON.parse(saved) : { key: 'name', direction: 'asc' };
    });
    const [filters, setFilters] = useState(() => {
        const saved = localStorage.getItem('monday_filters');
        return saved ? JSON.parse(saved) : [{ id: 1, column: 'all', condition: 'contains', value: '' }];
    });
    // Alias for compatibility with existing logic
    const activeFilters = filters.filter(f => f.value && f.value.trim() !== '');

    const [showImages, setShowImages] = useState(() => {
        const saved = localStorage.getItem('monday_showImages');
        return saved === null ? true : saved === 'true';
    });

    useEffect(() => {
        localStorage.setItem('monday_showImages', showImages);
    }, [showImages]);
    const [optimizeImages, setOptimizeImages] = useState(() => {
        const saved = localStorage.getItem('monday_optimizeImages');
        return saved === null ? true : saved === 'true'; // Default to true if not set
    });
    // Grid Density State
    const [gridColumns, setGridColumns] = useState(() => {
        const saved = localStorage.getItem('monday_gridColumns');
        return saved ? parseInt(saved, 10) : 4;
    });

    useEffect(() => {
        localStorage.setItem('monday_gridColumns', gridColumns);
    }, [gridColumns]);
    const [forceSyncImages, setForceSyncImages] = useState(false);
    const [keepOriginals, setKeepOriginals] = useState(() => {
        const saved = localStorage.getItem('monday_keepOriginals');
        return saved === null ? true : saved === 'true';
    });
    const [clearOriginals, setClearOriginals] = useState(false);

    const [config, setConfig] = useState({ selected_board_ids: [] });
    const [boards, setBoards] = useState([]);
    const [activeBoardId, setActiveBoardId] = useState(null);
    const [boardItems, setBoardItems] = useState([]);
    const [showJobHistory, setShowJobHistory] = useState(false);


    // Barcode Config State


    const [showSortMenu, setShowSortMenu] = useState(false);
    const [showSyncMenu, setShowSyncMenu] = useState(false);
    const [showBoardSelector, setShowBoardSelector] = useState(false); // Header Board Selector
    const [cursor, setCursor] = useState(null);
    const [itemsLoading, setItemsLoading] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0); // For cache busting
    const [searchParams, setSearchParams] = useSearchParams();

    // Computed selected item from URL
    const selectedItemId = searchParams.get('item');
    const selectedItem = useMemo(() => {
        if (!selectedItemId || !boardItems.length) return null;
        return boardItems.find(i => String(i.id) === String(selectedItemId)) || null;
    }, [selectedItemId, boardItems]);

    // Helper to set selected item which updates URL
    const setSelectedItem = (item, imageIndex = null) => {
        const newParams = new URLSearchParams(searchParams);
        if (item) {
            newParams.set('item', item.id);
            if (imageIndex !== null) {
                newParams.set('image', imageIndex);
            } else {
                newParams.delete('image');
            }
        } else {
            newParams.delete('item');
            newParams.delete('image');
        }
        setSearchParams(newParams);
    };

    const [galleryItem, setGalleryItem] = useState(null); // Item to show in full screen gallery
    const lastSyncedId = useRef(null); // Track last synced item to prevent race conditions

    // Sync Gallery Item with Selected Item (URL source of truth)
    useEffect(() => {
        // Sync Gallery Item with Selected Item (URL source of truth)
        if (selectedItem) {
            // Only sync if the ID has CHANGED from what we last synced, OR if gallery is closed and needs opening (but not if we just closed it)
            // Actually, simplest is: If selectedItem differs from galleryItem, AND differs from lastSyncedId?
            // No, if we close gallery, galleryItem becomes null. selectedItem is still OldItem.
            // We want to skip re-opening if OldItem == lastSyncedId.

            const currentId = String(selectedItem.id);
            const isGalleryOpen = !!galleryItem;
            const isSameAsGallery = isGalleryOpen && String(galleryItem.id) === currentId;
            const isSameAsLastSynced = lastSyncedId.current === currentId;

            // If we already have this item open, do nothing.
            if (isSameAsGallery) {
                lastSyncedId.current = currentId; // verify sync
                return;
            }

            // If gallery is closed, and we have a selectedItem that matches the one we JUST synced (and presumably closed),
            // DON'T re-open it. This handles the Close Race.
            if (!isGalleryOpen && isSameAsLastSynced) {
                return;
            }

            // Otherwise, open/update it
            const imgIdx = searchParams.get('image');
            const initialIndex = imgIdx ? parseInt(imgIdx, 10) : 0;
            setGalleryItem({ ...selectedItem, board_id: activeBoardId, initialIndex });
            lastSyncedId.current = currentId;
        } else {
            // URL cleared (e.g. Back button or explicit clear).
            // We can safely close gallery and reset sync tracker.
            if (galleryItem) setGalleryItem(null);
            lastSyncedId.current = null;
        }
    }, [selectedItem, galleryItem, searchParams, activeBoardId]);

    // Navigation Logic
    const filteredItems = useMemo(() => {
        // If no active filters (or all empty), return all
        let filtered = boardItems;

        // 1. Filtering
        // Include has_image in active filters even if value is empty
        const activeFilters = filters.filter(f => f.condition === 'is_duplicate' || f.condition === 'is_not_empty' || f.condition === 'is_empty' || f.column === 'has_image' || f.value.trim());

        // Pre-calculate duplicates if needed
        let duplicateSets = {}; // Map of columnId -> Set of duplicate values

        const duplicateFilters = activeFilters.filter(f => f.condition === 'is_duplicate');
        if (duplicateFilters.length > 0) {
            duplicateFilters.forEach(filter => {
                const counts = {};
                boardItems.forEach(item => {
                    let text = '';
                    if (filter.column === 'name') {
                        text = item.name;
                    } else if (filter.column !== 'all') {
                        const col = item.column_values.find(c => c.id === filter.column);
                        text = col?.text || '';
                    }

                    if (text) {
                        const key = text.trim().toLowerCase();
                        counts[key] = (counts[key] || 0) + 1;
                    }
                });

                // create set of values that appear > 1
                duplicateSets[filter.column] = new Set(
                    Object.entries(counts)
                        .filter(([k, v]) => v > 1)
                        .map(([k, v]) => k)
                );
            });
        }

        if (activeFilters.length > 0) {
            filtered = boardItems.filter(item => {
                // Check ALL filters (AND logic)
                return activeFilters.every(filter => {
                    if (filter.condition === 'is_duplicate') {
                        // Check if item's value for this column is in the duplicate set
                        let text = '';
                        if (filter.column === 'name') {
                            text = item.name;
                        } else if (filter.column !== 'all') {
                            const col = item.column_values.find(c => c.id === filter.column);
                            text = col?.text || '';
                        }
                        return duplicateSets[filter.column]?.has(text.trim().toLowerCase());
                    }

                    if (filter.column === 'has_image') {
                        const images = getItemImages(item);
                        return images.length > 0;
                    }

                    // Special Case: Is Not Empty
                    if (filter.condition === 'is_not_empty') {
                        const checkNotEmpty = (text) => text && text.trim().length > 0;
                        if (filter.column === 'name') return checkNotEmpty(item.name);
                        if (filter.column !== 'all') {
                            const col = item.column_values.find(c => c.id === filter.column);
                            return checkNotEmpty(col?.text);
                        }
                        return true; // "All" not empty doesn't make sense, pass.
                    }

                    // Special Case: Is Empty
                    if (filter.condition === 'is_empty') {
                        const checkEmpty = (text) => !text || text.trim().length === 0;
                        if (filter.column === 'name') return checkEmpty(item.name);
                        if (filter.column !== 'all') {
                            const col = item.column_values.find(c => c.id === filter.column);
                            return checkEmpty(col?.text);
                        }
                        return false;
                    }

                    const searchTerms = filter.value.toLowerCase().split(',').map(t => t.trim()).filter(Boolean);
                    if (!searchTerms.length) return true;

                    const checkMatch = (text) => {
                        if (!text) return false;
                        const lowerText = text.toLowerCase();

                        if (filter.condition === 'equals') {
                            return lowerText === searchTerms[0]; // Strict equal to first term
                        }
                        if (filter.condition === 'does_not_contain') {
                            return !searchTerms.some(term => lowerText.includes(term));
                        }
                        if (filter.condition === 'does_not_equal') {
                            return lowerText !== searchTerms[0];
                        }
                        // Default: Contains
                        // Match if partial text exists in field (OR logic for terms)
                        return searchTerms.some(term => lowerText.includes(term));
                    };

                    // Search by Name
                    if (filter.column === 'name') {
                        return checkMatch(item.name);
                    }

                    // Search specific column
                    if (filter.column !== 'all') {
                        const col = item.column_values.find(c => c.id === filter.column);
                        return checkMatch(col?.text);
                    }

                    // Search All (Name + Any Column)
                    if (checkMatch(item.name)) return true;
                    return item.column_values.some(c => checkMatch(c.text));
                });
            });

        }

        // 2. Sorting
        // Create a shallow copy to safely sort without mutating state
        const sorted = [...filtered].sort((a, b) => {
            let aVal = '';
            let bVal = '';

            if (sortConfig.key === 'name') {
                aVal = a.name || '';
                bVal = b.name || '';
            } else {
                // Find column value
                const aCol = a.column_values.find(c => c.id === sortConfig.key);
                const bCol = b.column_values.find(c => c.id === sortConfig.key);
                aVal = aCol?.text || '';
                bVal = bCol?.text || '';
            }

            // Numeric check (simple implementation)
            const aNum = parseFloat(aVal);
            const bNum = parseFloat(bVal);
            // Check if string is just a number
            const isNumeric = !isNaN(aNum) && !isNaN(bNum) && String(aVal).trim() !== '' && String(bVal).trim() !== '' && !isNaN(Number(aVal)) && !isNaN(Number(bVal));

            let comparison = 0;
            if (isNumeric) {
                comparison = aNum - bNum;
            } else {
                comparison = String(aVal).toLowerCase().localeCompare(String(bVal).toLowerCase());
            }

            return sortConfig.direction === 'asc' ? comparison : -comparison;
        });

        return sorted;

    }, [boardItems, filters, sortConfig]);

    const handleNextItem = () => {
        if (!selectedItem || !filteredItems.length) return;
        const idx = filteredItems.findIndex(i => String(i.id) === String(selectedItem.id));
        if (idx === -1) return; // Item not in current filtered list?

        const nextIdx = (idx + 1) % filteredItems.length;
        setSelectedItem(filteredItems[nextIdx], null); // Reset image index
    };

    const handlePrevItem = () => {
        if (!selectedItem || !filteredItems.length) return;
        const idx = filteredItems.findIndex(i => String(i.id) === String(selectedItem.id));
        if (idx === -1) return;

        const prevIdx = (idx - 1 + filteredItems.length) % filteredItems.length;
        const prevItem = filteredItems[prevIdx];

        // Smart Prev: Start at the LAST image of the previous item for natural flow
        const prevImages = getItemImages(prevItem, optimizeImages);
        const lastImgIdx = Math.max(0, prevImages.length - 1);

        setSelectedItem(prevItem, lastImgIdx);
    };

    // Bind Arrow Keys for Navigation when Modal is Open
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!selectedItem) return;
            // Prevent interference with input fields
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

            if (e.key === 'ArrowRight') handleNextItem();
            if (e.key === 'ArrowLeft') handlePrevItem();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedItem, filteredItems]); // Re-bind when item/list changes

    const galleryItemRef = useRef(galleryItem); // Ref to access state inside event listener
    const [showExitDialog, setShowExitDialog] = useState(false);
    const [showClearCache, setShowClearCache] = useState(false);
    // const [showJobHistory, setShowJobHistory] = useState(false); // Already declared above
    // Enterprise Sync Hook
    const enterpriseSync = useMondaySync(activeBoardId);

    // Use Global Debug Context
    const { isDebugEnabled, toggleDebug } = useDebug();
    const { setHeader } = useLayout();
    const isDebugMode = isDebugEnabled; // Alias

    const [showFilter, setShowFilter] = useState(false);
    // State definitions moved to top

    // Sync Menu State

    // Persistence Effects
    useEffect(() => {
        localStorage.setItem('monday_sortConfig', JSON.stringify(sortConfig));
    }, [sortConfig]);

    useEffect(() => {
        localStorage.setItem('monday_filters', JSON.stringify(filters));
    }, [filters]);

    useEffect(() => {
        localStorage.setItem('monday_sidebarCollapsed', isSidebarCollapsed);
    }, [isSidebarCollapsed]);

    // ... (rest of state items are fine where they are)

    // Update Header Title
    useEffect(() => {
        if (loading) {
            setHeader('Loading Boards...');
        } else if (activeBoardId) {
            const board = boards.find(b => b.id === activeBoardId);
            setHeader(board ? board.name : 'Monday.com Integration');
        } else {
            setHeader('Monday.com Integration');
        }
    }, [loading, activeBoardId, boards, setHeader]);

    // Clear Cache Handler
    const handleClearCache = async (options) => {
        if (!activeBoardId) return;
        try {
            const result = await marketplaceService.monday.clearCache(activeBoardId, options);

            let msg = [];
            if (result.db_items_removed > 0) msg.push(`${result.db_items_removed} items removed`);
            if (result.storage_freed_mb > 0) msg.push(`${result.storage_freed_mb.toFixed(2)} MB freed`);

            toast.success('Cache Cleared', msg.join(', ') || 'Selected cache cleared');

            // Refresh view
            fetchItems();
        } catch (error) {
            console.error(error);
            toast.error('Error', 'Failed to clear cache');
        }
    };



    {
        enterpriseSync.isSyncing && (
            <div className="flex flex-col items-end px-2">
                <span className="text-xs text-indigo-600 font-bold whitespace-nowrap">
                    {enterpriseSync.syncState.message}
                </span>
                <span className="text-[10px] text-gray-500 font-mono">
                    {Math.floor(enterpriseSync.syncDuration / 60).toString().padStart(2, '0')}:{(enterpriseSync.syncDuration % 60).toString().padStart(2, '0')}
                </span>
            </div>
        )
    }


    // Derived State: Available Columns and Filtered Items
    const availableColumns = useMemo(() => {
        if (!boardItems.length) return [];
        // Extract columns from the first item
        const cols = boardItems[0].column_values.map(c => c.id);
        return ['name', ...cols]; // Add 'name' as a filterable option
    }, [boardItems]);

    // Active Board Columns Map
    const columnsMap = useMemo(() => {
        const board = boards.find(b => b.id === activeBoardId);
        if (!board || !board.columns) return {};
        return board.columns.reduce((acc, col) => {
            acc[col.id] = col;
            return acc;
        }, {});
    }, [boards, activeBoardId]);

    const editableColumns = useMemo(() => {
        if (!activeBoardId || !config.column_permissions) return [];
        // Ensure ID matching is robust (String vs Number)
        const boardIdStr = String(activeBoardId);
        return config.column_permissions[boardIdStr] || config.column_permissions[activeBoardId] || [];
    }, [activeBoardId, config.column_permissions]);

    const handleUpdateColumn = async (itemId, columnId, newValue) => {
        if (!isEditMode) return;

        // Queue change locally in modifiedItems
        setModifiedItems(prev => ({
            ...prev,
            [itemId]: {
                ...(prev[itemId] || {}),
                [columnId]: newValue
            }
        }));
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        const updates = Object.entries(modifiedItems);

        let successCount = 0;
        let failCount = 0;

        // Optimistically update boardItems for UI (permanent apply) before clearing modified
        // Actually, better to wait for success.

        try {
            await Promise.all(updates.map(async ([itemId, changes]) => {
                try {
                    // Process changes for this item
                    // We need to convert changes object to API payload format per column type
                    const apiPayload = {};

                    Object.entries(changes).forEach(([colId, val]) => {
                        const colDef = columnsMap[colId];
                        if (colDef) {
                            if (colDef.type === 'color' || colDef.type === 'status') {
                                apiPayload[colId] = { label: val };
                            } else if (colDef.type === 'dropdown') {
                                apiPayload[colId] = { labels: [val] };
                            } else {
                                apiPayload[colId] = val;
                            }
                        } else {
                            apiPayload[colId] = val; // Fallback
                        }
                    });

                    await marketplaceService.monday.updateItemValue(itemId, activeBoardId, apiPayload);

                    // Update local boardItems
                    setBoardItems(prev => prev.map(item => {
                        if (String(item.id) === String(itemId)) {
                            let newItem = { ...item };
                            const newCols = [...item.column_values];

                            Object.entries(changes).forEach(([cId, v]) => {
                                if (cId === 'name') {
                                    newItem.name = v;
                                } else {
                                    const idx = newCols.findIndex(c => c.id === cId);
                                    if (idx >= 0) {
                                        newCols[idx] = { ...newCols[idx], text: v, value: v };
                                    } else {
                                        newCols.push({ id: cId, text: v, value: v, type: 'text' });
                                    }
                                }
                            });
                            newItem.column_values = newCols;
                            return newItem;
                        }
                        return item;
                    }));

                    successCount++;
                } catch (e) {
                    console.error(`Failed to update item ${itemId}`, e);
                    failCount++;
                }
            }));

            if (failCount === 0) {
                toast.success('Saved', `Successfully updated ${successCount} items`);
                setModifiedItems({});
                setIsEditMode(false);
            } else {
                toast.warning('Partial Save', `Updated ${successCount} items, failed ${failCount}`);
                // Keep partial changes? For now clear to avoid complex state sync issues or filter out success ones.
                // Simpler: Keep edit mode on failure.
            }

        } catch (error) {
            console.error("Batch save error", error);
            toast.error("Error", "Failed to save changes");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSingleItemUpdate = async (itemId, changes) => {
        try {
            // Helper to format payload based on column type
            const formatPayload = (cId, val) => {
                const colDef = columnsMap[cId];
                if (colDef) {
                    if (colDef.type === 'color' || colDef.type === 'status') return { label: val };
                    if (colDef.type === 'dropdown') return { labels: [val] };
                }
                return val;
            };

            const apiPayload = {};
            // List of read-only or unsupported column types for simple text updates
            const READ_ONLY_TYPES = ['subtasks', 'formula', 'lookup', 'creation_log', 'last_updated', 'auto_number', 'item_id', 'pulse_log', 'progress'];

            Object.entries(changes).forEach(([colId, val]) => {
                const colDef = columnsMap ? columnsMap[colId] : null;
                const type = colDef ? colDef.type : 'text';

                // Skip read-only types OR types that cannot be updated with simple text/JSON logic here
                if (['file', 'people', 'board-relation', 'dependency', 'doc', 'integration', 'button'].includes(type)) return;

                // Skip read-only types
                if (READ_ONLY_TYPES.includes(type)) return;

                apiPayload[colId] = formatPayload(colId, val);
            });

            await marketplaceService.monday.updateItemValue(itemId, activeBoardId, apiPayload);

            // Reusable Item Updater Helper
            const getUpdatedItem = (item) => {
                let newItem = { ...item };
                const newCols = item.column_values ? [...item.column_values] : [];

                Object.entries(changes).forEach(([cId, v]) => {
                    if (cId === 'name') {
                        newItem.name = v;
                    } else {
                        const idx = newCols.findIndex(c => c.id === cId);
                        if (idx >= 0) {
                            newCols[idx] = { ...newCols[idx], text: v, value: v };
                        } else {
                            newCols.push({ id: cId, text: v, value: v, type: 'text' });
                        }
                    }
                });
                newItem.column_values = newCols;
                return newItem;
            };

            // Update All States
            setBoardItems(prev => prev.map(item => String(item.id) === String(itemId) ? getUpdatedItem(item) : item));
            setGalleryItem(prev => (prev && String(prev.id) === String(itemId)) ? getUpdatedItem(prev) : prev);

            // Better Success Message
            const changedColIds = Object.keys(changes);
            if (changedColIds.length === 1 && changedColIds[0] !== 'name') {
                const colTitle = columnsMap?.[changedColIds[0]]?.title || changedColIds[0];
                toast.success(`Saved to "${colTitle}"`);
            } else {
                toast.success("Item Updated");
            }
            return true;

        } catch (e) {
            console.error(e);
            return false;
        }
    };

    const handleAssetUpdate = (itemId, assetId, assetData) => {
        const getUpdatedItem = (item) => {
            if (!item.assets) return item;

            let newAssets = Array.isArray(item.assets) ? [...item.assets] : { ...item.assets };

            if (Array.isArray(newAssets)) {
                const idx = newAssets.findIndex(a => String(a.id) === String(assetId));
                if (idx >= 0) {
                    newAssets[idx] = { ...newAssets[idx], ...assetData };
                }
            } else {
                if (newAssets[assetId]) {
                    newAssets[assetId] = { ...newAssets[assetId], ...assetData };
                }
            }

            return { ...item, assets: newAssets };
        };

        setBoardItems(prev => prev.map(item => String(item.id) === String(itemId) ? getUpdatedItem(item) : item));
        setGalleryItem(prev => (prev && String(prev.id) === String(itemId)) ? getUpdatedItem(prev) : prev);
    };


    const handleCancelEdit = () => {
        setModifiedItems({});
        setIsEditMode(false);
    };



    // FilteredItems definition moved to top (lines 2664+)

    // Debug: Log filtering results if significant mismatch
    useEffect(() => {
        if (boardItems.length > 0 && filteredItems.length < boardItems.length) {
            if (isDebugEnabled) {
                // Push to sync logs only if changed? No, infinite loop risk.
                // Just relying on the UI "Showing X of Y" is mostly fine, but let's check console.
                console.log(`Debug: Filtered ${filteredItems.length} of ${boardItems.length}`);
            }
        }
    }, [filteredItems.length, boardItems.length, isDebugEnabled, sortConfig]);

    // Sorting Helper
    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Filter Handlers
    const addFilter = () => {
        setFilters([...filters, { id: Date.now(), column: 'all', condition: 'contains', value: '' }]);
    };

    const removeFilter = (id) => {
        if (filters.length === 1) {
            setFilters([{ id: Date.now(), column: 'all', condition: 'contains', value: '' }]); // Reset last one
        } else {
            setFilters(filters.filter(f => f.id !== id));
        }
    };

    const updateFilter = (id, field, value) => {
        setFilters(filters.map(f => f.id === id ? { ...f, [field]: value } : f));
    };

    // sync ref
    useEffect(() => {
        galleryItemRef.current = galleryItem;
    }, [galleryItem]);

    // Navigation Protection: Prevent accidental exit
    // Uses a "history trap" to catch the back button
    useEffect(() => {
        // Push a dummy state to create a buffer
        window.history.pushState(null, document.title, window.location.href);

        const handlePopState = (event) => {
            // Restore buffer IMMEDIATELY so we stay on the page visually and logically
            window.history.pushState(null, document.title, window.location.href);

            // Check if gallery is open
            if (galleryItemRef.current) {
                setGalleryItem(null); // Close gallery
                return; // Stop exit dialog
            }

            // Check if item drawer is open (optional extension, user only asked for gallery but this is good UX)
            // But staying strictly to request:

            // Show custom modal
            setShowExitDialog(true);
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    // Persistence Effect
    useEffect(() => {
        localStorage.setItem('monday_viewMode', viewMode);
        localStorage.setItem('monday_showImages', showImages);
        localStorage.setItem('monday_optimizeImages', optimizeImages);
        if (activeBoardId) localStorage.setItem('monday_activeBoardId', activeBoardId);
    }, [viewMode, showImages, optimizeImages, activeBoardId]);



    useEffect(() => {
        // Init logic
        const init = async () => {
            try {
                // 1. Get Settings
                const apps = await marketplaceService.getInstalledApps();
                const currentApp = apps.find(a => a.id === parseInt(installedAppId));

                if (!currentApp) {
                    toast.error('Error', 'App not found');
                    navigate('/apps');
                    return;
                }

                if (!currentApp.settings || !currentApp.settings.api_key) {
                    toast.error('Configuration Required', 'Please configure the app first');
                    navigate(`/apps/configure/${installedAppId}`);
                    return;
                }

                setConfig(currentApp.settings);

                // 2. Fetch Boards
                const allBoards = await marketplaceService.monday.getBoards(100);

                // Filter to only user-selected boards
                const selectedIds = currentApp.settings.selected_board_ids || [];
                const visibleBoards = allBoards.filter(b => selectedIds.includes(b.id));

                setBoards(visibleBoards);

                // Auto-select first board or restore selection
                if (visibleBoards.length > 0) {
                    const savedId = localStorage.getItem('monday_activeBoardId');
                    // Ensure robust comparison (String vs Number)
                    const restoreBoard = savedId ? visibleBoards.find(b => String(b.id) === String(savedId)) : null;
                    if (restoreBoard) {
                        setActiveBoardId(restoreBoard.id);
                    } else {
                        setActiveBoardId(visibleBoards[0].id);
                    }
                }

            } catch (error) {
                console.error(error);
                if (error.response && error.response.status === 401) {
                    toast.error('Authentication Failed', 'Please configure your API Key.');
                    navigate(`/apps/configure/${installedAppId}`);
                    return;
                }
                const errMsg = error.response?.data?.detail || error.message || "Failed to load application data";
                toast.error('Error', errMsg);
            } finally {
                setLoading(false);
            }
        };

        if (installedAppId) {
            init();
        }
    }, [installedAppId, navigate]);

    // Sync Handler
    // Sync Handler
    const handleSync = async (overrides = {}) => {
        if (!activeBoardId || enterpriseSync.isSyncing) return;

        // Use the enterprise sync hook
        const result = await enterpriseSync.startSync({
            showImages,
            optimizeImages,
            forceSyncImages,
            keepOriginals,
            filters: showFilter ? filters : [],
            itemIds: (showFilter && filters.length > 0) ? filteredItems.map(i => i.id) : null,
            ...overrides
        });

        if (result) {
            // Re-fetch local data after success
            fetchItems();

            // Refresh boards to update Last Synced timestamp
            try {
                const allBoards = await marketplaceService.monday.getBoards(100);
                const selectedIds = config.selected_board_ids || [];
                const visibleBoards = allBoards.filter(b => selectedIds.includes(b.id));
                setBoards(visibleBoards);
            } catch (e) {
                console.error("Board refresh error:", e);
            }
        }
    };

    // Fetch items when active board changes
    const fetchItems = async () => {
        if (!activeBoardId) return;

        setItemsLoading(true);
        // setBoardItems([]); // Optimization: Keep old items while loading to prevent flash
        setCursor(null);

        try {
            // Fetch from Local DB (via backend API)
            // Backend now handles the "Fetch All" recursion internally during SYNC
            // and returns all items from DB during GET.
            const data = await marketplaceService.monday.getBoardItems(activeBoardId, null, 10000); // High limit for local DB

            // Debug Log
            console.log("DEBUG: fetchItems Raw Response", data);

            const items = Array.isArray(data.items) ? data.items : [];
            console.log(`DEBUG: Setting board items: ${items.length}`);

            setBoardItems(items);
            setCursor(null); // Local DB doesn't use cursor pagnation for now

        } catch (error) {
            console.error("Fetch Error:", error);
            if (error.response && error.response.status === 401) {
                toast.error('Authentication Failed', 'Your API Key may be invalid or expired. Please re-configure.');
                navigate(`/apps/configure/${installedAppId}`);
                return;
            }
            toast.error('Error', 'Failed to fetch board items');
        } finally {
            setItemsLoading(false);
        }
    };

    useEffect(() => {
        console.log("DEBUG: fetchItems effect triggered. activeBoardId:", activeBoardId);
        fetchItems();
    }, [activeBoardId]);

    const handleLoadMore = async () => {
        if (!activeBoardId || !cursor) return;

        setItemsLoading(true);
        try {
            const data = await marketplaceService.monday.getBoardItems(activeBoardId, cursor);
            const newItems = Array.isArray(data.items) ? data.items : [];
            setBoardItems(prev => [...prev, ...newItems]);
            setCursor(data.cursor);
        } catch (error) {
            if (error.response && error.response.status === 401) {
                toast.error('Authentication Failed', 'Please configure your API Key.');
                navigate(`/apps/configure/${installedAppId}`);
                return;
            }
            toast.error('Error', 'Failed to load more items');
        } finally {
            setItemsLoading(false);
        }
    };

    // Component: Card Item with Carousel

    // Component: Card Item with Carousel
    // Component: Card Item with Carousel





    // Non-blocking loading to prevent glitch
    // if (loading) {... } removed to show skeletal UI immediately

    // Non-blocking loading to prevent glitch
    if (loading) {
        return (
            <div className="flex bg-gray-50 h-screen items-center justify-center">
                <div className="flex flex-col items-center">
                    <FiLoader className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
                    <p className="text-gray-500 font-medium">Loading Monday.com Data...</p>
                </div>
            </div>
        );
    }

    if (boards.length === 0) {
        return (
            <div className="flex flex-col h-screen items-center justify-center p-8 text-center bg-gray-50">
                <FiAlertCircle className="w-12 h-12 text-yellow-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No Boards Configured</h3>
                <p className="text-gray-500 mt-2 max-w-md">
                    You haven't selected any Monday.com boards to display yet.
                    Please go to the configuration page to select visible boards.
                </p>
                <button
                    onClick={() => navigate(`/apps/configure/${installedAppId}`)}
                    className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Go to Configuration
                </button>
            </div>
        );
    }

    return (
        <div className="flex bg-gray-50 h-screen overflow-hidden">
            {/* Sidebar */}
            <aside
                className={`fixed top-0 start-0 bottom-0 z-[60] bg-white border-r border-gray-200 pt-7 pb-10 overflow-y-auto transition-all duration-300 transform ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}
            >
                <div className={`px-6 flex items-center justify-between mb-8 ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}>
                    {!isSidebarCollapsed && (
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 truncate">
                            <img src="https://monday.com/favicon.ico" alt="Monday" className="w-6 h-6 flex-shrink-0" />
                            Monday
                        </h2>
                    )}

                    {/* Toggle Button */}
                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className={`hidden lg:flex items-center justify-center p-1.5 rounded-md text-gray-500 hover:bg-gray-100 ${isSidebarCollapsed ? 'absolute top-6 start-1/2 -translate-x-1/2 mt-12' : ''}`}
                        title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isSidebarCollapsed ? <FiChevronRight size={18} /> : <FiChevronLeft size={18} />}
                    </button>

                    {/* Mobile Logo for Collapsed State */}
                    {isSidebarCollapsed && (
                        <div className="font-bold text-xl text-indigo-600">
                            M
                        </div>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {loading ? (
                        <div className="flex justify-center p-4"><FiLoader className="animate-spin text-gray-400" /></div>
                    ) : boards.map(board => (
                        <button
                            key={board.id}
                            onClick={() => { setActiveBoardId(board.id); setCursor(null); }}
                            className={`w-full text-left flex items-center gap-x-3.5 py-2 px-2.5 text-sm rounded-lg hover:bg-gray-100 transition-colors ${activeBoardId === board.id
                                ? 'bg-gray-100 text-indigo-600 font-medium'
                                : 'text-gray-700'
                                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                            title={isSidebarCollapsed ? board.name : ''}
                        >
                            <span className={`flex-shrink-0 ${isSidebarCollapsed ? '' : 'text-lg'}`}>
                                {isSidebarCollapsed ? (
                                    <span className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded text-gray-500 font-bold uppercase hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                                        {board.name.charAt(0)}
                                    </span>
                                ) : (
                                    <FiList className={activeBoardId === board.id ? 'text-indigo-600' : 'text-gray-400'} />
                                )}
                            </span>
                            {!isSidebarCollapsed && <span className="truncate flex-1">{board.name}</span>}
                        </button>
                    ))}
                </div>
            </aside>

            {/* Main Content */}
            <div className={`flex-1 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'} flex flex-col h-full overflow-hidden transition-all duration-300`}>
                {/* Fixed Header Section */}
                <div className="p-8 pb-0 flex-shrink-0 z-30 relative">
                    {/* Header */}
                    <div className="mb-6 flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div>

                            {/* Board Selector (Dropdown or Title) */}
                            <div className="relative z-50">
                                {boards.length > 0 ? (
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowBoardSelector(!showBoardSelector)}
                                            className="flex items-center gap-2 group text-2xl font-bold text-gray-900 hover:text-indigo-600 transition-colors rounded-lg -ml-2 px-2 py-1 hover:bg-gray-50"
                                        >
                                            <span className="truncate max-w-md">
                                                {boards.find(b => b.id === activeBoardId)?.name || 'Select a Board'}
                                            </span>
                                            <FiChevronDown className={`w-6 h-6 text-gray-400 group-hover:text-indigo-500 transition-transform ${showBoardSelector ? 'rotate-180' : ''}`} />
                                        </button>

                                        {showBoardSelector && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setShowBoardSelector(false)}></div>
                                                <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-50 animate-fadeIn overflow-hidden flex flex-col">
                                                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Switch Board</span>
                                                    </div>
                                                    <div className="max-h-80 overflow-y-auto p-1 text-sm">
                                                        {boards.map(b => (
                                                            <button
                                                                key={b.id}
                                                                onClick={() => {
                                                                    setActiveBoardId(b.id);
                                                                    setShowBoardSelector(false);
                                                                    setCursor(null);
                                                                }}
                                                                className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${activeBoardId === b.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'}`}
                                                            >
                                                                <span className="font-medium truncate">{b.name}</span>
                                                                {activeBoardId === b.id && <FiCheck className="text-indigo-600 w-4 h-4" />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <div className="p-2 border-t border-gray-100 bg-gray-50">
                                                        <button
                                                            onClick={() => navigate(`/apps/configure/${installedAppId}`)}
                                                            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                                                        >
                                                            <FiSettings className="w-3 h-3" /> Configure Boards
                                                        </button>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <h1 className="text-2xl font-bold text-gray-400 italic">No Boards Configured</h1>
                                        <button
                                            onClick={() => navigate(`/apps/configure/${installedAppId}`)}
                                            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 underline"
                                        >
                                            Connect a Board
                                        </button>
                                    </div>
                                )}
                            </div>
                            {(() => {
                                const board = boards.find(b => b.id === activeBoardId);
                                if (!board || !board.last_synced_at) return null;

                                const sizeMB = (board.last_sync_size_bytes || 0) / (1024 * 1024);
                                const optimizedMB = (board.last_sync_optimized_size_bytes || 0) / (1024 * 1024);
                                const itemCount = board.last_sync_item_count || 0;

                                return (
                                    <div className="flex flex-col mt-1 gap-0.5">
                                        <p className="text-xs text-gray-500 font-medium flex items-center gap-2">
                                            <span className="flex items-center gap-1"><FiRefreshCw className="w-3 h-3" /> {new Date(board.last_synced_at).toLocaleString()}</span>
                                            <span className="text-gray-300">|</span>
                                            <span className="font-semibold text-gray-700">{itemCount} items synced</span>
                                        </p>
                                        {(sizeMB > 0 || optimizedMB > 0) && (
                                            <p className="text-[10px] text-gray-400 font-mono pl-0.5">
                                                Storage: <span className="font-medium text-gray-600">{sizeMB.toFixed(2)} MB</span>
                                                {optimizedMB > 0 && sizeMB > optimizedMB && (
                                                    <span className="text-emerald-600 ml-1 font-semibold">
                                                        (Optimized to {optimizedMB.toFixed(2)} MB)
                                                    </span>
                                                )}
                                            </p>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* View Toggles */}
                        <div className="flex items-center gap-3">
                            <div className="flex bg-gray-100 p-1 rounded-lg items-center gap-1">


                                {/* Edit Toggle */}
                                {activeBoardId && (
                                    <button
                                        onClick={() => setIsEditMode(!isEditMode)}
                                        className={`p-2 rounded-md transition-all ${isEditMode ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                                        title={isEditMode ? "Exit Edit Mode" : "Enter Edit Mode"}
                                    >
                                        <FiEdit2 />
                                    </button>
                                )}

                                {/* Debug Toggle */}
                                <button
                                    onClick={toggleDebug}
                                    className={`p-2 rounded-md transition-all ${isDebugMode ? 'bg-white shadow text-red-600' : 'text-gray-500 hover:text-gray-700'}`}
                                    title={isDebugMode ? "Disable Debug Mode" : "Enable Debug Mode"}
                                >
                                    <FiCpu />
                                </button>



                                {/* Sort Dropdown */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowSortMenu(!showSortMenu)}
                                        className={`p-2 rounded-md transition-all ${showSortMenu ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                                        title="Sort Items"
                                    >
                                        {sortConfig.direction === 'asc' ? <FiArrowUp /> : <FiArrowDown />}
                                    </button>

                                    {showSortMenu && (
                                        <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 p-2 z-50 animate-fadeIn">
                                            <div className="text-xs font-semibold text-gray-400 px-2 py-1 uppercase tracking-wider">Sort By</div>
                                            <button
                                                onClick={() => { setSortConfig({ ...sortConfig, key: 'name' }); setShowSortMenu(false); }}
                                                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex justify-between items-center ${sortConfig.key === 'name' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                                            >
                                                Name
                                                {sortConfig.key === 'name' && <span className="text-xs bg-indigo-200 text-indigo-800 px-1.5 rounded">Active</span>}
                                            </button>

                                            <div className="my-1 border-t border-gray-100"></div>

                                            <div className="max-h-48 overflow-y-auto">
                                                {(boardItems[0]?.column_values || []).map(c => (
                                                    <button
                                                        key={c.id}
                                                        onClick={() => { setSortConfig({ ...sortConfig, key: c.id }); setShowSortMenu(false); }}
                                                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex justify-between items-center ${sortConfig.key === c.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                                                    >
                                                        <span className="truncate">{columnsMap?.[c.id]?.title || c.id}</span>
                                                        {sortConfig.key === c.id && <span className="text-xs bg-indigo-200 text-indigo-800 px-1.5 rounded">Active</span>}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="my-1 border-t border-gray-100"></div>

                                            <div className="text-xs font-semibold text-gray-400 px-2 py-1 uppercase tracking-wider">Order</div>
                                            <div className="flex gap-1 p-1 bg-gray-50 rounded-lg">
                                                <button
                                                    onClick={() => setSortConfig(prev => ({ ...prev, direction: 'asc' }))}
                                                    className={`flex-1 flex justify-center items-center py-1.5 rounded-md text-sm transition-all ${sortConfig.direction === 'asc' ? 'bg-white shadow text-indigo-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                                                >
                                                    Asc
                                                </button>
                                                <button
                                                    onClick={() => setSortConfig(prev => ({ ...prev, direction: 'desc' }))}
                                                    className={`flex-1 flex justify-center items-center py-1.5 rounded-md text-sm transition-all ${sortConfig.direction === 'desc' ? 'bg-white shadow text-indigo-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                                                >
                                                    Desc
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => setShowFilter(!showFilter)}
                                    className={`p-2 rounded-md transition-all ${showFilter ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                                    title="Toggle Filter"
                                >
                                    <FiFilter />
                                </button>

                                {/* Job History / Queue Button */}
                                <button
                                    onClick={() => setShowJobHistory(true)}
                                    className={`p-2 rounded-md transition-all ${showJobHistory ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                                    title="View Sync History & Queue"
                                >
                                    <FiClock />
                                </button>




                                {/* Grid Density Control (Only in Grid View) */}
                                {viewMode === 'grid' && (
                                    <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-white border border-gray-200 rounded-md shadow-sm h-9 mr-3 transition-all animate-fadeIn">
                                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Cols</span>
                                        <input
                                            type="range"
                                            min="2"
                                            max="6"
                                            step="1"
                                            value={gridColumns}
                                            onChange={(e) => setGridColumns(parseInt(e.target.value, 10))}
                                            className="w-20 h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-500 transition-all"
                                        />
                                        <div className="w-4 text-center">
                                            <span className="text-xs font-bold text-indigo-600">{gridColumns}</span>
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                                    title="Grid View"
                                >
                                    <FiGrid />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                                    title="List View"
                                >
                                    <FiList />
                                </button>
                            </div>

                            {/* Sync Options Popover / Dropdown */}
                            {/* Sync Dropdown (Split Button) */}
                            {/* Sync Dropdown (Split Button) */}
                            <div className="relative mr-2 flex rounded-lg shadow-sm h-10 items-stretch">
                                <button
                                    onClick={handleSync}
                                    disabled={enterpriseSync.isSyncing}
                                    className={`relative inline-flex items-center px-4 rounded-l-lg border border-r-0 border-indigo-600 bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    {enterpriseSync.isSyncing ? <FiLoader className="animate-spin -ml-1 mr-2 h-4 w-4" /> : <FiRefreshCw className="-ml-1 mr-2 h-4 w-4" />}
                                    {enterpriseSync.isSyncing ? 'Syncing...' : 'Sync Now'}
                                </button>
                                <div className="relative block h-full">
                                    <button
                                        onClick={() => setShowSyncMenu(!showSyncMenu)}
                                        disabled={enterpriseSync.isSyncing}
                                        className="relative inline-flex items-center justify-center px-2 rounded-r-lg border border-l border-indigo-700 bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 h-full"
                                        aria-label="Sync Options"
                                    >
                                        <FiChevronDown className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                    {showSyncMenu && (
                                        <>
                                            <div className="fixed inset-0 z-30" onClick={() => setShowSyncMenu(false)}></div>
                                            <div className="origin-top-right absolute right-0 mt-2 w-72 rounded-xl shadow-xl bg-white ring-1 ring-black ring-opacity-5 z-40 animate-in fade-in zoom-in-95 duration-200 divide-y divide-gray-100 overflow-hidden">
                                                <div className="px-4 py-3 bg-gray-50/80 backdrop-blur-sm">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sync Settings</p>
                                                </div>
                                                <div className="py-2 px-1" role="none">
                                                    {/* Download Images Toggle */}
                                                    <div className="flex items-center justify-between group cursor-pointer px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors mx-1" onClick={() => setShowImages(!showImages)}>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">Download Images</span>
                                                            <span className="text-[10px] text-gray-400">Sync board assets</span>
                                                        </div>
                                                        <button
                                                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${showImages ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                                            role="switch"
                                                            aria-checked={showImages}
                                                        >
                                                            <span aria-hidden="true" className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${showImages ? 'translate-x-5' : 'translate-x-0'}`} />
                                                        </button>
                                                    </div>

                                                    {/* Optimize Images Toggle */}
                                                    <div className="flex items-center justify-between group cursor-pointer px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors mx-1" onClick={() => setOptimizeImages(!optimizeImages)}>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">Optimize</span>
                                                            <span className="text-[10px] text-gray-400">Compress for mobile</span>
                                                        </div>
                                                        <button
                                                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${optimizeImages ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                                            role="switch"
                                                            aria-checked={optimizeImages}
                                                        >
                                                            <span aria-hidden="true" className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${optimizeImages ? 'translate-x-5' : 'translate-x-0'}`} />
                                                        </button>
                                                    </div>

                                                    {/* Keep Originals Toggle */}
                                                    <div className="flex items-center justify-between group cursor-pointer px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors mx-1" onClick={() => setKeepOriginals(!keepOriginals)}>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">Keep Originals</span>
                                                            <span className="text-[10px] text-gray-400">Save full resolution</span>
                                                        </div>
                                                        <button
                                                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${keepOriginals ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                                            role="switch"
                                                            aria-checked={keepOriginals}
                                                        >
                                                            <span aria-hidden="true" className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${keepOriginals ? 'translate-x-5' : 'translate-x-0'}`} />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div>
                                                    <div className="px-4 py-2 bg-gray-50/50">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Actions</p>
                                                    </div>

                                                    <div className="py-1" role="menu" aria-orientation="vertical">
                                                        <button
                                                            onClick={() => {
                                                                setForceSyncImages(true);
                                                                handleSync({ forceSyncImages: true });
                                                                setShowSyncMenu(false);
                                                            }}
                                                            className="group w-full text-left block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                                            role="menuitem"
                                                        >
                                                            <div className="flex items-center">
                                                                <FiDownloadCloud className="mr-3 h-5 w-5 text-gray-400 group-hover:text-indigo-500" />
                                                                <div>
                                                                    <span className="font-semibold block">Force Sync Images</span>
                                                                    <span className="text-xs text-gray-500 font-normal">Re-download all assets</span>
                                                                </div>
                                                            </div>
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setForceSyncImages(true);
                                                                setOptimizeImages(true);
                                                                handleSync({ forceSyncImages: false, optimizeImages: true }); // Use offline files
                                                                setShowSyncMenu(false);
                                                            }}
                                                            className="group w-full text-left block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                                            role="menuitem"
                                                        >
                                                            <div className="flex items-center">
                                                                <FiZap className="mr-3 h-5 w-5 text-yellow-400 group-hover:text-yellow-500" />
                                                                <div>
                                                                    <span className="font-semibold block">Batch Optimize Images</span>
                                                                    <span className="text-xs text-gray-500 font-normal">Generate WebP for all items</span>
                                                                </div>
                                                            </div>
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setShowClearCache(true);
                                                                setShowSyncMenu(false);
                                                            }}
                                                            className="group w-full text-left block px-4 py-3 text-sm text-red-700 hover:bg-red-50"
                                                            role="menuitem"
                                                        >
                                                            <div className="flex items-center">
                                                                <FiTrash2 className="mr-3 h-5 w-5 text-red-400 group-hover:text-red-500" />
                                                                <div>
                                                                    <span className="font-semibold block">Clear Local Cache</span>
                                                                    <span className="text-xs text-red-400 font-normal">Free up storage space</span>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Settings Button (New) */}


                            <button
                                onClick={() => navigate('/apps')}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-red-700 hover:bg-red-50 transition-colors"
                            >
                                <FiLogOut className="w-4 h-4" />
                                Exit App
                            </button>



                            {/* Load More Button in Header */}
                            {/* Load More Button in Header - Hide if initial load (body spinner) */}
                            {((itemsLoading || cursor) && boardItems.length > 0) && (
                                <button
                                    onClick={handleLoadMore}
                                    disabled={itemsLoading}
                                    className="ml-3 flex items-center px-4 py-2 border border-indigo-600 shadow-sm text-sm font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none disabled:opacity-50"
                                >
                                    {itemsLoading ? 'Loading...' : 'Load More'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Edit Mode Ribbon */}
                    {isEditMode && (
                        <div className="mt-4 p-5 bg-indigo-50 border border-indigo-100 rounded-xl shadow-sm animate-fadeIn relative">
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
                                            {Object.keys(modifiedItems).length}
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
                                        disabled={isSaving || Object.keys(modifiedItems).length === 0}
                                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-md hover:shadow-lg text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                                    >
                                        {isSaving ? <FiLoader className="animate-spin w-5 h-5" /> : <FiCheck className="w-5 h-5" />}
                                        Save All Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Filter Ribbon */}
                    {showFilter ? (
                        <div className="mt-4 p-5 bg-slate-50 border border-slate-200 rounded-xl shadow-sm animate-fadeIn relative">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-semibold text-gray-900">Active Filters</h3>
                                    <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-medium">{filters.length}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setFilters([...filters, { id: Date.now(), column: 'all', condition: 'contains', value: '' }])}
                                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-md hover:bg-indigo-100 transition-colors"
                                    >
                                        <FiPlus className="w-3 h-3" /> Add Filter
                                    </button>
                                    <button
                                        onClick={() => setFilters([])}
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
                                                <option value="does_not_contain">Does not contain</option>
                                                <option value="does_not_equal">Does not equal</option>
                                                <option value="is_duplicate">Is Duplicate</option>
                                                <option value="is_not_empty">Is Not Empty</option>
                                                <option value="is_empty">Is Empty</option>
                                            </select>
                                        </div>
                                        {(filter.condition !== 'is_duplicate' && filter.condition !== 'is_not_empty' && filter.condition !== 'is_empty') ? (
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
                                        onClick={() => setFilters([{ id: 1, column: 'all', condition: 'contains', value: '' }])}
                                        className="text-xs text-red-500 hover:text-red-700 underline"
                                    >
                                        Reset Filters
                                    </button>
                                    <span className="text-gray-500 font-medium">
                                        Showing <span className="text-gray-900">{filteredItems.length}</span> of {boardItems.length} items
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Filter Summary Status (When collapsed but active) */
                        filters.some(f => f.value) && (
                            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between animate-fadeIn">
                                <div className="flex gap-2">
                                    <span className="text-sm text-gray-500 mr-2">Filters:</span>
                                    {filters.filter(f => f.value || f.condition === 'is_duplicate').map((f, i) => (
                                        <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                            {f.column === 'all' ? 'Any' : (columnsMap?.[f.column]?.title || f.column)} {f.condition === 'is_duplicate' ? 'is Duplicate' : `: ${f.value}`}
                                        </span>
                                    ))}
                                </div>
                                <div className="text-sm text-gray-500">
                                    {filteredItems.length} results
                                </div>
                            </div>
                        )
                    )}



                </div>

                {/* Scrollable Content Section - Handles both X and Y absolute scrolling */}
                <div className="flex-1 overflow-auto p-8 pt-6">

                    {!activeBoardId ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <FiImage className="w-16 h-16 opacity-10 mb-4" />
                            <p>Select a board to view items</p>
                        </div>
                    ) : itemsLoading && boardItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <FiLoader className="w-10 h-10 animate-spin mb-4 text-indigo-400" />
                            <p className="text-sm font-medium">Loading items...</p>
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="flex justify-center">
                            {boardItems.length === 0 ? (
                                <EmptyState onSync={handleSync} syncing={enterpriseSync.isSyncing} />
                            ) : (
                                <div className="text-center py-20 text-gray-400">
                                    <FiFilter className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p>No items match your filters.</p>
                                    <button onClick={() => setFilters([])} className="text-indigo-600 font-medium hover:underline mt-2">Clear Filters</button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Grid View */}
                            {viewMode === 'grid' && (
                                <div
                                    className="grid gap-6 transition-all duration-300"
                                    style={{
                                        gridTemplateColumns: `repeat(${Math.max(1, gridColumns)}, minmax(0, 1fr))`
                                        // Mobile fallback handled by responsiveness helper if needed, but minmax(0, 1fr) is usually safe.
                                        // To be safe for mobile, we can use a class for small screens or media query in style.
                                        // Let's use standard classes for small, dynamic for md+
                                    }}
                                >
                                    {/* Override specifically for larger screens to use dynamic columns, force 1 col on XS/SM */}
                                    {/* We use a specific inline style controlled by media query logic or just rely on min-width */}
                                    <style>{`
                                        @media (min-width: 768px) {
                                            .grid-dynamic-cols {
                                                grid-template-columns: repeat(${gridColumns}, minmax(0, 1fr)) !important;
                                            }
                                        }
                                        @media (max-width: 767px) {
                                            .grid-dynamic-cols {
                                                grid-template-columns: repeat(1, minmax(0, 1fr)) !important;
                                            }
                                        }
                                     `}</style>
                                    <div className="contents grid-dynamic-cols"> {/* Wrapper to apply styles cleanly */}
                                        {filteredItems.map(item => (
                                            <CardItem
                                                key={item.id}
                                                item={item}
                                                onClick={(itm) => {
                                                    setSelectedItem(itm);
                                                    // setGalleryItem(itm); // Removed to prevent race condition. Effect will open it.
                                                }}
                                                onImageClick={(itm, idx) => {
                                                    setSelectedItem(itm, idx);
                                                }}
                                                showImages={showImages}
                                                optimizeImages={optimizeImages}
                                                editableColumns={editableColumns}
                                                onUpdate={handleUpdateColumn}
                                                columnsMap={columnsMap}
                                                isEditMode={isEditMode}
                                                cardColumns={config?.card_columns?.[activeBoardId] || []}
                                                modifiedItems={modifiedItems}
                                                cardActions={config?.card_actions?.[activeBoardId] || []}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* List View */}
                            {viewMode === 'list' && (
                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-w-[100%] inline-block">
                                    <div className="">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-100 border-b border-gray-200">
                                                <tr>
                                                    <th
                                                        className="px-4 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[250px] cursor-pointer hover:text-indigo-700 hover:bg-gray-200 transition-colors"
                                                        onClick={() => requestSort('name')}
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            Item Name
                                                            {sortConfig.key === 'name' && (
                                                                sortConfig.direction === 'asc' ? <FiArrowUp className="w-3 h-3" /> : <FiArrowDown className="w-3 h-3" />
                                                            )}
                                                        </div>
                                                    </th>
                                                    {/* Use a set or just first item cols for header */}
                                                    {(boardItems[0]?.column_values || []).map(c => (
                                                        <th
                                                            key={c.id}
                                                            className="px-4 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[180px] cursor-pointer hover:text-indigo-700 hover:bg-gray-200 transition-colors"
                                                            onClick={() => requestSort(c.id)}
                                                        >
                                                            <div className="flex items-center gap-1">
                                                                {columnsMap[c.id]?.title || c.title || c.id.replace(/_/g, ' ')}
                                                                {sortConfig.key === c.id && (
                                                                    sortConfig.direction === 'asc' ? <FiArrowUp className="w-3 h-3" /> : <FiArrowDown className="w-3 h-3" />
                                                                )}
                                                            </div>
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {filteredItems.map(item => (
                                                    <ItemRow key={item.id} item={item} columns={(boardItems[0]?.column_values || []).map(c => c.id)} onRowClick={setSelectedItem} showImages={showImages} optimizeImages={optimizeImages} editableColumns={editableColumns} onUpdate={handleUpdateColumn} columnsMap={columnsMap} isEditMode={isEditMode} modifiedItems={modifiedItems} refreshKey={refreshKey} />
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Load More Removed from Bottom */}
                        </>
                    )}
                </div>
            </div>

            {/* Sync Live Log Viewer - Visible during Sync OR in Debug Mode */}
            {
                (enterpriseSync.isSyncing || isDebugMode) && (
                    <div className="fixed bottom-4 right-4 w-80 bg-gray-900 rounded-lg shadow-2xl z-[100] border border-gray-700 overflow-hidden font-mono text-xs flex flex-col animate-slideUp">
                        <div className="bg-gray-800 px-3 py-2 flex justify-between items-center border-b border-gray-700">
                            <span className="text-gray-300 font-semibold flex items-center gap-2">
                                {enterpriseSync.isSyncing ? <FiLoader className="animate-spin text-indigo-400" /> : <FiCpu className="text-red-400" />}
                                {enterpriseSync.isSyncing ? 'Syncing...' : 'Debug Console'}
                            </span>
                            {enterpriseSync.isSyncing && <span className="text-gray-500">{Math.floor(enterpriseSync.syncDuration / 60).toString().padStart(2, '0')}:{(enterpriseSync.syncDuration % 60).toString().padStart(2, '0')}</span>}
                            {!enterpriseSync.isSyncing && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setShowJobHistory(true)}
                                        className="text-xs text-indigo-400 hover:text-indigo-300"
                                    >
                                        Job History
                                    </button>
                                    <button onClick={toggleDebug} className="text-gray-500 hover:text-white" title="Close"><FiX /></button>
                                </div>
                            )}
                        </div>
                        <div className="p-3 h-48 overflow-y-auto flex flex-col gap-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-600">
                            {enterpriseSync.syncState.logs.length === 0 && <span className="text-gray-600 italic">No logs yet...</span>}
                            {enterpriseSync.syncState.logs.map((log, i) => (
                                <div key={i} className={`flex items-start gap-2 break-words text-[11px] py-0.5 ${log.includes('ERROR') ? 'text-red-400' : log.includes('SUCCESS') ? 'text-green-400' : 'text-gray-300'}`}>
                                    <span className="mt-0.5 opacity-50">
                                        {log.includes('SUCCESS') ? <FiCheck className="text-green-400" /> : <FiChevronRight />}
                                    </span>
                                    <span>{log}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* Standalone ItemDetailsDrawer Removed - Integrated into Gallery Mode */}



            {/* Gallery Modal */}
            {
                galleryItem && (
                    <ImageGalleryModal
                        item={galleryItem}
                        onClose={() => {
                            setGalleryItem(null);
                            setSelectedItem(null); // Fix: Clear URL to prevent Effect from re-opening gallery
                        }}
                        showImages={showImages}
                        optimizeImages={optimizeImages}
                        columnsMap={columnsMap}
                        onItemUpdate={handleSingleItemUpdate}
                        onAssetUpdate={handleAssetUpdate}
                        editableColumns={editableColumns}
                        onNext={handleNextItem}
                        onPrev={handlePrevItem}
                        hasNext={filteredItems.length > 1}
                        hasPrev={filteredItems.length > 1}
                        refreshKey={refreshKey}
                        onRotationComplete={() => setRefreshKey(prev => prev + 1)}
                        enterpriseSync={enterpriseSync}
                        keepOriginals={keepOriginals}

                    />
                )
            }

            {/* Clear Cache Modal */}
            {
                showClearCache && activeBoardId && (
                    <ClearCacheModal
                        onClose={() => setShowClearCache(false)}
                        onConfirm={handleClearCache}
                        boardName={boards.find(b => b.id === activeBoardId)?.name || 'Board'}
                    />
                )
            }

            {/* Exit Confirmation Modal */}
            {
                showExitDialog && (
                    <div className="fixed inset-0 overflow-y-auto z-[200]">
                        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setShowExitDialog(false)}>
                                <div className="absolute inset-0 bg-gray-900 opacity-75 backdrop-blur-sm"></div>
                            </div>
                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-100">
                                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <div className="sm:flex sm:items-start">
                                        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                            <FiLogOut className="h-6 w-6 text-red-600" />
                                        </div>
                                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                            <h3 className="text-lg leading-6 font-medium text-gray-900">
                                                Exit Application?
                                            </h3>
                                            <div className="mt-2">
                                                <p className="text-sm text-gray-500">
                                                    Are you sure you want to leave the Monday App?
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowExitDialog(false);
                                            // We restored the trap in handlePopState ([App, AppTrap]).
                                            // To exit: need to skip Trap (-1) and App (-1) => Total -2.
                                            window.history.go(-2);
                                        }}
                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:w-auto sm:text-sm"
                                    >
                                        Exit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowExitDialog(false)}
                                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                                    >
                                        Stay
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Job History Panel */}
            {/* Configuration Modal */}


            {/* Modals */}
            <JobHistoryPanel
                isOpen={showJobHistory}
                onClose={() => setShowJobHistory(false)}
            />


        </div >
    );
};

export default MondayAppView;
