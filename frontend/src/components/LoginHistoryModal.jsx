import { useState, useEffect } from 'react';
import api from '../services/api';
import { Loader2, Monitor } from 'lucide-react';

const LoginHistoryModal = ({ userId, isOpen }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && userId) {
            fetchHistory();
        }
    }, [isOpen, userId]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/users/${userId}/history`);
            setHistory(response.data);
        } catch (error) {
            console.error("Failed to fetch history", error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    // Simple parser to make UA look nicer
    const parseUA = (ua) => {
        if (!ua) return "Unknown";
        if (ua.includes("Firefox")) return "Firefox";
        if (ua.includes("Chrome")) return "Chrome";
        if (ua.includes("Safari")) return "Safari";
        if (ua.includes("Edge")) return "Edge";
        return "Unknown Browser";
    };

    if (!isOpen) return null;

    return (
        <div className="flex flex-col">
            {loading ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-neutral-400">
                    <Loader2 className="animate-spin mb-2 text-blue-600" size={24} />
                    <p className="text-sm">Loading records...</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    {history.length === 0 ? (
                        <p className="text-center text-gray-500 py-6 dark:text-neutral-400">No login history found.</p>
                    ) : (
                        <div className="border rounded-lg overflow-hidden dark:border-neutral-700">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
                                <thead className="bg-gray-50 dark:bg-neutral-700">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase dark:text-neutral-500">Time</th>
                                        <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase dark:text-neutral-500">IP Address</th>
                                        <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase dark:text-neutral-500">Device/Browser</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                                    {history.map((record) => (
                                        <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-neutral-200">
                                                {formatDate(record.timestamp)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-neutral-200 font-mono">
                                                {record.ip_address}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-neutral-200">
                                                <div className="flex items-center gap-2">
                                                    <Monitor size={14} className="text-gray-400" />
                                                    <span className="font-medium">{parseUA(record.user_agent)}</span>
                                                    <span className="text-xs text-gray-400 truncate max-w-[100px]" title={record.user_agent}>
                                                        (details)
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default LoginHistoryModal;
