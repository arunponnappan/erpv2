import { useNavigate } from 'react-router-dom';
import { Search, Home, ArrowLeft } from 'lucide-react';

const NotFoundPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-gray-50 dark:bg-neutral-900">
            {/* Animated Illustration */}
            <div className="relative mb-8 group cursor-default">
                {/* Pulse Effect */}
                <div className="absolute inset-0 bg-blue-100 rounded-full scale-125 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100"></div>

                {/* Main Icon Circle */}
                <div className="relative w-32 h-32 bg-white text-blue-500 rounded-full flex items-center justify-center shadow-xl border-4 border-blue-50 dark:bg-neutral-800 dark:text-blue-400 dark:border-neutral-700 animate-float">
                    <span className="text-5xl font-bold">404</span>
                </div>

                {/* Orbiting Elements */}
                <div className="absolute top-0 right-0 animate-orbit-slow">
                    <div className="p-2 bg-yellow-100 text-yellow-600 rounded-full shadow-sm dark:bg-yellow-900/30 dark:text-yellow-400">
                        <Search size={20} />
                    </div>
                </div>
                <div className="absolute bottom-2 left-0 animate-orbit-reverse">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                </div>
            </div>

            {/* Content */}
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Page Not Found
            </h1>
            <p className="text-gray-500 dark:text-neutral-400 mb-8 max-w-sm mx-auto text-base">
                We couldn't find the page you searched for. It might have been moved, renamed, or deleted.
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-medium shadow-sm hover:bg-gray-50 transition-colors dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-700"
                >
                    <ArrowLeft size={18} />
                    Go Back
                </button>

                <button
                    onClick={() => navigate('/')}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:-translate-y-0.5 transition-all"
                >
                    <Home size={18} />
                    Return Home
                </button>
            </div>

            {/* Animations */}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }
                @keyframes orbit-slow {
                    0% { transform: translate(0, 0) rotate(0deg); }
                    100% { transform: translate(10px, -10px) rotate(360deg); }
                }
                @keyframes orbit-reverse {
                    0% { transform: translate(0, 0); }
                    50% { transform: translate(-5px, 5px); }
                    100% { transform: translate(0, 0); }
                }
                .animate-float { animation: float 6s ease-in-out infinite; }
                .animate-orbit-slow { animation: orbit-slow 8s linear infinite; }
                .animate-orbit-reverse { animation: orbit-reverse 4s ease-in-out infinite; }
            `}</style>
        </div>
    );
};

export default NotFoundPage;
