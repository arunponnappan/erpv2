import React from 'react';
import { useMondayStore } from '../../store/mondayStore';
import { colors, spacing, transitions } from '../../utils/designTokens';

/**
 * Main layout wrapper for Monday app
 * Provides the overall structure with sidebar and main content area
 */
const MondayLayout = ({ children, sidebar, header }) => {
    const { sidebarCollapsed } = useMondayStore();

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
            {/* Sidebar */}
            {sidebar && (
                <aside
                    className="flex-shrink-0 transition-all duration-300 ease-in-out"
                    style={{
                        width: sidebarCollapsed ? '80px' : '280px',
                        transition: `width ${transitions.base}`,
                    }}
                >
                    {sidebar}
                </aside>
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                {header && (
                    <header className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        {header}
                    </header>
                )}

                {/* Main Content */}
                <main className="flex-1 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default MondayLayout;
