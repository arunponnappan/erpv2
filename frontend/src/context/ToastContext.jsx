import { createContext, useContext, useState } from 'react';
import Toast from '../components/Toast';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = (type, title, message, duration) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, type, title, message, duration }]);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const toast = {
        success: (title, message, duration) => addToast('success', title, message, duration),
        error: (title, message, duration) => addToast('error', title, message, duration),
        info: (title, message, duration) => addToast('info', title, message, duration)
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className="fixed top-5 right-5 z-[100] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
                {toasts.map(t => (
                    <Toast
                        key={t.id}
                        {...t}
                        onClose={() => removeToast(t.id)}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => useContext(ToastContext);
