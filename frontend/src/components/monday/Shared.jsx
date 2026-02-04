import React, { useState, useEffect, useRef } from 'react';
import { FiImage, FiRefreshCw, FiLoader } from 'react-icons/fi';

import { useDebug } from '../../context/DebugContext';
import api from '../../services/api';

// Helper to extract all images for an item
export const getItemImages = (item, optimize = false, targetColumnId = null) => {
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
                            let originalUrl = f.url || f.public_url;
                            let localUrl = null;
                            let usePublic = false;
                            let size = Number(f.size || f.file_size || 0);
                            let rotation = 0;
                            let localOriginalUrl = null;
                            let localOptimizedUrl = null;

                            if (f.assetId && item.assets) {
                                const asset = item.assets.find(a => a.id === String(f.assetId) || a.id === parseInt(f.assetId));
                                if (asset) {
                                    originalUrl = asset.public_url || asset.url;
                                    usePublic = !!asset.public_url;
                                    const backendOrigin = new URL(api.defaults.baseURL).origin;

                                    if (asset.local_url) {
                                        const clean = asset.local_url.startsWith('/') ? asset.local_url : `/${asset.local_url}`;
                                        localOriginalUrl = `${backendOrigin}${clean}`;
                                    }
                                    if (asset.optimized_url) {
                                        const clean = asset.optimized_url.startsWith('/') ? asset.optimized_url : `/${asset.optimized_url}`;
                                        localOptimizedUrl = `${backendOrigin}${clean}`;
                                    }

                                    if (optimize && localOptimizedUrl) {
                                        localUrl = localOptimizedUrl;
                                    } else if (localOriginalUrl) {
                                        localUrl = localOriginalUrl;
                                    }

                                    if (asset.stats) {
                                        if (asset.stats.original_size) size = asset.stats.original_size;
                                        else if (asset.stats.optimized_size) size = asset.stats.optimized_size;
                                    }
                                    if (asset.rotation) rotation = Number(asset.rotation);
                                }
                            }

                            const optimizeParam = optimize ? '&optimize=true&width=400' : '';
                            const proxyUrl = localUrl
                                ? localUrl
                                : (originalUrl ? `${api.defaults.baseURL}/integrations/monday/proxy?url=${encodeURIComponent(originalUrl)}${usePublic ? '&skip_auth=true' : ''}${optimizeParam}` : null);

                            images.push({ ...f, proxyUrl, originalUrl, usePublic, isLocal: !!localUrl, size, localOriginalUrl, localOptimizedUrl, rotation, itemId: item.id });
                        }
                    }
                }
            } catch (e) { }
        }
    }
    return images;
};

// Component to fetch image to local blob with progress
export const CachedImage = ({ file, proxyUrl, originalUrl, usePublic, className, compact = false, shouldLoad = true, isLocal = false, style = {}, imgRef }) => {
    // Ensure we have a ref to check 'complete' status, even if parent didn't pass one
    const localRef = useRef(null);
    const resolvedRef = imgRef || localRef;

    const [blobUrl, setBlobUrl] = useState(null);
    const [isLoadingBlob, setIsLoadingBlob] = useState(shouldLoad && !isLocal); // Fetching blob
    const [isImageReady, setIsImageReady] = useState(false); // Image tag ONLOAD fired
    const [error, setError] = useState(false);
    const { isDebugEnabled } = useDebug();
    const isDebugMode = isDebugEnabled;

    // Effect for non-local (proxied/blob) images
    useEffect(() => {
        setIsImageReady(false); // Reset ready state on new load

        // If it's local static file or we shouldn't load, skip fetch logic
        if (isLocal || !shouldLoad) {
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
    }, [proxyUrl, originalUrl, usePublic, shouldLoad, isLocal]);

    // Force check if image is already cached (browser often skips onLoad for 304s)
    useEffect(() => {
        if (!isLocal && !blobUrl && !originalUrl) return; // Nothing to load yet

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
            const apiOrigin = new URL(import.meta.env.VITE_API_URL || window.location.origin).origin;
            const normalizedUrl = url.replace(/\\/g, '/');
            const cleanRelPath = normalizedUrl.replace(/^[\/\\]+/, '');

            if (cleanRelPath.includes('assets/monday_files/')) {
                const parts = cleanRelPath.split('assets/');
                if (parts.length > 1) {
                    const rel = parts[1];
                    return `${apiOrigin}/api/v1/tools/files/${rel.replace(/^\/+/, '')}`;
                }
            }
            return `${apiOrigin}/${cleanRelPath}`;
        } catch (e) {
            return url;
        }
    };

    const imgSrc = isLocal ? getAbsoluteUrl(proxyUrl) : (blobUrl || originalUrl);

    if (error) {
        return (
            <div className={`flex items-center justify-center bg-gray-100 text-gray-400 ${className}`}>
                <FiImage className={compact ? "w-4 h-4" : "w-8 h-8"} />
            </div>
        );
    }

    if (!shouldLoad) {
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

            {(isLoadingBlob || !isImageReady) && !error && imgSrc && (
                <div className="absolute inset-0 flex items-center justify-center z-10 transition-opacity duration-300">
                    <div className={`${compact ? 'w-5 h-5 border-2' : 'w-10 h-10 border-4'} border-gray-200 border-t-indigo-500 rounded-full animate-spin`}></div>
                </div>
            )}

            {imgSrc && (
                <img
                    key={imgSrc}
                    ref={resolvedRef}
                    src={imgSrc}
                    alt={file?.name || 'Image'}
                    className={`${className} transition-opacity duration-300 ${isImageReady ? 'opacity-100' : 'opacity-0'}`}
                    style={style}
                    loading="lazy"
                    draggable={false}
                    onMouseDown={(e) => e.preventDefault()}
                    onLoad={() => setIsImageReady(true)}
                    onError={() => {
                        setError(true);
                        setIsImageReady(true);
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

export const EmptyState = ({ onSync, syncing }) => (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-fadeIn bg-white rounded-xl border border-dashed border-gray-300 mx-auto max-w-2xl mt-8">
        <div className="bg-indigo-50 p-6 rounded-full mb-6">
            <FiRefreshCw className={`w-12 h-12 text-indigo-500 ${syncing ? 'animate-spin' : ''}`} />
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
