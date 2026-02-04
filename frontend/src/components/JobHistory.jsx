import { useState, useEffect } from 'react';
import marketplaceService from '../services/marketplaceService';
import { RefreshCw, FileText, CheckCircle, XCircle, Clock, Loader2, Trash2 } from 'lucide-react';
import Modal from './Modal';

const JobHistory = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedJob, setSelectedJob] = useState(null);

    const fetchJobs = async () => {
        setLoading(true);
        try {
            const response = await marketplaceService.api.get('/integrations/monday/sync/jobs?limit=20');
            setJobs(response.data);
        } catch (error) {
            console.error("Failed to fetch jobs:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleResetQueue = async () => {
        if (!confirm("Clear Sync Queue? This will mark all running/pending jobs as failed.")) return;
        try {
            await marketplaceService.monday.resetQueue();
            fetchJobs();
        } catch (e) {
            console.error(e);
            alert("Failed to reset queue");
        }
    };

    useEffect(() => {
        let isMounted = true;

        const load = async () => {
            if (!isMounted) return;
            await fetchJobs();
        };

        load();

        const interval = setInterval(() => {
            if (!isMounted) return;
            // We can't easily check 'jobs' state here due to closure without refs, 
            // but fetching the list is cheap. Let's just poll.
            // Or better: check if we are loading.
            fetchJobs();
        }, 5000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount

    const getStatusParams = (status) => {
        switch (status) {
            case 'complete': return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/10' };
            case 'failed': return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/10' };
            case 'running': return { icon: Loader2, color: 'text-blue-500 animate-spin', bg: 'bg-blue-50 dark:bg-blue-900/10' };
            default: return { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/10' };
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleString();
    };

    return (
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Clock size={20} />
                    Job History (Queue)
                </h3>
                <div className="flex gap-2">
                    <button
                        onClick={handleResetQueue}
                        title="Clear Queue"
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                    >
                        <Trash2 size={16} />
                    </button>
                    <button
                        onClick={fetchJobs}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-full transition-colors"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-neutral-700 dark:text-gray-400">
                        <tr>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Board ID</th>
                            <th className="px-4 py-3">Created</th>
                            <th className="px-4 py-3">Message</th>
                            <th className="px-4 py-3">Logs</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                        {jobs.map(job => {
                            const { icon: Icon, color, bg } = getStatusParams(job.status);
                            return (
                                <tr key={job.id} className="bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700/50">
                                    <td className="px-4 py-3">
                                        <div className={`flex items-center gap-2 px-2 py-1 rounded-full w-fit ${bg}`}>
                                            <Icon size={14} className={color} />
                                            <span className={`capitalize font-medium ${color.replace(' animate-spin', '')}`}>{job.status}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-300">{job.board_id}</td>
                                    <td className="px-4 py-3 text-gray-500">{formatDate(job.created_at)}</td>
                                    <td className="px-4 py-3 max-w-xs truncate" title={job.progress_message}>{job.progress_message}</td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => setSelectedJob(job)}
                                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                                        >
                                            <FileText size={14} /> View
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {jobs.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No recent jobs found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {selectedJob && (
                <Modal
                    isOpen={!!selectedJob}
                    onClose={() => setSelectedJob(null)}
                    title={`Job Logs: ${selectedJob.id}`}
                    size="3xl"
                >
                    <div className="p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-gray-50 dark:bg-neutral-900 p-3 rounded">
                                <span className="block text-xs uppercase text-gray-500 mb-1">Status</span>
                                <span className="font-semibold">{selectedJob.status.toUpperCase()}</span>
                            </div>
                            <div className="bg-gray-50 dark:bg-neutral-900 p-3 rounded">
                                <span className="block text-xs uppercase text-gray-500 mb-1">Duration</span>
                                <span>
                                    {selectedJob.completed_at
                                        ? `${Math.round((new Date(selectedJob.completed_at) - new Date(selectedJob.created_at)) / 1000)}s`
                                        : 'Running...'}
                                </span>
                            </div>
                            {selectedJob.stats && (
                                <div className="col-span-2 bg-gray-50 dark:bg-neutral-900 p-3 rounded">
                                    <span className="block text-xs uppercase text-gray-500 mb-1">Stats</span>
                                    <pre className="text-xs font-mono whitespace-pre-wrap">{JSON.stringify(selectedJob.stats, null, 2)}</pre>
                                </div>
                            )}
                        </div>

                        <div className="border rounded-lg bg-gray-900 text-gray-100 p-4 font-mono text-xs overflow-y-auto max-h-[400px]">
                            {selectedJob.logs && selectedJob.logs.map((log, i) => (
                                <div key={i} className="border-b border-gray-800 last:border-0 py-0.5">{log}</div>
                            ))}
                            {(!selectedJob.logs || selectedJob.logs.length === 0) && (
                                <div className="text-gray-500 italic">No logs recorded.</div>
                            )}
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default JobHistory;
