import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center w-full h-full bg-black/50 backdrop-blur-sm p-4 overflow-x-hidden overflow-y-auto">
            <div className="w-full max-w-lg bg-white border border-gray-200 rounded-xl shadow-lg dark:bg-neutral-800 dark:border-neutral-700 flex flex-col pointer-events-auto">
                <div className="flex justify-between items-center py-3 px-4 border-b dark:border-neutral-700">
                    <h3 className="font-bold text-gray-800 dark:text-white">
                        {title}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex justify-center items-center h-8 w-8 text-sm font-semibold rounded-lg border border-transparent text-gray-800 hover:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none dark:text-white dark:hover:bg-neutral-700 dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="p-4 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
