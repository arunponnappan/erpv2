import React from 'react';
import { FiLoader } from 'react-icons/fi';

/**
 * Reusable loading state component
 */
export const LoadingState = ({ message = 'Loading...', size = 'md' }) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
    };

    return (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-4">
            <FiLoader className={`${sizeClasses[size]} animate-spin text-primary-600`} />
            <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
        </div>
    );
};

/**
 * Reusable empty state component
 */
export const EmptyState = ({
    icon: Icon,
    title,
    description,
    action
}) => {
    return (
        <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-4 p-8">
            {Icon && (
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Icon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
            )}
            <div className="text-center max-w-md">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {title}
                </h3>
                {description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {description}
                    </p>
                )}
            </div>
            {action && (
                <div className="mt-4">
                    {action}
                </div>
            )}
        </div>
    );
};

/**
 * Error boundary fallback component
 */
export const ErrorFallback = ({ error, resetErrorBoundary }) => {
    return (
        <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-4 p-8">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
            <div className="text-center max-w-md">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Something went wrong
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {error?.message || 'An unexpected error occurred'}
                </p>
                {resetErrorBoundary && (
                    <button
                        onClick={resetErrorBoundary}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                        Try again
                    </button>
                )}
            </div>
        </div>
    );
};
