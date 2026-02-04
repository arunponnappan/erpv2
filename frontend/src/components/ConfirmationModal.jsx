import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', destructive = false }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="flex flex-col gap-4">
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full ${destructive ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30'}`}>
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <p className="text-gray-800 dark:text-gray-200 mt-1">
                            {message}
                        </p>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-4">
                    <button
                        onClick={onClose}
                        className="py-2.5 px-4 rounded-lg font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => { onConfirm(); onClose(); }}
                        className={`py-2.5 px-4 rounded-lg font-medium text-white transition-colors ${destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ConfirmationModal;
