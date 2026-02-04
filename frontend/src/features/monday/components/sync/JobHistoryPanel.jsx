import React, { useState, useEffect } from 'react';
import { FiClock, FiCheckCircle, FiXCircle, FiLoader, FiRefreshCw, FiTrash2 } from 'react-icons/fi';
import api from '../../../../services/api';

/**
 * Job History Panel - Shows sync job queue and history
 */
const JobHistoryPanel = ({ onClose }) => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(false); // Default to FALSE to stop "infinite" logs

    const fetchJobs = async () => {
        try {
            const response = await api.get('/integrations/monday/sync/jobs?limit=50');
            setJobs(response.data || []);
        } catch (error) {
            console.error('Failed to fetch jobs:', error);
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch
    useEffect(() => {
        fetchJobs();
    }, []);

    // Auto-refresh interval (User enabled OR Active Jobs present)
    useEffect(() => {
        // Check if there are any active jobs
        const hasActiveJobs = jobs.some(j => j.status === 'pending' || j.status === 'running');

        if (autoRefresh || hasActiveJobs) {
            const interval = setInterval(fetchJobs, 5000); // 5s interval for active monitoring
            return () => clearInterval(interval);
        }
    }, [autoRefresh, jobs]);

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending':
                return <FiClock className="text-yellow-500" />;
            case 'running':
                return <FiLoader className="text-blue-500 animate-spin" />;
            case 'complete':
                return <FiCheckCircle className="text-green-500" />;
            case 'failed':
                return <FiXCircle className="text-red-500" />;
            default:
                return <FiClock className="text-gray-400" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-50 text-yellow-700 border-yellow-200';
            case 'running':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'complete':
                return 'bg-green-50 text-green-700 border-green-200';
            case 'failed':
                return 'bg-red-50 text-red-700 border-red-200';
            default:
                return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    const formatDuration = (start, end) => {
        if (!start) return '-';
        const startTime = new Date(start);
        const endTime = end ? new Date(end) : new Date();
        const seconds = Math.floor((endTime - startTime) / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const resetQueue = async () => {
        if (!confirm('Reset all pending/running jobs? This will mark them as failed.')) return;

        try {
            await api.post('/integrations/monday/sync/jobs/reset');
            fetchJobs();
        } catch (error) {
            console.error('Failed to reset queue:', error);
        }
    };

    const activeJobs = jobs.filter(j => j.status === 'pending' || j.status === 'running');
    const completedJobs = jobs.filter(j => j.status === 'complete' || j.status === 'failed');

    return (
        <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                <div>
                    <h2 className="text-lg font-semibold">Sync Queue</h2>
                    <p className="text-xs text-indigo-100">
                        {activeJobs.length} active · {completedJobs.length} completed
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`p-2 rounded-lg transition-colors ${autoRefresh ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-white/10'
                            }`}
                        title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
                    >
                        <FiRefreshCw className={loading ? 'animate-spin' : ''} size={16} />
                    </button>
                    <button
                        onClick={resetQueue}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="Reset queue"
                    >
                        <FiTrash2 size={16} />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <FiLoader className="animate-spin text-gray-400" size={32} />
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <FiClock size={48} className="mb-4 opacity-20" />
                        <p className="text-sm">No sync jobs yet</p>
                    </div>
                ) : (
                    <div className="p-4 space-y-4">
                        {/* Active Jobs */}
                        {activeJobs.length > 0 && (
                            <div>
                                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                    Active ({activeJobs.length})
                                </h3>
                                <div className="space-y-2">
                                    {activeJobs.map((job) => (
                                        <div
                                            key={job.id}
                                            className={`p-3 rounded-lg border ${getStatusColor(job.status)}`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="mt-0.5">{getStatusIcon(job.status)}</div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-sm font-medium truncate">
                                                            Board {job.board_id}
                                                        </span>
                                                        <span className="text-xs font-mono">
                                                            {formatDuration(job.created_at, job.completed_at)}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs opacity-75 truncate">
                                                        {job.progress_message || 'Processing...'}
                                                    </p>
                                                    {job.status === 'running' && (
                                                        <div className="mt-2 h-1 bg-white/30 rounded-full overflow-hidden">
                                                            <div className="h-full bg-current animate-pulse" style={{ width: '60%' }} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Completed Jobs */}
                        {completedJobs.length > 0 && (
                            <div>
                                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                    History ({completedJobs.length})
                                </h3>
                                <div className="space-y-2">
                                    {completedJobs.map((job) => (
                                        <div
                                            key={job.id}
                                            className={`p-3 rounded-lg border ${getStatusColor(job.status)}`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="mt-0.5">{getStatusIcon(job.status)}</div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-sm font-medium truncate">
                                                            Board {job.board_id}
                                                        </span>
                                                        <span className="text-xs font-mono">
                                                            {formatDuration(job.created_at, job.completed_at)}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs opacity-75 truncate">
                                                        {job.progress_message || (job.status === 'complete' ? 'Completed' : 'Failed')}
                                                    </p>
                                                    <p className="text-xs opacity-50 mt-1">
                                                        {new Date(job.created_at).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default JobHistoryPanel;
