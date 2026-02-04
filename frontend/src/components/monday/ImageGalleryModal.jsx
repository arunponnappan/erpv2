import React, { useState, useEffect, useRef } from 'react';
import { FiX, FiCheck, FiChevronLeft, FiChevronRight, FiDownload, FiZoomIn, FiZoomOut, FiMaximize, FiMinimize, FiCpu } from 'react-icons/fi';
import { useToast } from '../../context/ToastContext';
import { getItemImages, CachedImage } from './Shared';
import api from '../../services/api';

const ImageGalleryModal = ({ item, onClose, showImages, optimizeImages, columnsMap, onItemUpdate, editableColumns, onNext, onPrev, hasNext, hasPrev }) => {
    const [currentIndex, setCurrentIndex] = useState(item?.initialIndex || 0);
    const [rotation, setRotation] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);

    // Magic/Scan State
    const [isExtracting, setIsExtracting] = useState(false);
    const [scanResults, setScanResults] = useState(null);

    const panStartRef = useRef({ x: 0, y: 0 });
    const imageRef = useRef(null);
    const toast = useToast();

    // Use shared image helper
    const images = getItemImages(item, optimizeImages);
    const currentImage = images[currentIndex];

    // Reset on item change
    useEffect(() => {
        setRotation(currentImage?.rotation || 0);
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setScanResults(null);
    }, [currentIndex, item]);

    // Handlers
    const handleZoomIn = () => setZoom(z => Math.min(z + 0.5, 5));
    const handleZoomOut = () => {
        setZoom(z => {
            const next = Math.max(z - 0.5, 1);
            if (next === 1) setPan({ x: 0, y: 0 });
            return next;
        });
    };

    const handleWheel = (e) => {
        if (e.deltaY < 0) handleZoomIn();
        else handleZoomOut();
    };

    const handlePanMouseDown = (e) => {
        if (zoom <= 1) return;
        e.preventDefault();
        setIsPanning(true);
        panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    };

    const handlePanMouseMove = (e) => {
        if (!isPanning) return;
        e.preventDefault();
        setPan({ x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y });
    };

    const handlePanMouseUp = () => setIsPanning(false);

    const handleScanCodes = async (forceAI = false) => {
        if (!currentImage) return;
        setIsExtracting(true);
        try {
            if (!currentImage.itemId || !currentImage.assetId) {
                toast.error("Cannot scan: Metadata missing");
                return;
            }
            const res = await api.post(`/integrations/monday/items/${currentImage.itemId}/assets/${currentImage.assetId}/extract`, {
                rotation: 0,
                force_ai: forceAI
            });

            if (res.data.success || res.data.codes) {
                const codes = res.data.codes || [];
                setScanResults(codes);
                if (codes.length === 0) toast.info("No codes found");
                else toast.success(`Found ${codes.length} codes`);
            }
        } catch (e) {
            toast.error("Scan failed");
        } finally {
            setIsExtracting(false);
        }
    };

    if (!item) return null;
    if (images.length === 0) return null; // Should not happen if opened

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-fadeIn">
            <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white z-50 p-2">
                <FiX className="w-8 h-8" />
            </button>

            {/* Main content */}
            <div className="relative w-full h-full flex flex-col">
                {/* Toolbar */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-4 z-50 bg-black/50 p-2 rounded-full backdrop-blur-md border border-white/10">
                    <button onClick={handleZoomOut} className="p-2 text-white hover:bg-white/20 rounded-full"><FiZoomOut /></button>
                    <span className="text-xs text-white font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
                    <button onClick={handleZoomIn} className="p-2 text-white hover:bg-white/20 rounded-full"><FiZoomIn /></button>
                    <div className="w-px h-4 bg-white/20"></div>
                    <button onClick={() => handleScanCodes(false)} className="p-2 text-white hover:bg-white/20 rounded-full" title="Scan">
                        <FiCheck />
                    </button>
                </div>

                {/* Image Area */}
                <div
                    className="flex-1 overflow-hidden relative flex items-center justify-center"
                    onWheel={handleWheel}
                    onMouseUp={handlePanMouseUp}
                    onMouseLeave={handlePanMouseUp}
                >
                    {/* Navigation Buttons */}
                    {hasPrev && (
                        <button onClick={onPrev} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 text-white rounded-full hover:bg-white/20 z-40 transition-all">
                            <FiChevronLeft className="w-6 h-6" />
                        </button>
                    )}
                    {hasNext && (
                        <button onClick={onNext} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 text-white rounded-full hover:bg-white/20 z-40 transition-all">
                            <FiChevronRight className="w-6 h-6" />
                        </button>
                    )}

                    {/* The Image */}
                    <div
                        className="transition-transform duration-75 ease-out will-change-transform cursor-grab active:cursor-grabbing"
                        style={{
                            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`
                        }}
                        onMouseDown={handlePanMouseDown}
                        onMouseMove={handlePanMouseMove}
                    >
                        <CachedImage
                            file={currentImage}
                            proxyUrl={currentImage.proxyUrl}
                            originalUrl={currentImage.originalUrl}
                            usePublic={currentImage.usePublic}
                            className="max-h-[85vh] max-w-[90vw] object-contain shadow-2xl"
                            shouldLoad={true}
                            imgRef={imageRef}
                        />

                        {/* Overlay Scan Results if any */}
                        {scanResults && scanResults.map((scan, i) => (
                            <div
                                key={i}
                                className="absolute border-2 border-green-500 bg-green-500/20 hover:bg-green-500/40 cursor-pointer transition-all z-20"
                                style={{
                                    left: item.rect.x, // Simplified - needs scaling logic from original file
                                    top: item.rect.y,
                                    width: item.rect.width,
                                    height: item.rect.height
                                }}
                                title={scan.data}
                            />
                        ))}
                    </div>
                </div>

                {/* Bottom Strip */}
                <div className="h-20 bg-black/80 flex items-center justify-center gap-2 overflow-x-auto px-4 py-2 border-t border-white/10">
                    {images.map((img, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            className={`relative h-14 w-14 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${currentIndex === idx ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`}
                        >
                            <CachedImage
                                file={img}
                                proxyUrl={img.proxyUrl}
                                originalUrl={img.originalUrl}
                                usePublic={img.usePublic}
                                className="w-full h-full object-cover"
                                compact={true}
                            />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ImageGalleryModal;
