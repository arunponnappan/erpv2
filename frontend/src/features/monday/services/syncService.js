import api from '../../../services/api';

/**
 * Enterprise-Grade Monday Sync Service
 * Handles multi-user sync operations with queue management, retry logic, and network resilience
 */
class MondaySyncService {
    constructor() {
        this.activeJobs = new Map(); // jobId -> { boardId, status, retryCount, abortController }
        this.maxRetries = 3;
        this.retryDelay = 2000; // 2 seconds
        this.pollInterval = 2000; // 2 seconds
        this.maxConcurrentJobs = 3; // Limit concurrent syncs per user
    }

    /**
     * Start a sync job with enterprise-grade error handling
     */
    async startSync(boardId, options = {}) {
        const {
            showImages = true,
            optimizeImages = true,
            keepOriginals = true,
            forceSyncImages = false,
            onProgress = null,
            onComplete = null,
            onError = null,
        } = options;

        // Check concurrent job limit
        if (this.activeJobs.size >= this.maxConcurrentJobs) {
            throw new Error(`Maximum ${this.maxConcurrentJobs} concurrent syncs allowed. Please wait for existing jobs to complete.`);
        }

        const abortController = new AbortController();
        let jobId = null;
        let retryCount = 0;

        try {
            // Start sync job
            const response = await this._makeRequest(
                'POST',
                `/integrations/monday/boards/${boardId}/sync`,
                {
                    download_assets: showImages, // Corrected key to match backend
                    optimize_images: optimizeImages,
                    keep_original_images: keepOriginals,
                    force_sync_images: forceSyncImages,
                    filters: options.filters,
                    filtered_item_ids: options.filtered_item_ids,
                },
                abortController.signal
            );

            jobId = response.data.job_id;

            // Track active job
            this.activeJobs.set(jobId, {
                boardId,
                status: 'running',
                retryCount: 0,
                abortController,
            });

            // Poll for job status
            const result = await this._pollJobStatus(jobId, onProgress, abortController.signal);

            // Cleanup
            this.activeJobs.delete(jobId);

            if (onComplete) {
                onComplete(result);
            }

            return result;
        } catch (error) {
            // Cleanup on error
            if (jobId) {
                this.activeJobs.delete(jobId);
            }

            // Retry logic for network errors
            if (this._isRetryableError(error) && retryCount < this.maxRetries) {
                console.warn(`Sync failed, retrying (${retryCount + 1}/${this.maxRetries})...`, error);
                await this._delay(this.retryDelay * Math.pow(2, retryCount)); // Exponential backoff
                return this.startSync(boardId, { ...options, _retryCount: retryCount + 1 });
            }

            if (onError) {
                onError(error);
            }

            throw error;
        }
    }

    /**
     * Poll job status with retry logic
     */
    async _pollJobStatus(jobId, onProgress, signal) {
        let consecutiveErrors = 0;
        const maxConsecutiveErrors = 3;

        while (true) {
            // Check if aborted
            if (signal?.aborted) {
                throw new Error('Sync cancelled by user');
            }

            try {
                const response = await this._makeRequest(
                    'GET',
                    `/integrations/monday/sync/jobs/${jobId}`,
                    null,
                    signal
                );

                const job = response.data;

                // Reset error counter on success
                consecutiveErrors = 0;

                // Update progress callback
                if (onProgress) {
                    onProgress({
                        status: job.status,
                        message: job.progress_message,
                        logs: job.logs || [],
                    });
                }

                // Check job status
                if (job.status === 'complete') {
                    return {
                        success: true,
                        message: job.progress_message || 'Sync completed successfully',
                        logs: job.logs || [],
                    };
                }

                if (job.status === 'failed') {
                    throw new Error(job.progress_message || 'Sync failed');
                }

                // Continue polling for pending/running jobs
                await this._delay(this.pollInterval);
            } catch (error) {
                consecutiveErrors++;

                if (consecutiveErrors >= maxConsecutiveErrors) {
                    throw new Error(`Failed to poll job status after ${maxConsecutiveErrors} attempts: ${error.message}`);
                }

                // Wait before retry
                await this._delay(this.pollInterval);
            }
        }
    }

    /**
     * Cancel a sync job
     */
    async cancelSync(jobId) {
        const job = this.activeJobs.get(jobId);
        if (job) {
            job.abortController.abort();
            this.activeJobs.delete(jobId);
        }
    }

    /**
     * Cancel all active syncs
     */
    cancelAllSyncs() {
        for (const [jobId, job] of this.activeJobs.entries()) {
            job.abortController.abort();
        }
        this.activeJobs.clear();
    }

    /**
     * Get list of sync jobs
     */
    async getJobs(limit = 50) {
        try {
            const response = await api.get(`/integrations/monday/sync/jobs?limit=${limit}`);
            return response.data || [];
        } catch (error) {
            console.error('Failed to fetch jobs:', error);
            return [];
        }
    }

    /**
     * Reset sync queue
     */
    async resetQueue() {
        try {
            await api.post('/integrations/monday/sync/reset-queue');
            this.activeJobs.clear();
        } catch (error) {
            console.error('Failed to reset queue:', error);
            throw error;
        }
    }

    /**
     * Make API request with timeout and retry logic
     */
    async _makeRequest(method, url, data = null, signal = null) {
        const config = {
            method,
            url,
            timeout: 30000, // 30 second timeout
            signal,
        };

        if (data) {
            if (method === 'GET') {
                config.params = data;
            } else {
                config.data = data;
            }
        }

        return await api(config);
    }

    /**
     * Check if error is retryable
     */
    _isRetryableError(error) {
        // Network errors
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            return true;
        }

        // 5xx server errors (except 501 Not Implemented)
        if (error.response?.status >= 500 && error.response?.status !== 501) {
            return true;
        }

        // 429 Too Many Requests
        if (error.response?.status === 429) {
            return true;
        }

        return false;
    }

    /**
     * Delay helper
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get active job count
     */
    getActiveJobCount() {
        return this.activeJobs.size;
    }

    /**
     * Check if board is currently syncing
     */
    isBoardSyncing(boardId) {
        for (const job of this.activeJobs.values()) {
            if (job.boardId === boardId) {
                return true;
            }
        }
        return false;
    }
}

// Export singleton instance
export default new MondaySyncService();
