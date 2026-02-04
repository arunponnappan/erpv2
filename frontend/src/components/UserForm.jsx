import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Loader2 } from 'lucide-react';
import api from '../services/api';

const UserForm = ({ userToEdit, onSubmit, onCancel }) => {
    const { user: currentUser } = useAuth();
    const toast = useToast();
    const [formData, setFormData] = useState({
        username: '',
        full_name: '',
        email: '',
        password: '',
        role: 'internal_user',
        is_active: true
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (userToEdit) {
            setFormData({
                username: userToEdit.username || '',
                full_name: userToEdit.full_name || '',
                email: userToEdit.email || '',
                password: '', // Don't show password
                role: userToEdit.role || 'internal_user',
                status: userToEdit.status || 'active'
            });
        }
    }, [userToEdit]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        await onSubmit(formData);
        setLoading(false);
    };

    const getAvailableRoles = () => {
        const roles = [
            { value: 'internal_user', label: 'Internal User' },
            { value: 'admin', label: 'Admin' },
            { value: 'super_admin', label: 'Super Admin' },
        ];

        if (currentUser.role === 'super_admin') return roles;
        if (currentUser.role === 'admin') return roles.filter(r => r.value !== 'super_admin');

        return [];
    };

    const inputClasses = "py-2.5 px-4 block w-full border-gray-300 bg-gray-50 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 shadow-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 disabled:opacity-50 disabled:pointer-events-none";

    // Add check state
    const [checkingUsername, setCheckingUsername] = useState(false);
    const [usernameAvailable, setUsernameAvailable] = useState(null);
    const [checkError, setCheckError] = useState('');

    const [checkingEmail, setCheckingEmail] = useState(false);
    const [emailAvailable, setEmailAvailable] = useState(null);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (formData.username) checkAvailability();
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [formData.username]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (formData.email) checkEmailAvailability();
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [formData.email]);

    const checkAvailability = async () => {
        if (!formData.username) {
            setCheckError('');
            setUsernameAvailable(null);
            return;
        }
        setCheckError('');
        setUsernameAvailable(null);

        // If editing and username hasn't changed, it's valid
        if (userToEdit && formData.username === userToEdit.username) {
            setUsernameAvailable(true);
            return;
        }

        try {
            setCheckingUsername(true);
            const response = await api.get(`/users/check_username?username=${formData.username}`);
            setUsernameAvailable(response.data.available);
        } catch (error) {
            if (error.response?.status === 409 || error.response?.data?.available === false) {
                setUsernameAvailable(false);
            } else {
                const msg = error.response?.data?.detail || error.message || "Check failed";
                setCheckError(`Error: ${msg}`);
                setUsernameAvailable(null); // Keep as null on error, or false? Null prevents blocking if we want to allow retry.
            }
        } finally {
            setCheckingUsername(false);
        }
    };

    const checkEmailAvailability = async () => {
        if (!formData.email) {
            setEmailAvailable(null);
            return;
        }
        setEmailAvailable(null);

        if (userToEdit && formData.email === userToEdit.email) {
            setEmailAvailable(true);
            return;
        }

        try {
            setCheckingEmail(true);
            const response = await api.get(`/users/check_email?email=${formData.email}`);
            setEmailAvailable(response.data.available);
        } catch (error) {
            if (error.response?.status === 409 || error.response?.data?.available === false) {
                setEmailAvailable(false);
            } else {
                setEmailAvailable(null);
            }
        } finally {
            setCheckingEmail(false);
        }
    };

    const isFormValid = !checkingUsername && !checkingEmail &&
        (usernameAvailable !== false) &&
        (emailAvailable !== false);

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-800 dark:text-gray-200">Username</label>
                <div className="relative">
                    <input
                        type="text"
                        required
                        value={formData.username}
                        onChange={e => {
                            const val = e.target.value;
                            // Regex: Allow only alphanumeric
                            if (/^[a-zA-Z0-9]*$/.test(val)) {
                                setFormData({ ...formData, username: val });
                                setCheckError(''); // Clear previous errors
                                setUsernameAvailable(null);
                            }
                            // If user tries to type invalid char, we can either ignore it (input masking) 
                            // or allow it and show error. 
                            // User request: "only alphanumeric... is ok". 
                            // Input masking (preventing typing) is often cleaner for this specific rule.
                            // I will use input masking here as implemented above (only update if test passes).
                        }}
                        className={`${inputClasses} ${usernameAvailable === true ? 'border-green-500 focus:border-green-500' : usernameAvailable === false ? 'border-red-500 focus:border-red-500' : ''}`}
                        placeholder="jdoe"
                        title="Only alphanumeric characters allowed"
                    />
                    <div className="absolute right-3 top-2.5 text-gray-400">
                        {checkingUsername && <Loader2 className="animate-spin" size={16} />}
                        {!checkingUsername && usernameAvailable === true && <span className="text-green-500 text-xs font-bold">✓</span>}
                        {!checkingUsername && usernameAvailable === false && <span className="text-red-500 text-xs font-bold">✕</span>}
                    </div>
                </div>
                {usernameAvailable === false && <span className="text-xs text-red-500">Username is already taken.</span>}
                {usernameAvailable === true && <span className="text-xs text-green-500">Username is available.</span>}
                {checkError && <span className="text-xs text-red-500">{checkError}</span>}
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-800 dark:text-gray-200">Full Name</label>
                <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                    className={inputClasses}
                />
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-800 dark:text-gray-200">Email Address</label>
                <div className="relative">
                    <input
                        type="email"
                        value={formData.email}
                        onChange={e => {
                            setFormData({ ...formData, email: e.target.value });
                            setEmailAvailable(null);
                        }}
                        className={`${inputClasses} ${emailAvailable === true ? 'border-green-500 focus:border-green-500' : emailAvailable === false ? 'border-red-500 focus:border-red-500' : ''}`}
                    />
                    <div className="absolute right-3 top-2.5 text-gray-400">
                        {checkingEmail && <Loader2 className="animate-spin" size={16} />}
                        {!checkingEmail && emailAvailable === true && <span className="text-green-500 text-xs font-bold">✓</span>}
                        {!checkingEmail && emailAvailable === false && <span className="text-red-500 text-xs font-bold">✕</span>}
                    </div>
                </div>
                {emailAvailable === false && <span className="text-xs text-red-500">Email is already registered.</span>}
            </div>

            {!userToEdit && (
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-800 dark:text-gray-200">Password</label>
                    <input
                        type="password"
                        required={!userToEdit}
                        minLength={6}
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        className={inputClasses}
                        placeholder={userToEdit ? "Leave blank to keep current" : ""}
                    />
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-800 dark:text-gray-200">Role</label>
                    <select
                        value={formData.role}
                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                        className={inputClasses}
                    >
                        {getAvailableRoles().map(role => (
                            <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                    </select>
                </div>

                {userToEdit && (
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-800 dark:text-gray-200">Account Status</label>
                        <select
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                            className={inputClasses}
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="suspended">Suspended</option>
                            <option value="pending">Pending</option>
                        </select>
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-3 mt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="py-2.5 px-4 rounded-lg font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                    Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading || !isFormValid}>
                    {loading ? <Loader2 className="animate-spin" size={16} /> : (userToEdit ? 'Save Changes' : 'Create User')}
                </button>
            </div>
        </form>
    );
};

export default UserForm;
