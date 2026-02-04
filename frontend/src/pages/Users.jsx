import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { useLayout } from '../context/LayoutContext';
import { useToast } from '../context/ToastContext';
import {
    Plus, Pencil, Trash2, Search, History,
    ArrowUpDown, ChevronUp, ChevronDown,
    CheckCircle, XCircle, Filter, LayoutGrid, LayoutList,
    User, Mail, ShieldCheck, Clock, Lock
} from 'lucide-react';
import Modal from '../components/Modal';
import UserForm from '../components/UserForm';
import LoginHistoryModal from '../components/LoginHistoryModal';
import PasswordResetModal from '../components/PasswordResetModal';
import ConfirmationModal from '../components/ConfirmationModal';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [historyUserId, setHistoryUserId] = useState(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [resetUser, setResetUser] = useState(null); // User to reset password for
    const [isResetOpen, setIsResetOpen] = useState(false);

    // Modal State
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, userId: null });

    // UI State
    const [viewMode, setViewMode] = useState('grid');
    const [showFilters, setShowFilters] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();

    const { user: currentUser } = useAuth();
    const { currentCompany } = useCompany();
    const { setHeader } = useLayout();
    const toast = useToast();

    // Filter & Sort State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [sortBy, setSortBy] = useState('name_asc');

    useEffect(() => {
        if (currentCompany) {
            fetchUsers();
        }
    }, [currentCompany]);

    // Handle Quick Action from Sidebar or URL
    useEffect(() => {
        if (searchParams.get('action') === 'create') {
            if (canCreate) {
                handleCreateClick();
                // Clear param so it doesn't reopen on refresh/nav
                setSearchParams({});
            }
        }
    }, [searchParams]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await api.get('/users/', {
                params: { company_id: currentCompany?.id }
            });
            setUsers(response.data);
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateClick = () => {
        setEditingUser(null);
        setIsModalOpen(true);
    };

    const handleEditClick = (user) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleHistoryClick = (userId) => {
        setHistoryUserId(userId);
        setIsHistoryOpen(true);
    };

    const handleDeleteClick = (id) => {
        setDeleteModal({ isOpen: true, userId: id });
    };

    const confirmDelete = async () => {
        const { userId } = deleteModal;
        if (!userId) return;

        try {
            await api.delete(`/users/${userId}`);
            toast.success("User Deleted", "The user has been successfully removed.");
            fetchUsers();
        } catch (error) {
            toast.error("Delete Failed", error.response?.data?.detail || "Could not delete user.");
        } finally {
            setDeleteModal({ isOpen: false, userId: null });
        }
    };

    const handleFormSubmit = async (formData) => {
        try {
            if (editingUser) {
                await api.patch(`/users/${editingUser.id}`, formData);
                toast.success("User Updated", "User details have been saved.");
            } else {
                await api.post('/users/', { ...formData, company_id: currentCompany?.id });
                toast.success("User Created", "New user has been successfully added.");
            }
            setIsModalOpen(false);
            fetchUsers();
        } catch (error) {
            toast.error("Operation Failed", error.response?.data?.detail || "Could not save user.");
        }
    };

    const canCreate = ['super_admin', 'admin', 'manager'].includes(currentUser?.role);

    // --- Header Configuration ---
    useEffect(() => {
        const searchInput = (
            <div className="relative w-full max-w-md hidden sm:block">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="w-4 h-4 text-gray-400" />
                </div>
                <input
                    type="text"
                    className="py-2 px-4 pl-10 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none bg-gray-50 focus:bg-white dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600 transition-all"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        );

        const actions = (
            <div className="flex items-center gap-2">
                <div className="flex bg-gray-100 dark:bg-neutral-700 rounded-lg p-1 border border-gray-200 dark:border-neutral-600 items-center">
                    {canCreate && (
                        <>
                            <button
                                onClick={handleCreateClick}
                                className="p-1.5 rounded-md text-gray-500 hover:text-blue-600 hover:bg-white dark:hover:bg-neutral-600 dark:text-neutral-400 dark:hover:text-blue-400 transition-all shadow-none hover:shadow-sm"
                                title="Add User"
                            >
                                <Plus size={18} />
                            </button>
                            <div className="w-px h-4 bg-gray-300 dark:bg-neutral-600 mx-1"></div>
                        </>
                    )}

                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-1.5 rounded-md transition-all ${showFilters ? 'bg-white dark:bg-neutral-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-neutral-400'}`}
                        title="Toggle Filters"
                    >
                        <Filter size={18} />
                    </button>

                    <div className="w-px h-4 bg-gray-300 dark:bg-neutral-600 mx-1"></div>

                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-neutral-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-neutral-400'}`}
                        title="Grid View"
                    >
                        <LayoutGrid size={18} />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-neutral-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-neutral-400'}`}
                        title="List View"
                    >
                        <LayoutList size={18} />
                    </button>
                </div>
            </div>
        );

        setHeader(searchInput, actions);
    }, [canCreate, searchTerm, showFilters, viewMode, setHeader]);

    // --- Derived State Logic ---
    const filteredUsers = useMemo(() => {
        let items = [...users];

        // 1. Search
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            items = items.filter(u =>
                (u.full_name || '').toLowerCase().includes(lowerTerm) ||
                (u.email || '').toLowerCase().includes(lowerTerm) ||
                (u.username || '').toLowerCase().includes(lowerTerm)
            );
        }

        // 2. Filter
        if (filterRole !== 'all') {
            items = items.filter(u => u.role === filterRole);
        }

        // 3. Sort
        items.sort((a, b) => {
            if (sortBy === 'name_asc') return (a.full_name || '').localeCompare(b.full_name || '');
            if (sortBy === 'name_desc') return (b.full_name || '').localeCompare(a.full_name || '');
            // Newest based on ID for simplicity? Or created_at if available. Assuming ID proxy for now.
            if (sortBy === 'newest') return b.id - a.id;
            return 0;
        });

        return items;
    }, [users, searchTerm, filterRole, sortBy]);

    // --- Helpers ---
    const getRoleBadgeClasses = (role) => {
        switch (role) {
            case 'super_admin': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
            case 'admin': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            case 'manager': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
            case 'staff': return 'bg-gray-100 text-gray-800 dark:bg-neutral-700 dark:text-neutral-300';
            default: return 'bg-gray-100 text-gray-800 dark:bg-neutral-700 dark:text-neutral-300';
        }
    };

    const getStatusBadge = (status) => {
        if (status === 'active') return <span className="inline-flex items-center gap-x-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400"><CheckCircle size={10} /> Active</span>;
        return <span className="inline-flex items-center gap-x-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"><XCircle size={10} /> Inactive</span>;
    };

    return (
        <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-4">

            {/* Filter Ribbon */}
            {showFilters && (
                <div className="mb-6 bg-white dark:bg-neutral-800 p-4 rounded-xl border border-gray-200 dark:border-neutral-700 shadow-sm animate-fadeIn">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                            <Filter size={16} /> Filter & Sort
                        </h3>
                        {(filterRole !== 'all' || sortBy !== 'name_asc') && (
                            <button
                                onClick={() => { setFilterRole('all'); setSortBy('name_asc'); }}
                                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs font-medium mb-1.5 text-gray-500 dark:text-neutral-400">System Role</label>
                            <div className="relative">
                                <select
                                    className="py-2.5 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600 cursor-pointer"
                                    value={filterRole}
                                    onChange={(e) => setFilterRole(e.target.value)}
                                >
                                    <option value="all">All Roles</option>
                                    <option value="staff">Staff</option>
                                    <option value="manager">Manager</option>
                                    <option value="admin">Admin</option>
                                    <option value="super_admin">Super Admin</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs font-medium mb-1.5 text-gray-500 dark:text-neutral-400">Sort By</label>
                            <div className="relative">
                                <select
                                    className="py-2.5 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600 cursor-pointer"
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                >
                                    <option value="name_asc">Name (A-Z)</option>
                                    <option value="name_desc">Name (Z-A)</option>
                                    <option value="newest">Newest First</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Content Body */}
            {loading ? (
                <div className="text-center py-20">
                    <div className="animate-spin inline-block w-8 h-8 border-[3px] border-current border-t-transparent text-blue-600 rounded-full dark:text-blue-500" role="status" aria-label="loading"></div>
                    <p className="mt-2 text-gray-500 dark:text-neutral-400">Loading users...</p>
                </div>
            ) : filteredUsers.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400 shadow-sm">
                    <User className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-lg font-medium text-gray-900 dark:text-white">No users found</p>
                    <p className="text-sm">Try adjusting your filters.</p>
                </div>
            ) : (
                <>
                    {/* GRID VIEW */}
                    {viewMode === 'grid' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fadeIn">
                            {filteredUsers.map((u) => (
                                <div key={u.id} className="group bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-blue-200 transition-all dark:bg-neutral-800 dark:border-neutral-700 dark:hover:border-neutral-600 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                        {/* Action Buttons */}
                                        {['super_admin', 'admin'].includes(currentUser.role) && (
                                            <button onClick={() => handleHistoryClick(u.id)} className="text-gray-400 hover:text-blue-600 bg-white/50 dark:bg-black/50 p-1.5 rounded-full backdrop-blur-sm" title="History"><History size={14} /></button>
                                        )}
                                        {/* Reset Password */}
                                        {['super_admin', 'admin'].includes(currentUser.role) && (
                                            <button onClick={() => { setResetUser(u); setIsResetOpen(true); }} className="text-gray-400 hover:text-yellow-600 bg-white/50 dark:bg-black/50 p-1.5 rounded-full backdrop-blur-sm" title="Reset Password"><Lock size={14} /></button>
                                        )}
                                        {/* Delete Check */}
                                        {(() => {
                                            if (u.id === currentUser.id || u.role === 'super_admin') return null;
                                            const canDelete = (currentUser.role === 'super_admin') || (currentUser.role === 'admin' && ['manager', 'supervisor', 'staff'].includes(u.role)) || (currentUser.role === 'manager' && ['supervisor', 'staff'].includes(u.role));
                                            return canDelete ? (
                                                <button onClick={() => handleDeleteClick(u.id)} className="text-gray-400 hover:text-red-600 bg-white/50 dark:bg-black/50 p-1.5 rounded-full backdrop-blur-sm" title="Delete"><Trash2 size={14} /></button>
                                            ) : null;
                                        })()}
                                    </div>

                                    <div className="flex items-center gap-4 mb-4" onClick={() => (currentUser.role === 'super_admin' || currentUser.role === 'admin' || currentUser.role === 'manager') && handleEditClick(u)}>
                                        <div className="w-14 h-14 shrink-0 rounded-full bg-gradient-to-br from-indigo-50 to-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl shadow-inner dark:from-indigo-900/40 dark:to-blue-900/40 dark:text-blue-300 cursor-pointer">
                                            {u.full_name?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                        <div className="min-w-0 cursor-pointer">
                                            <h3 className="font-bold text-gray-900 dark:text-white truncate text-base leading-tight mb-1">{u.full_name || 'No Name'}</h3>
                                            <span className={`inline-flex items-center gap-x-1.5 px-2 py-0.5 rounded text-xs font-semibold ${getRoleBadgeClasses(u.role)}`}>
                                                <ShieldCheck size={10} /> {u.role.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 pt-2 border-t border-gray-100 dark:border-neutral-700">
                                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-neutral-400">
                                            <User size={14} className="shrink-0" />
                                            <span className="truncate font-mono text-xs">{u.username}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-neutral-400">
                                            <Mail size={14} className="shrink-0" />
                                            <span className="truncate">{u.email}</span>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex justify-between items-center text-xs text-gray-400">
                                        <span>ID: {u.id}</span>
                                        {getStatusBadge(u.status)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* LIST VIEW */}
                    {viewMode === 'list' && (
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm dark:bg-neutral-800 dark:border-neutral-700 animate-fadeIn">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
                                    <thead className="bg-gray-50 dark:bg-neutral-700">
                                        <tr>
                                            {[
                                                { key: 'full_name', label: 'Name' },
                                                { key: 'username', label: 'Username' },
                                                { key: 'email', label: 'Email' },
                                                { key: 'role', label: 'Role' },
                                                { key: 'status', label: 'Status' },
                                            ].map(col => (
                                                <th key={col.key} scope="col" className="px-6 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-neutral-400">{col.label}</th>
                                            ))}
                                            <th scope="col" className="px-6 py-3 text-end text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-neutral-400">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                                        {filteredUsers.map((u) => (
                                            <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600 dark:bg-neutral-700 dark:text-neutral-200">
                                                            {u.full_name?.[0]?.toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-semibold text-gray-800 dark:text-white">{u.full_name}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-neutral-400 font-mono">{u.username}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-neutral-400">{u.email}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center gap-x-1.5 px-2 py-0.5 rounded text-xs font-semibold ${getRoleBadgeClasses(u.role)}`}>
                                                        {u.role.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(u.status)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-end text-sm font-medium">
                                                    <div className="flex justify-end gap-2">
                                                        {/* Actions Logic replicated from Grid */}
                                                        {/* Edit */}
                                                        {(() => {
                                                            const canEdit = (currentUser.role === 'super_admin') || (currentUser.role === 'admin' && ['manager', 'supervisor', 'staff'].includes(u.role)) || (currentUser.role === 'manager' && ['supervisor', 'staff'].includes(u.role));
                                                            return canEdit ? (
                                                                <button onClick={() => handleEditClick(u)} className="text-blue-600 hover:text-blue-800 dark:text-blue-500 dark:hover:text-blue-400" title="Edit"><Pencil size={18} /></button>
                                                            ) : null;
                                                        })()}
                                                        {/* Reset Password */}
                                                        {['super_admin', 'admin'].includes(currentUser.role) && (
                                                            <button onClick={() => { setResetUser(u); setIsResetOpen(true); }} className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300" title="Reset Password"><Lock size={18} /></button>
                                                        )}
                                                        {/* Delete */}
                                                        {(() => {
                                                            if (u.id === currentUser.id || u.role === 'super_admin') return null;
                                                            const canDelete = (currentUser.role === 'super_admin') || (currentUser.role === 'admin' && ['manager', 'supervisor', 'staff'].includes(u.role)) || (currentUser.role === 'manager' && ['supervisor', 'staff'].includes(u.role));
                                                            return canDelete ? (
                                                                <button onClick={() => handleDeleteClick(u.id)} className="text-gray-400 hover:text-red-600 dark:text-neutral-500 dark:hover:text-red-500" title="Delete"><Trash2 size={18} /></button>
                                                            ) : null;
                                                        })()}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingUser ? "Edit User" : "Create New User"}
            >
                <UserForm
                    userToEdit={editingUser}
                    onSubmit={handleFormSubmit}
                    onCancel={() => setIsModalOpen(false)}
                />
            </Modal>

            <Modal
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                title="Login History"
            >
                <LoginHistoryModal
                    userId={historyUserId}
                    isOpen={isHistoryOpen}
                    onClose={() => setIsHistoryOpen(false)}
                />
            </Modal>

            {/* Password Reset Modal */}
            <PasswordResetModal
                isOpen={isResetOpen}
                onClose={() => setIsResetOpen(false)}
                user={resetUser}
                onSuccess={() => {
                    // Optional: refresh users or show toast
                    setIsResetOpen(false);
                }}
            />

            <ConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                onConfirm={confirmDelete}
                title="Delete User"
                message="Are you sure you want to delete this user?"
                confirmText="Delete"
                destructive={true}
            />
        </div>
    );
};

export default Users;
