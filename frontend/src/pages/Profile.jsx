import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLayout } from '../context/LayoutContext';
import Breadcrumb from '../components/Breadcrumb';
import Modal from '../components/Modal';
import ChangePasswordForm from '../components/ChangePasswordForm';
import { User, Mail, Shield, Calendar, Lock, Camera } from 'lucide-react';

const Profile = () => {
    const { user } = useAuth();
    const { setHeader } = useLayout();
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        setHeader(<Breadcrumb items={[{ label: 'Profile' }]} />);
    }, [setHeader]);

    const handleSuccess = () => {
        setIsModalOpen(false);
    };

    // Helper for initials
    const getInitials = (name) => {
        return name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';
    };

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Identity Card */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-700 overflow-hidden relative group">
                        {/* Banner Background */}
                        <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600"></div>

                        <div className="px-6 pb-6 text-center relative">
                            {/* Avatar */}
                            <div className="relative -mt-16 mb-4 inline-block">
                                <div className="h-32 w-32 rounded-full border-4 border-white dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-md flex items-center justify-center text-4xl font-bold text-gray-700 dark:text-gray-200 uppercase">
                                    {getInitials(user?.full_name)}
                                </div>
                                <button className="absolute bottom-2 right-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100" title="Change Avatar">
                                    <Camera size={16} />
                                </button>
                            </div>

                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                                {user?.full_name}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 font-mono">
                                @{user?.username}
                            </p>

                            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                                <Shield size={12} className="mr-1.5" />
                                {user?.role?.replace(/_/g, ' ').toUpperCase()}
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats or Info could go here */}
                </div>

                {/* Right Column: Details & Settings */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Access & Security Card */}
                    <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-700 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Shield className="text-blue-500" size={20} />
                                Account Details
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email Address</label>
                                <div className="flex items-center gap-3 text-gray-900 dark:text-white font-medium p-3 bg-gray-50 dark:bg-neutral-900/50 rounded-xl border border-gray-100 dark:border-neutral-700/50">
                                    <Mail className="text-gray-400" size={18} />
                                    {user?.email}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Member Since</label>
                                <div className="flex items-center gap-3 text-gray-900 dark:text-white font-medium p-3 bg-gray-50 dark:bg-neutral-900/50 rounded-xl border border-gray-100 dark:border-neutral-700/50">
                                    <Calendar className="text-gray-400" size={18} />
                                    {/* Mock Date if created_at not available */}
                                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Jan 2024'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Security Actions */}
                    <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-700 p-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
                            <Lock className="text-orange-500" size={20} />
                            Security
                        </h3>

                        <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-neutral-700 bg-gray-50/50 dark:bg-neutral-900/30">
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">Password</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Last changed 3 months ago</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
                            >
                                Change Password
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Change Password"
            >
                <ChangePasswordForm
                    onCancel={() => setIsModalOpen(false)}
                    onSuccess={handleSuccess}
                />
            </Modal>
        </div>
    );
};

export default Profile;
