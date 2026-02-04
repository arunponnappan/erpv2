import React, { useState, useEffect } from 'react';
import { FiSidebar, FiEdit2, FiCheck, FiLoader, FiExternalLink, FiLock } from 'react-icons/fi';
import { CachedImage, getItemImages } from './Shared';
import api from '../../services/api';

const ItemDetailsDrawer = ({ item, onClose, showImages, optimizeImages, columnsMap, zIndex = 50, inline = false, onItemUpdate, editableColumns = [] }) => {
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

    // Use shared helper - but ensure we handle the result correctly which is ARRAY of file objects
    // The drawer logic in original file extracted files MANUALLY using a loop.
    // Let's reuse getItemImages but flattened, OR stick to original logic if it captures more metadata (like columnId).
    // Original logic captured `columnId`, `itemName` etc. `getItemImages` is purer.
    // Let's implement the manual extraction here as it was specific for grouping attachments by all columns.

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

                            if (f.assetId && itm.assets) {
                                const foundAsset = itm.assets.find(a => a.id === String(f.assetId) || a.id === parseInt(f.assetId));
                                if (foundAsset) {
                                    assetData = foundAsset;
                                    originalUrl = foundAsset.public_url || foundAsset.url;
                                    usePublic = !!foundAsset.public_url;

                                    if (foundAsset.local_url) localUrl = foundAsset.local_url;
                                    if (optimizeImages && foundAsset.optimized_url) localUrl = foundAsset.optimized_url;

                                    // Fix: Ensure localUrl is absolute (pointing to Backend)
                                    if (localUrl && !localUrl.startsWith('http')) {
                                        const backendOrigin = new URL(api.defaults.baseURL).origin;
                                        // Ensure no double slash
                                        const path = localUrl.startsWith('/') ? localUrl : `/${localUrl}`;
                                        localUrl = `${backendOrigin}${path}`;
                                    }
                                }
                            }

                            // Proxy Logic
                            const optimizeParam = optimizeImages ? '&optimize=true&width=400' : '';
                            const proxyUrl = localUrl
                                ? localUrl
                                : (originalUrl ? `${api.defaults.baseURL}/integrations/monday/proxy?url=${encodeURIComponent(originalUrl)}${usePublic ? '&skip_auth=true' : ''}${optimizeParam}` : null);


                            allFiles.push({
                                ...f,
                                ...assetData,
                                columnId: col.id,
                                itemName: itm.name,
                                proxyUrl,
                                originalUrl,
                                usePublic,
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
                {allFiles.length > 0 && (
                    <div className="mb-8">
                        <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Attachments ({allFiles.length})</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {allFiles.map((file, idx) => {
                                // Properties already calculated in extractFiles
                                const { isLocal, proxyUrl, originalUrl, usePublic, name } = file;
                                const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(name || '');
                                const progress = proxyUrl && downloading[proxyUrl];
                                return (
                                    <div key={idx} className="border rounded-lg overflow-hidden flex flex-col shadow-sm">
                                        {isImage && proxyUrl ? <CachedImage file={file} proxyUrl={proxyUrl} originalUrl={originalUrl} usePublic={usePublic} shouldLoad={showImages} isLocal={isLocal} className="w-full h-32 object-cover" /> : <div className="w-full h-32 bg-gray-100 flex items-center justify-center text-gray-400"><span className="text-4xl">📄</span></div>}
                                        <div className="p-2 bg-white">
                                            <p className="text-xs text-gray-500 truncate mb-1" title={file.name}>{file.name}</p>
                                            <p className="text-[10px] text-gray-400 mb-2">
                                                {file.size ? (file.size / 1024).toFixed(0) + ' KB' : (file.file_size ? (file.file_size / 1024).toFixed(0) + ' KB' : 'Size Unknown')}
                                            </p>
                                            <div className="flex gap-2">
                                                <button onClick={() => { if (usePublic) window.open(originalUrl, '_blank'); else if (proxyUrl) handleDownload(proxyUrl, file.name); }} disabled={!!progress && !usePublic} className={`flex-1 text-center px-2 py-1 text-xs rounded flex items-center justify-center gap-1 font-medium ${progress ? 'bg-blue-100 text-blue-800' : 'bg-indigo-50 text-indigo-700'}`}>{progress ? `${progress}%` : 'Download'}</button>
                                                {usePublic && <button onClick={() => window.open(originalUrl, '_blank')} className="px-2 py-1 text-xs rounded bg-gray-50 border"><FiExternalLink /></button>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
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
            </div>
        </div>
    );

    if (inline) return content;

    return (
        <div className={`fixed inset-0 overflow-hidden z-[${zIndex}]`}>
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
                <div className="fixed inset-y-0 right-0 max-w-full flex">
                    {content}
                </div>
            </div>
        </div>
    );
};

export default ItemDetailsDrawer;
