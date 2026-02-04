import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Shield, Edit2, Trash2, Check, X, AlertCircle } from 'lucide-react';
import { useLayout } from '../context/LayoutContext';
import Breadcrumb from '../components/Breadcrumb';
import { useCompany } from '../context/CompanyContext';
import { useToast } from '../context/ToastContext';
import ConfirmationModal from '../components/ConfirmationModal';

const RolesPermissions = () => {
    const { setHeader } = useLayout();
    const { currentCompany } = useCompany();
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, roleId: null });
    const toast = useToast();

    // Form State
    const [roleName, setRoleName] = useState('');
    const [roleDesc, setRoleDesc] = useState('');
    const [selectedPerms, setSelectedPerms] = useState(new Set());
    const [error, setError] = useState(null);

    useEffect(() => {
        setHeader(
            <Breadcrumb items={[{ label: 'System' }, { label: 'Roles & Permissions' }]} />,
            <button
                onClick={() => openModal()}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
                <Plus size={18} />
                Create Role
            </button>
        );
        fetchData();
    }, [currentCompany, setHeader]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [rolesRes, permsRes] = await Promise.all([
                api.get('/roles', { params: { company_id: currentCompany?.id } }),
                api.get('/permissions')
            ]);
            setRoles(rolesRes.data);
            setPermissions(permsRes.data);
        } catch (err) {
            console.error("Failed to fetch RBAC data", err);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (role = null) => {
        if (role) {
            setEditingRole(role);
            setRoleName(role.name);
            setRoleDesc(role.description || '');
            // Extract IDs from role.permissions objects
            const ids = new Set(role.permissions.map(p => p.id));
            setSelectedPerms(ids);
        } else {
            setEditingRole(null);
            setRoleName('');
            setRoleDesc('');
            setSelectedPerms(new Set());
        }
        setError(null);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        const payload = {
            name: roleName,
            description: roleDesc,
            permission_ids: Array.from(selectedPerms)
        };

        try {
            if (editingRole) {
                await api.put(`/roles/${editingRole.id}`, payload);
            } else {
                await api.post('/roles', payload);
            }
            setIsModalOpen(false);
            fetchData();
            toast.success("Success", editingRole ? "Role updated successfully" : "Role created successfully");
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to save role");
            toast.error("Error", "Failed to save role");
        }
    };

    const handleDeleteClick = (id) => {
        setDeleteModal({ isOpen: true, roleId: id });
    };

    const confirmDelete = async () => {
        const { roleId } = deleteModal;
        if (!roleId) return;

        try {
            await api.delete(`/roles/${roleId}`);
            fetchData();
            toast.success("Success", "Role deleted successfully");
        } catch (err) {
            toast.error("Error", err.response?.data?.detail || "Delete failed");
        } finally {
            setDeleteModal({ isOpen: false, roleId: null });
        }
    };

    const togglePerm = (id) => {
        const newSet = new Set(selectedPerms);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedPerms(newSet);
    };

    // Group Permissions by Module
    const groupedPerms = permissions.reduce((acc, p) => {
        if (!acc[p.module]) acc[p.module] = [];
        acc[p.module].push(p);
        return acc;
    }, {});

    if (loading) return <div className="p-8 text-center text-gray-500">Loading RBAC details...</div>;

    return (
        <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-4">
            {/* Roles List */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.map(role => (
                    <div key={role.id} className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                                <Shield className="text-blue-600" size={20} />
                                <h3 className="font-bold text-lg text-gray-800 dark:text-white">{role.name}</h3>
                            </div>
                            {role.is_system_role ? (
                                <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-full uppercase font-bold tracking-wide">System</span>
                            ) : (
                                <div className="flex gap-1">
                                    <button onClick={() => openModal(role)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDeleteClick(role.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 h-10 line-clamp-2">
                            {role.description || "No description provided."}
                        </p>
                        <div className="border-t border-gray-100 dark:border-neutral-700 pt-3">
                            <div className="text-xs uppercase text-gray-400 font-semibold mb-2">Permissions</div>
                            <div className="flex flex-wrap gap-1.5">
                                {role.permissions.slice(0, 5).map(p => (
                                    <span key={p.id} className="text-xs bg-gray-50 dark:bg-neutral-700 text-gray-600 dark:text-neutral-300 px-2 py-0.5 rounded border border-gray-200 dark:border-neutral-600">
                                        {p.name}
                                    </span>
                                ))}
                                {role.permissions.length > 5 && (
                                    <span className="text-xs text-gray-400 px-1">+{role.permissions.length - 5} more</span>
                                )}
                                {role.permissions.length === 0 && (
                                    <span className="text-xs text-gray-400 italic">No permissions assigned</span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                                {editingRole ? 'Edit Role' : 'Create New Role'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto flex-1">
                            {error && (
                                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                                    <AlertCircle size={18} />
                                    {error}
                                </div>
                            )}

                            <form id="roleForm" onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={roleName}
                                            onChange={(e) => setRoleName(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                                            placeholder="e.g. HR Manager"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                                        <input
                                            type="text"
                                            value={roleDesc}
                                            onChange={(e) => setRoleDesc(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                                            placeholder="Role responsibility summary"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Permissions Matrix</label>
                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {Object.entries(groupedPerms).map(([module, perms]) => (
                                            <div key={module} className="border border-gray-200 dark:border-neutral-700 rounded-lg p-4 bg-gray-50/50 dark:bg-neutral-800/50">
                                                <h4 className="font-semibold text-gray-700 dark:text-gray-200 capitalize mb-3 border-b border-gray-200 dark:border-neutral-700 pb-2">
                                                    {module}
                                                </h4>
                                                <div className="space-y-2">
                                                    {perms.map(p => (
                                                        <label key={p.id} className="flex items-start gap-2 cursor-pointer group">
                                                            <div className="relative flex items-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedPerms.has(p.id)}
                                                                    onChange={() => togglePerm(p.id)}
                                                                    className="peer h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                                />
                                                            </div>
                                                            <span className="text-sm text-gray-600 dark:text-gray-300 group-hover:text-gray-900 transition-colors">
                                                                {p.name}
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-neutral-700 flex justify-end gap-3 bg-gray-50 dark:bg-neutral-900 rounded-b-xl">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg dark:text-gray-300 dark:hover:bg-neutral-700"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="roleForm"
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-2"
                            >
                                <Check size={18} />
                                Save Role
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                onConfirm={confirmDelete}
                title="Delete Role"
                message="Are you sure you want to delete this role? This action cannot be undone."
                confirmText="Delete"
                destructive={true}
            />
        </div>
    );
};

export default RolesPermissions;
