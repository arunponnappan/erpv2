import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

const UnauthorizedPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center">
            {/* Animated Icon Container */}
            <div className="relative mb-8 group cursor-default">
                <div className="absolute inset-0 bg-red-100 rounded-full scale-110 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                <div className="relative relative w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center animate-bounce-slight shadow-sm border border-red-100 dark:bg-red-900/10 dark:text-red-400 dark:border-red-900/20">
                    <ShieldAlert size={48} className="drop-shadow-sm" />
                </div>

                {/* Floating particles (simulated with dots) */}
                <div className="absolute top-0 right-0 w-3 h-3 bg-red-400 rounded-full animate-ping opacity-75"></div>
                <div className="absolute bottom-2 left-2 w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
            </div>

            {/* Text Content */}
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">
                Access Denied
            </h1>
            <p className="text-gray-500 dark:text-neutral-400 mb-8 max-w-md mx-auto text-lg">
                You don't have permission to access this area. <br />
                Please contact your administrator if you believe this is a mistake.
            </p>

            {/* Interactive Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-gray-200 text-gray-700 font-medium shadow-sm hover:shadow-md hover:bg-gray-50 focus:ring-2 focus:ring-gray-200 transition-all dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-700"
                >
                    <ArrowLeft size={18} />
                    Go Back
                </button>

                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-medium shadow-lg shadow-red-500/30 hover:shadow-red-500/40 hover:-translate-y-0.5 focus:ring-2 focus:ring-red-500/50 transition-all"
                >
                    <Home size={18} />
                    Return Home
                </button>
            </div>

            {/* Visual Flair in Background */}
            <style>{`
                @keyframes bounce-slight {
                    0%, 100% { transform: translateY(-5%); }
                    50% { transform: translateY(5%); }
                }
                .animate-bounce-slight {
                    animation: bounce-slight 3s infinite ease-in-out;
                }
            `}</style>
        </div>
    );
};

export default UnauthorizedPage;
