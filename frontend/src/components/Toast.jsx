import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const Toast = ({ type = 'info', title, message, onClose, duration = 5000 }) => {
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                handleClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300);
    };

    const icons = {
        success: CheckCircle,
        error: AlertCircle,
        info: Info
    };
    const Icon = icons[type];

    const typeClasses = {
        success: 'text-teal-500 dark:text-teal-400',
        error: 'text-red-500 dark:text-red-400',
        info: 'text-blue-500 dark:text-blue-400'
    };

    return (
        <div className={`pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 transition-all duration-300 dark:bg-neutral-800 dark:ring-white/10 ${isClosing ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}>
            <div className="p-4">
                <div className="flex items-start">
                    <div className={`shrink-0 ${typeClasses[type]}`}>
                        <Icon size={20} />
                    </div>
                    <div className="ml-3 w-0 flex-1 pt-0.5">
                        {title && <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">{title}</p>}
                        <p className="text-sm text-gray-500 dark:text-neutral-400">{message}</p>
                    </div>
                    <div className="ml-4 flex shrink-0">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="inline-flex rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-neutral-800 dark:text-neutral-500 dark:hover:text-neutral-400"
                        >
                            <span className="sr-only">Close</span>
                            <X size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Toast;
