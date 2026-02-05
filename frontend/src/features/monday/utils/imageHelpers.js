/**
 * Image helper utilities for Monday app
 */

/**
 * Extract image files from Monday item
 */
export const extractFiles = (item) => {
    if (!item?.column_values) return [];

    const fileColumns = item.column_values.filter(col =>
        col.type === 'file' && col.value
    );

    const files = [];
    fileColumns.forEach(col => {
        try {
            const parsed = typeof col.value === 'string'
                ? JSON.parse(col.value)
                : col.value;

            if (parsed?.files && Array.isArray(parsed.files)) {
                parsed.files.forEach(file => {
                    files.push({
                        ...file,
                        columnId: col.id,
                        columnTitle: col.title || col.id,
                    });
                });
            }
        } catch (e) {
            console.warn('Failed to parse file column:', col);
        }
    });

    return files;
};

/**
 * Get proxy URL for image
 */
// Get proxy URL for image
export const getProxyUrl = (file, optimized = true) => {
    if (!file) return null;

    // Check if it's a local file
    if (file.local_path) {
        try {
            // Normalize path separators
            const normalizedPath = file.local_path.replace(/\\/g, '/');

            // Extract the relative path starting from 'assets/'
            // e.g. .../backend/assets/monday_files/123/img.jpg -> monday_files/123/img.jpg
            const assetsSplit = normalizedPath.split('/assets/');

            if (assetsSplit.length > 1) {
                let relativePath = assetsSplit[1];

                // Check for optimized version if requested
                if (optimized && file.optimized_path) {
                    const normalizedOpt = file.optimized_path.replace(/\\/g, '/');
                    const optSplit = normalizedOpt.split('/assets/');
                    if (optSplit.length > 1) {
                        relativePath = optSplit[1];
                    }
                }

                // Construct URL: /api/v1/tools/files/path/to/image.jpg
                // We do not encode the entire path, only the segments if needed, but here we treat it as a raw path
                return `/api/v1/tools/files/${relativePath}`;
            }
        } catch (e) {
            console.warn("Failed to construct local URL", e);
        }
    }

    // Enforce Local Only: Do NOT return public_url
    // If local path is missing, return null to trigger "Not Synced" state in UI.
    return null;
};

/**
 * Get item thumbnail image
 */
export const getItemThumbnail = (item, optimized = true) => {
    const files = extractFiles(item);
    if (files.length === 0) return null;

    const imageFile = files.find(f =>
        f.file_type?.startsWith('image/') ||
        /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name || '')
    );

    return imageFile ? getProxyUrl(imageFile, optimized) : null;
};

/**
 * Format file size
 */
export const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return 'Unknown';

    const units = ['B', 'KB', 'MB', 'GB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`;
};

/**
 * Check if file is an image
 */
export const isImageFile = (file) => {
    if (!file) return false;

    if (file.file_type?.startsWith('image/')) return true;
    if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(file.name || '')) return true;

    return false;
};

/**
 * Download file with proper handling
 */
export const downloadFile = async (url, filename) => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(blobUrl);
    } catch (error) {
        console.error('Download failed:', error);
        throw error;
    }
};
