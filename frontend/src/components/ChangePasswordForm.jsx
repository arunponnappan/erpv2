import { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Loader2, CheckCircle2 } from 'lucide-react';

const ChangePasswordForm = ({ onCancel, onSuccess }) => {
    const { user } = useAuth();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setLoading(true);
        try {
            await api.patch(`/users/${user.id}`, { password });
            setIsSuccess(true);
            // Auto close after 2 seconds
            setTimeout(() => {
                onSuccess();
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to update password");
        } finally {
            setLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
                <div className="text-green-500 animate-scale-in">
                    <CheckCircle2 size={64} />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Password Updated!</h3>
                    <p className="text-gray-500 dark:text-gray-400">Your password has been changed successfully.</p>
                </div>

                <style>{`
          @keyframes scaleIn {
            from { transform: scale(0); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          .animate-scale-in {
            animation: scaleIn 0.3s ease-out;
          }
        `}</style>
            </div>
        );
    }

    const inputClasses = "py-2.5 px-4 block w-full border-gray-300 bg-gray-50 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 shadow-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400";

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && <div className="text-red-500 text-sm font-medium">{error}</div>}

            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-800 dark:text-gray-200">New Password</label>
                <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={inputClasses}
                />
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-800 dark:text-gray-200">Confirm Password</label>
                <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className={inputClasses}
                />
            </div>

            <div className="flex justify-end gap-3 mt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="py-2.5 px-4 rounded-lg font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                    Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" size={16} /> : 'Update Password'}
                </button>
            </div>
        </form>
    );
};

export default ChangePasswordForm;
