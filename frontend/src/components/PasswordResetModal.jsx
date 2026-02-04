import React, { useState } from 'react';
import Modal from './Modal';
import { Lock, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const PasswordResetModal = ({ isOpen, onClose, user, onSuccess }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const toast = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError("Password must be at least 6 characters long.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        try {
            setLoading(true);
            await api.patch(`/users/${user.id}`, { password });
            onSuccess();
            onClose();
            setPassword('');
            setConfirmPassword('');
            toast.success("Password Reset", `Password for ${user.full_name || user.username} has been reset.`);
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to reset password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Reset Password for ${user?.full_name || 'User'}`}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/50 rounded-lg p-3 text-sm text-yellow-800 dark:text-yellow-200 flex gap-2">
                    <Lock size={16} className="mt-0.5 shrink-0" />
                    <p>This will immediately override the current password. The user will need the new password to log in.</p>
                </div>

                {error && (
                    <div className="p-3 rounded-lg bg-red-100 text-red-700 text-sm">
                        {error}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-white">New Password</label>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            className="py-2 px-3 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400"
                            placeholder="Enter new password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-neutral-200"
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-white">Confirm Password</label>
                    <input
                        type={showPassword ? "text" : "password"}
                        className="py-2 px-3 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400"
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-800"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600"
                    >
                        {loading ? 'Resetting...' : 'Reset Password'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default PasswordResetModal;
