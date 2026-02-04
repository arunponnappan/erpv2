import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLayout } from '../context/LayoutContext';
import { useCompany } from '../context/CompanyContext';
import { useToast } from '../context/ToastContext';
import {
    Plus, Search, Building2, User, Phone, Mail,
    Pencil, Trash2, LayoutGrid, LayoutList,
    Filter, ArrowUpDown, ShieldCheck
} from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';

const Employees = () => {
    const { user: currentUser } = useAuth();
    const { currentCompany } = useCompany();
    const { setHeader } = useLayout();
    const toast = useToast();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [employeeToDelete, setEmployeeToDelete] = useState(null);

    // Handle Quick Action
    useEffect(() => {
        if (searchParams.get('action') === 'create') {
            navigate('/employees/new');
        }
    }, [searchParams, navigate]);

    // Features State
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filterDept, setFilterDept] = useState('all');
    const [sortBy, setSortBy] = useState('name_asc'); // 'name_asc', 'name_desc', 'newest'

    useEffect(() => {
        if (currentCompany?.id) {
            fetchEmployees();
        }
    }, [currentCompany?.id]);

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/hr/employees/?company_id=${currentCompany.id}`);
            setEmployees(response.data);
        } catch (error) {
            console.error("Failed to fetch employees", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (id) => {
        setEmployeeToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!employeeToDelete) return;
        try {
            await api.delete(`/hr/employees/${employeeToDelete}`);
            toast.success("Employee Deleted", "Employee has been removed successfully.");
            fetchEmployees();
        } catch (error) {
            console.error("Delete failed", error);
            toast.error("Delete Failed", "Failed to delete employee.");
        }
    };

    const getDepartmentName = (dept) => dept ? dept.name : 'Unassigned';

    // Header Configuration
    useEffect(() => {
        const canEdit = ['super_admin', 'admin', 'manager'].includes(currentUser?.role);

        // Search Bar for Header
        const searchInput = (
            <div className="relative w-full max-w-md hidden sm:block">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="w-4 h-4 text-gray-400" />
                </div>
                <input
                    type="text"
                    className="py-2 px-4 pl-10 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none bg-gray-50 focus:bg-white dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600 transition-all"
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        );

        const actions = (
            <div className="flex items-center gap-2">
                <div className="flex bg-gray-100 dark:bg-neutral-700 rounded-lg p-1 border border-gray-200 dark:border-neutral-600 items-center">
                    {canEdit && (
                        <>
                            <button
                                onClick={() => navigate('/employees/new')}
                                className="p-1.5 rounded-md text-gray-500 hover:text-blue-600 hover:bg-white dark:hover:bg-neutral-600 dark:text-neutral-400 dark:hover:text-blue-400 transition-all shadow-none hover:shadow-sm"
                                title="Add Employee"
                            >
                                <Plus size={18} />
                            </button>
                            <div className="w-px h-4 bg-gray-300 dark:bg-neutral-600 mx-1"></div>
                        </>
                    )}

                    {/* Filter Toggle */}
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
    }, [currentUser, navigate, viewMode, searchTerm, showFilters, setHeader]);

    // Derived State Logic
    const filteredEmployees = useMemo(() => {
        let result = [...employees];

        // 1. Search
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(emp =>
                emp.first_name.toLowerCase().includes(lowerTerm) ||
                emp.last_name.toLowerCase().includes(lowerTerm) ||
                emp.work_email?.toLowerCase().includes(lowerTerm) ||
                emp.employee_id?.toLowerCase().includes(lowerTerm)
            );
        }

        // 2. Filter by Dept
        if (filterDept !== 'all') {
            result = result.filter(emp => emp.department_id === parseInt(filterDept));
        }

        // 3. Sort
        result.sort((a, b) => {
            if (sortBy === 'name_asc') return a.first_name.localeCompare(b.first_name);
            if (sortBy === 'name_desc') return b.first_name.localeCompare(a.first_name);
            if (sortBy === 'newest') return new Date(b.joining_date) - new Date(a.joining_date);
            return 0;
        });

        return result;
    }, [employees, searchTerm, filterDept, sortBy]);

    // Extract unique departments for filter
    const departments = useMemo(() => {
        const depts = new Map();
        employees.forEach(e => {
            if (e.department) depts.set(e.department.id, e.department.name);
        });
        return Array.from(depts.entries()).map(([id, name]) => ({ id, name }));
    }, [employees]);

    const canManage = ['super_admin', 'admin'].includes(currentUser?.role);

    return (
        <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-4">

            {/* Filter Ribbon */}
            {showFilters && (
                <div className="mb-6 bg-white dark:bg-neutral-800 p-4 rounded-xl border border-gray-200 dark:border-neutral-700 shadow-sm animate-fadeIn">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                            <Filter size={16} /> Filter & Sort
                        </h3>
                        {/* Clear Filters (Optional) */}
                        {(filterDept !== 'all' || sortBy !== 'name_asc') && (
                            <button
                                onClick={() => { setFilterDept('all'); setSortBy('name_asc'); }}
                                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-4">
                        {/* Dept Filter */}
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs font-medium mb-1.5 text-gray-500 dark:text-neutral-400">Department</label>
                            <div className="relative">
                                <select
                                    className="py-2.5 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600 cursor-pointer"
                                    value={filterDept}
                                    onChange={(e) => setFilterDept(e.target.value)}
                                >
                                    <option value="all">All Departments</option>
                                    {departments.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Sort */}
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

            {/* Content Area */}
            {loading ? (
                <div className="text-center py-20">
                    <div className="animate-spin inline-block w-8 h-8 border-[3px] border-current border-t-transparent text-blue-600 rounded-full dark:text-blue-500" role="status" aria-label="loading"></div>
                    <p className="mt-2 text-gray-500 dark:text-neutral-400">Loading directory...</p>
                </div>
            ) : filteredEmployees.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400 shadow-sm">
                    <User className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-lg font-medium text-gray-900 dark:text-white">No employees found</p>
                    <p className="text-sm">Try adjusting your search or filters.</p>
                </div>
            ) : (
                <>
                    {/* GRID VIEW */}
                    {viewMode === 'grid' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fadeIn">
                            {filteredEmployees.map((emp) => (
                                <div
                                    key={emp.id}
                                    className="group bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-blue-200 transition-all cursor-pointer dark:bg-neutral-800 dark:border-neutral-700 dark:hover:border-neutral-600 relative overflow-hidden"
                                    onClick={() => navigate(`/employees/${emp.id}`)}
                                >
                                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {canManage && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteClick(emp.id);
                                                }}
                                                className="text-gray-400 hover:text-red-600 transition-colors bg-white/50 dark:bg-black/50 rounded-full p-1.5 backdrop-blur-sm"
                                                title="Delete Employee"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-4 mb-5">
                                        <div className="w-14 h-14 shrink-0 rounded-full bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-600 flex items-center justify-center font-bold text-xl shadow-inner dark:from-blue-900/40 dark:to-indigo-900/40 dark:text-blue-300">
                                            {emp.first_name[0]}{emp.last_name[0]}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-gray-900 dark:text-white truncate text-base leading-tight mb-0.5">{emp.first_name} {emp.last_name}</h3>
                                            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wide truncate">{emp.job_title || 'N/A'}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-neutral-400">
                                            <Building2 size={16} className="shrink-0 text-gray-400" />
                                            <span className="truncate">{getDepartmentName(emp.department)}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-neutral-400">
                                            <Mail size={16} className="shrink-0 text-gray-400" />
                                            <span className="truncate">{emp.work_email || 'No email'}</span>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-neutral-700 text-xs text-gray-400 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span>ID: {emp.employee_id}</span>
                                            {emp.user && (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" title={`System Role: ${emp.user.role}`}>
                                                    <ShieldCheck size={10} /> {emp.user.role?.replace('_', ' ') || 'Portal'}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded-full dark:bg-green-900/30 dark:text-green-400">Active</span>
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
                                            <th scope="col" className="px-6 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-neutral-400">Employee</th>
                                            <th scope="col" className="px-6 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-neutral-400">Role & Dept</th>
                                            <th scope="col" className="px-6 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-neutral-400">Contact</th>
                                            <th scope="col" className="px-6 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-neutral-400">Status</th>
                                            <th scope="col" className="px-6 py-3 text-end text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-neutral-400">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                                        {filteredEmployees.map((emp) => (
                                            <tr
                                                key={emp.id}
                                                className="hover:bg-gray-50 dark:hover:bg-neutral-700/50 transition-colors cursor-pointer"
                                                onClick={() => navigate(`/employees/${emp.id}`)}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 shrink-0 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm dark:bg-indigo-900/30 dark:text-indigo-300">
                                                            {emp.first_name[0]}{emp.last_name[0]}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <div className="text-sm font-semibold text-gray-800 dark:text-white">{emp.first_name} {emp.last_name}</div>
                                                                {emp.user && (
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="text-purple-600 dark:text-purple-400" title="Portal Access">
                                                                            <ShieldCheck size={14} />
                                                                        </span>
                                                                        <span className="text-xs text-purple-600 dark:text-purple-400 uppercase font-bold">
                                                                            {emp.user.role?.replace('_', ' ')}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-gray-500">{emp.employee_id}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-800 dark:text-neutral-200 font-medium">{emp.job_title || 'N/A'}</div>
                                                    <div className="text-xs text-gray-500">{getDepartmentName(emp.department)}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-neutral-400">
                                                            <Mail size={12} /> {emp.work_email}
                                                        </div>
                                                        {emp.mobile_phone && (
                                                            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-neutral-400">
                                                                <Phone size={12} /> {emp.mobile_phone}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center gap-1.5 py-0.5 px-2 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                        <span className="w-1.5 h-1.5 inline-block bg-green-600 rounded-full"></span>
                                                        Active
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-end text-sm font-medium">
                                                    {canManage && (
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    navigate(`/employees/${emp.id}/edit`);
                                                                }}
                                                                className="text-blue-600 hover:text-blue-800 dark:text-blue-500 dark:hover:text-blue-400 transition-colors"
                                                                title="Edit Employee"
                                                            >
                                                                <Pencil size={18} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteClick(emp.id);
                                                                }}
                                                                className="text-gray-400 hover:text-red-600 transition-colors"
                                                                title="Delete Employee"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    )}
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

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Employee"
                message="Are you sure you want to delete this employee? This action cannot be undone."
                confirmText="Delete"
                destructive={true}
            />
        </div>
    );
};

export default Employees;
