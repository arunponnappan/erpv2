import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const DebugContext = createContext();

export const useDebug = () => useContext(DebugContext);

export const DebugProvider = ({ children }) => {
    const [isDebugEnabled, setIsDebugEnabled] = useState(false);
    const [logs, setLogs] = useState([]);
    const [isOpen, setIsOpen] = useState(false); // To toggle the log viewer overlay

    const toggleDebug = () => setIsDebugEnabled(prev => !prev);
    const clearLogs = () => setLogs([]);

    const logError = (error) => {
        if (!isDebugEnabled) return;

        const newLog = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            type: 'error',
            status: error.response?.status || 'Network Error',
            url: error.config?.url || 'Unknown URL',
            method: error.config?.method?.toUpperCase() || 'UNKNOWN',
            message: error.message || 'Unknown Error',
            data: error.response?.data,
        };

        setLogs(prev => [newLog, ...prev].slice(0, 50)); // Keep last 50
        setIsOpen(true); // Auto-open on error? Maybe just notify. Let's auto-open for visibility as requested.
    };

    // Attach interceptor when debug is enabled
    useEffect(() => {
        // We'll attach a distinctive interceptor
        const interceptorId = api.interceptors.response.use(
            res => res,
            error => {
                logError(error);
                return Promise.reject(error);
            }
        );

        return () => {
            api.interceptors.response.eject(interceptorId);
        };
    }, [isDebugEnabled]);

    return (
        <DebugContext.Provider value={{ isDebugEnabled, toggleDebug, logs, clearLogs, isOpen, setIsOpen }}>
            {children}
            {isDebugEnabled && (
                <div className="fixed bottom-4 right-4 z-50">
                    {/* Floating Toggle Indicator if needed, or handled in Header */}
                </div>
            )}

            {/* Debug Overlay */}
            {isDebugEnabled && isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-end sm:items-center justify-center pointer-events-none">
                    <div className="bg-white w-full max-w-4xl h-[500px] flex flex-col shadow-2xl rounded-t-xl sm:rounded-xl overflow-hidden pointer-events-auto border border-red-200">
                        <div className="bg-gray-100 p-3 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="font-mono text-sm font-bold text-gray-700">🐞 Application Debugger</h3>
                            <div className="flex space-x-2">
                                <button onClick={clearLogs} className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-gray-600">Clear</button>
                                <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-800">Close</button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 font-mono text-xs space-y-4">
                            {logs.length === 0 && <p className="text-gray-400 text-center mt-10">No errors captured yet.</p>}
                            {logs.map(log => (
                                <div key={log.id} className="bg-white border border-red-200 rounded p-3 shadow-sm">
                                    <div className="flex justify-between mb-1">
                                        <span className="font-bold text-red-600">{log.method} {log.status}</span>
                                        <span className="text-gray-400">{log.timestamp}</span>
                                    </div>
                                    <div className="text-blue-600 mb-1 break-all">{log.url}</div>
                                    <div className="text-gray-800 font-semibold mb-2">{log.message}</div>
                                    {log.data && (
                                        <pre className="bg-gray-800 text-green-400 p-2 rounded overflow-x-auto">
                                            {JSON.stringify(log.data, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </DebugContext.Provider>
    );
};
