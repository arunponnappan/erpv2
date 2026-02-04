import React from 'react';

const MarketplaceAppCard = ({ app, isInstalled, installAppId, isInstalling, onInstall, onUninstall, onConfigure, onUpdate, userRole }) => {
    const hasPermission = ['admin', 'super_admin'].includes(userRole);

    return (
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 flex flex-col overflow-hidden h-full group">
            <div className="p-6 flex-grow flex flex-col">
                <div className="flex justify-between items-start mb-4">
                    <div className="w-14 h-14 rounded-xl bg-gray-50 p-2 flex items-center justify-center border border-gray-100 group-hover:border-indigo-100 transition-colors">
                        <img
                            src={app.icon_url}
                            alt={app.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "https://cdn-icons-png.flaticon.com/512/3676/3676655.png";
                            }}
                        />
                    </div>
                    {isInstalled && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                            <svg className="-ml-0.5 mr-1.5 h-2 w-2 text-green-500" fill="currentColor" viewBox="0 0 8 8">
                                <circle cx="4" cy="4" r="3" />
                            </svg>
                            Installed
                        </span>
                    )}
                </div>

                <div className="mb-1">
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                        {app.name}
                    </h3>
                    <div className="flex items-center text-xs text-gray-500 space-x-2 mt-1">
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">v{app.version}</span>
                        <span>•</span>
                        <span>by {app.developer}</span>
                    </div>
                </div>

                <p className="mt-3 text-sm text-gray-600 line-clamp-3 leading-relaxed">
                    {app.description}
                </p>

                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
                    <span className="capitalize bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{app.category}</span>
                    {app.is_active ? (
                        <span className="text-green-600 flex items-center bg-green-50 px-2 py-0.5 rounded-full">
                            Verified
                        </span>
                    ) : (
                        <span>Beta</span>
                    )}
                </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
                {isInstalled ? (
                    <div className="grid grid-cols-2 gap-3">
                        {onConfigure ? (
                            <button
                                onClick={() => onConfigure(installAppId)}
                                className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                            >
                                Configure
                            </button>
                        ) : (
                            <button
                                onClick={() => onUpdate && onUpdate(app.id, installAppId)}
                                disabled={isInstalling}
                                className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                            >
                                {isInstalling ? 'Updating...' : 'Update'}
                            </button>
                        )}
                        <button
                            onClick={() => onUninstall(app.id, installAppId)}
                            disabled={isInstalling}
                            className={`w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors ${isInstalling ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isInstalling ? '...' : 'Uninstall'}
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => onInstall(app.id)}
                        disabled={isInstalling || (app.installable === false) || !hasPermission}
                        className={`w-full inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white transition-all duration-200
                            ${isInstalling || (app.installable === false) || !hasPermission
                                ? 'bg-gray-300 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 hover:shadow-lg transform hover:-translate-y-0.5'
                            }`}
                    >
                        {isInstalling ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Installing...
                            </>
                        ) : !hasPermission ? (
                            'Admin Access Required'
                        ) : (
                            'Install App'
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

export default MarketplaceAppCard;
