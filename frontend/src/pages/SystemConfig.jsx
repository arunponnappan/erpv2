import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { useLayout } from '../context/LayoutContext';
import Breadcrumb from '../components/Breadcrumb';
import {
    Building2, MapPin, Users, Briefcase, UserCheck,
    Settings, Shield, Network, Plus, Trash2,
    ChevronRight, ChevronDown, Check, X,
    AlertTriangle, Loader2, Info, PieChart, Save, Minus, Smartphone
} from 'lucide-react';
import api from '../services/api';

// No CSS Module import - Using Tailwind/Preline directly

const FormInfo = ({ text }) => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        let timer;
        if (isOpen) {
            timer = setTimeout(() => setIsOpen(false), 5000);
        }
        return () => clearTimeout(timer);
    }, [isOpen]);

    return (
        <span
            className="relative inline-flex items-center ml-1 cursor-pointer"
            onClick={(e) => {
                e.preventDefault();
                setIsOpen((prev) => !prev);
            }}
            role="button"
            aria-label="More information"
        >
            <Info size={14} className={`text-gray-400 hover:text-blue-600 transition-colors ${isOpen ? 'text-blue-500' : ''}`} />
            {isOpen && (
                <div className="absolute z-50 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg bottom-full left-1/2 -translate-x-1/2 mb-2" onClick={(e) => e.stopPropagation()}>
                    <span className="pr-4 block text-left">{text}</span>
                    <button
                        className="absolute top-1 right-2 text-gray-400 hover:text-white text-base"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsOpen(false);
                        }}
                    >
                        ×
                    </button>
                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900"></div>
                </div>
            )}
        </span>
    );
};

import ConfirmationModal from '../components/ConfirmationModal';

const DeleteCheckModal = ({ company, onClose, onConfirm }) => {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [confirmName, setConfirmName] = useState('');

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const res = await api.get(`/companies/${company.id}/summary`);
                setSummary(res.data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchSummary();
    }, [company]);

    const isMatch = confirmName === company.name;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6 transition-opacity">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
                        <Trash2 className="w-5 h-5" />
                        Delete Company?
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto">
                    <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6">
                        <p className="font-semibold flex items-center gap-2 mb-1">
                            <AlertTriangle className="w-4 h-4" /> Warning: Irreversible Action
                        </p>
                        <p className="text-sm opacity-90">
                            You are about to permanently delete <strong>{company.name}</strong>. This cannot be undone.
                        </p>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
                        </div>
                    ) : summary ? (
                        <div className="mb-6">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-blue-100 uppercase tracking-wide mb-3">Data Impact</h4>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Users', value: summary.users, color: 'bg-blue-50 text-blue-700' },
                                    { label: 'Employees', value: summary.employees, color: 'bg-indigo-50 text-indigo-700' },
                                    { label: 'Branches', value: summary.branches, color: 'bg-emerald-50 text-emerald-700' },
                                    { label: 'Departments', value: summary.departments, color: 'bg-amber-50 text-amber-700' },
                                ].map((stat) => (
                                    <div key={stat.label} className={`p-3 rounded-lg border border-transparent ${stat.color} flex justify-between items-center`}>
                                        <span className="text-sm font-medium">{stat.label}</span>
                                        <span className="text-lg font-bold">{stat.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className="text-red-500 mb-4">Could not load summary.</p>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Type <span className="font-mono font-bold bg-gray-100 dark:bg-gray-700 px-1 rounded select-all">{company.name}</span> to confirm:
                        </label>
                        <input
                            type="text"
                            value={confirmName}
                            onChange={(e) => setConfirmName(e.target.value)}
                            className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-red-500 focus:ring-red-500 disabled:opacity-50 disabled:pointer-events-none"
                            placeholder={company.name}
                            autoFocus
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="py-2.5 px-4 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={!isMatch}
                        className={`py-2.5 px-4 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent text-white focus:outline-none disabled:opacity-50 disabled:pointer-events-none transition-all ${isMatch ? 'bg-red-600 hover:bg-red-700 shadow-md' : 'bg-gray-400 cursor-not-allowed'
                            }`}
                    >
                        {isMatch ? 'Delete Company' : 'Type name to enable'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const SystemConfig = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const { user: currentUser } = useAuth();
    const { currentCompany, refreshCompanies } = useCompany();
    const { setHeader } = useLayout();
    // State
    const [activeModule, setActiveModule] = useState('org'); // Default to Org
    const [activeTab, setActiveTab] = useState('companies');
    const [loading, setLoading] = useState(true);

    // Data
    const [settings, setSettings] = useState({ employee_id_prefix: 'EMP', next_employee_number: 1 });
    const [companies, setCompanies] = useState([]);
    const [branches, setBranches] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [jobs, setJobs] = useState([]);

    const [empTypes, setEmpTypes] = useState([]);
    const [employees, setEmployees] = useState([]); // For Structure Map

    // Forms
    const [newCompany, setNewCompany] = useState({ name: '', domain: '' });
    const [editingCompany, setEditingCompany] = useState(null);

    const [newBranch, setNewBranch] = useState({ name: '', code: '', branch_type: 'branch', company_id: '' });
    const [newDept, setNewDept] = useState({ name: '', description: '', company_id: '' });
    const [newDesignation, setNewDesignation] = useState({ title: '', level: 1, company_id: '' });
    const [newJob, setNewJob] = useState({ name: '', description: '', department_id: '' });


    const [newEmpType, setNewEmpType] = useState({ name: '', description: '' });

    // Generic Delete Modal State
    const [deleteModal, setDeleteModal] = useState({
        isOpen: false,
        endpoint: '',
        id: null,
        setter: null,
        currentList: null,
        itemName: ''
    });

    // Visualization State
    const [vizCompanyId, setVizCompanyId] = useState('');
    const [vizMode, setVizMode] = useState('entity'); // 'entity' or 'employee'

    const [saving, setSaving] = useState(false);
    const [deletingCompany, setDeletingCompany] = useState(null); // Fixed placement

    const confirmDeleteCompany = async () => {
        if (!deletingCompany) return;
        try {
            await api.delete(`/companies/${deletingCompany.id}`);
            // Optimistic update or wait for refresh
            setCompanies(companies.filter(c => c.id !== deletingCompany.id));
            toast.success("Deleted", "Company and all associated data removed.");

            refreshCompanies();
            setDeletingCompany(null);
        } catch (error) {
            console.error(error);
            toast.error("Error", "Failed to delete company.");
        }
    };

    // --- Derived State (Data Isolation) ---
    // Strict filtering: Only show data relevant to the currently selected company
    // Note: Using == for ID comparison to handle potential String/Number mismatches
    const visibleBranches = branches.filter(b => currentCompany && b.company_id == currentCompany.id);

    // Departments, Designations, Jobs are now Company-wide, so no need to filter by Branch/Dept Map, 
    // just filter by Company ID directly (which should be handled by API params, but good to safety check here)
    const visibleDepartments = departments.filter(d => currentCompany && d.company_id == currentCompany.id);
    const visibleDesignations = designations.filter(d => currentCompany && d.company_id == currentCompany.id);

    // Jobs are linked to Departments, and Departments are linked to Company.
    // If we have visibleDepartments correctly filtered, we can use that to safe-guard jobs, 
    // or just assume the API returned the right jobs.
    // Let's rely on department link for safety.
    const visibleDeptMap = new Set(visibleDepartments.map(d => d.id));
    const visibleJobs = jobs.filter(j => visibleDeptMap.has(j.department_id));


    // Debug logging
    useEffect(() => {
        if (currentCompany) {
            console.log(`[Isolation] Company: ${currentCompany.name} (${currentCompany.id})`);
            console.log(`[Isolation] Visible Branches: ${visibleBranches.length} / ${branches.length}`);
        }
    }, [currentCompany, branches, visibleBranches]);


    useEffect(() => {
        const init = async () => {
            try {
                const [c, b, d, des, j, et, emp] = await Promise.all([
                    api.get('/companies/'),
                    api.get('/org/branches/', { params: { company_id: currentCompany?.id } }),
                    api.get('/org/departments/', { params: { company_id: currentCompany?.id } }),
                    api.get('/org/designations/', { params: { company_id: currentCompany?.id } }),
                    api.get('/org/job-roles/', { params: { company_id: currentCompany?.id } }),
                    api.get('/hr/employment-types/'),
                    api.get('/hr/employees/', { params: { company_id: currentCompany?.id, limit: 1000 } })
                ]);
                setCompanies(c.data);
                setBranches(b.data);
                setDepartments(d.data);
                setDesignations(des.data);
                setJobs(j.data);

                setEmpTypes(et.data);
                setEmployees(emp.data);
            } catch (e) {
                console.error(e);
                toast.error("Error", "Failed to load configuration.");
            } finally {
                setLoading(false);
            }
        };
        init();
        if (currentCompany?.id) {
            init();
        } else {
            setLoading(false);
        }
    }, [currentCompany?.id]);

    // --- Header Management ---
    useEffect(() => {
        // Map activeTab to a readable title
        const getTitle = () => {
            if (activeModule === 'structure') return 'Organization Structure Map';
            if (activeModule === 'system') return 'Global System Settings';

            // For Org and HR, activeTab is the key
            const titleMap = {
                'companies': 'Organization / Companies',
                'branches': 'Organization / Branches',
                'departments': 'HR / Departments',
                'designations': 'HR / Designations',
                'jobs': 'HR / Job Roles',
                'emptypes': 'HR / Employment Types',
                'settings': 'HR / General Settings',

                'global': 'System / Global Settings'
            };

            const breadcrumbItems = [];
            if (activeModule === 'org') breadcrumbItems.push({ label: 'Organization' });
            if (activeModule === 'hr') breadcrumbItems.push({ label: 'HR Settings' });

            if (activeModule === 'system') breadcrumbItems.push({ label: 'System' });

            // Simple mapping for demonstration, ideally explicit
            const currentTabLabel = activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
            breadcrumbItems.push({ label: currentTabLabel });

            setHeader(<Breadcrumb items={breadcrumbItems} />);
        };

        getTitle();
    }, [activeModule, activeTab]);


    // Effect to set default company for visualization
    /*
    useEffect(() => {
        if (currentCompany) {
            setVizCompanyId(currentCompany.id);
        } else if (activeModule === 'structure' && !vizCompanyId && companies.length > 0) {
            setVizCompanyId(companies[0].id);
        }
    }, [activeModule, vizCompanyId, companies, currentCompany]);
    */
    useEffect(() => {
        if (activeModule === 'org' && currentCompany) {
            setVizCompanyId(currentCompany.id);
        } else if (activeModule === 'org' && !loading && companies.length > 0) {
            // Fallback logic
            if (!vizCompanyId) {
                setVizCompanyId(companies[0].id);
            }
        }
    }, [activeModule, currentCompany, loading, companies]);

    // --- Reset Forms on Company Switch ---
    useEffect(() => {
        if (currentCompany) {
            setNewBranch({ name: '', code: '', company_id: '' });
            setNewDept({ name: '', description: '', branch_id: '' });
            setNewDesignation({ title: '', level: 1, department_id: '' });
            setNewJob({ name: '', description: '', department_id: '' });

        }
    }, [currentCompany]);

    // --- Handlers ---

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await api.put('/hr/settings/', settings);
            setSettings(res.data);
            toast.success("Saved", "Settings updated.");
        } catch (e) {
            toast.error("Error", "Failed to save settings.");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteClick = (endpoint, id, setState, state, itemName) => {
        setDeleteModal({
            isOpen: true,
            endpoint,
            id,
            setter: setState,
            currentList: state,
            itemName
        });
    };

    const confirmGenericDelete = async () => {
        const { endpoint, id, setter, currentList, itemName } = deleteModal;
        if (!id) return;

        try {
            await api.delete(`${endpoint}/${id}`);
            setter(currentList.filter(item => item.id !== id));
            toast.success("Deleted", `${itemName} has been deleted.`);

            // If we deleted a company, we must refresh the global context
            if (itemName === 'Company') {
                refreshCompanies();
            }
        } catch (error) {
            console.error("Delete failed:", error);
            const msg = error.response?.data?.detail || 'Failed to delete item';
            toast.error("Error", msg);
        } finally {
            setDeleteModal({ isOpen: false, endpoint: '', id: null, setter: null, currentList: null, itemName: '' });
        }
    };

    const handleAddCompany = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/companies/', newCompany);
            setCompanies([...companies, res.data]);
            setNewCompany({ name: '', domain: '' });
            toast.success("Added", "Company created.");
        } catch (e) {
            toast.error("Error", "Failed to create company.");
        }
    };

    const handleUpdateCompany = async (e) => {
        e.preventDefault();
        if (!editingCompany) return;
        setSaving(true);
        try {
            const res = await api.put(`/companies/${editingCompany.id}`, editingCompany);
            setCompanies(companies.map(c => c.id === editingCompany.id ? res.data : c));
            setEditingCompany(null);
            toast.success("Updated", "Company details saved.");
        } catch (e) {
            console.error(e);
            toast.error("Error", "Failed to update company.");
        } finally {
            setSaving(false);
        }
    };

    const generateCode = (name) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .substring(0, 6) || 'BR';
    };

    const handleAddBranch = async (e) => {
        e.preventDefault();
        try {
            console.log("Creating Branch with CurrentCompany:", currentCompany);
            const payload = {
                ...newBranch,
                company_id: newBranch.company_id || currentCompany?.id
            };
            if (!payload.company_id) throw new Error("Company context missing");

            const res = await api.post('/org/branches/', payload);
            setBranches((prev) => [...prev, res.data]);
            setNewBranch({ name: '', code: '', branch_type: 'branch', company_id: '' });
            toast.success("Added", "Branch created.");
        } catch (e) {
            console.error(e);
            toast.error("Error", "Failed to create Branch.");
        }
    };

    const handleAddDept = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...newDept,
                company_id: currentCompany?.id
            };
            const res = await api.post('/org/departments/', payload);
            setDepartments([...departments, res.data]);
            setNewDept({ name: '', description: '', company_id: '' });
            toast.success("Added", "Department created.");
        } catch (e) {
            toast.error("Error", "Failed to add department.");
        }
    };

    const handleAddDesignation = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...newDesignation,
                company_id: currentCompany?.id
            };
            const res = await api.post('/org/designations/', payload);
            setDesignations([...designations, res.data]);
            setNewDesignation({ title: '', level: 1, company_id: '' });
            toast.success("Added", "Designation created.");
        } catch (e) {
            toast.error("Error", "Failed to create Designation.");
        }
    };

    const handleAddJob = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/org/job-roles/', newJob);
            setJobs([...jobs, res.data]);
            setNewJob({ name: '', description: '', department_id: '' });
            toast.success("Added", "Job Role created.");
        } catch (e) {
            toast.error("Error", "Failed to add job role.");
        }
    };



    const handleAddEmpType = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/hr/employment-types/', newEmpType);
            setEmpTypes([...empTypes, res.data]);
            setNewEmpType({ name: '', description: '' });
            toast.success("Added", "Employment Type created.");
        } catch (e) {
            toast.error("Error", "Failed to add employment type.");
        }
    };



    if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /> Loading config...</div>;

    // --- Renderers ---




    const renderStructureContent = () => {
        // Build Tree
        // Structure: Company -> Branch -> Dept -> Job -> Employee
        if (!currentCompany) return <div>Select a company.</div>;

        const treeData = visibleBranches.map(branch => {
            // Find employees in this branch
            const branchEmps = employees.filter(e => e.branch_id === branch.id);
            // Group by Department
            const branchDeptIds = new Set(branchEmps.map(e => e.department_id));
            const activeDepts = visibleDepartments.filter(d => branchDeptIds.has(d.id));

            return {
                ...branch,
                children: activeDepts.map(dept => {
                    // Find employees in this branch AND dept
                    const deptEmps = branchEmps.filter(e => e.department_id === dept.id);
                    // Group by Job Role
                    const jobIds = new Set(deptEmps.map(e => e.job_role_id));
                    const activeJobs = visibleJobs.filter(j => jobIds.has(j.id));

                    return {
                        ...dept,
                        children: activeJobs.map(job => {
                            const jobEmps = deptEmps.filter(e => e.job_role_id === job.id);
                            return {
                                ...job,
                                children: jobEmps
                            };
                        })
                    };
                })
            };
        });

        const TreeNode = ({ node, level, type }) => {
            const [expanded, setExpanded] = useState(true);
            const hasChildren = node.children && node.children.length > 0;

            // Employee Node (Leaf)
            if (type === 'employee') {
                return (
                    <div className="pl-4 py-1 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                            {node.first_name?.[0]}{node.last_name?.[0]}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{node.first_name} {node.last_name}</p>
                            <p className="text-xs text-gray-500">{node.employee_id}</p>
                        </div>
                    </div>
                );
            }

            const getIcon = () => {
                if (type === 'branch') return MapPin;
                if (type === 'dept') return Building2;
                if (type === 'job') return Briefcase;
                return Check;
            };
            const Icon = getIcon();

            return (
                <div className="ml-4 border-l border-gray-200 dark:border-gray-700 pl-4 py-2">
                    <div
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors"
                        onClick={() => setExpanded(!expanded)}
                    >
                        {hasChildren ? (
                            expanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />
                        ) : <span className="w-4" />}

                        <Icon size={18} className="text-gray-500" />
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {node.name || node.title}
                            {type === 'branch' && node.code && <span className="ml-2 text-xs font-mono text-gray-400">({node.code})</span>}
                        </span>
                        <span className="text-xs text-gray-400 ml-auto">
                            {type === 'branch' ? `${node.children.length} Depts` :
                                type === 'dept' ? `${node.children.length} Roles` :
                                    type === 'job' ? `${node.children.length} Emps` : ''}
                        </span>
                    </div>
                    {expanded && hasChildren && (
                        <div className="mt-1">
                            {node.children.map(child => (
                                <TreeNode
                                    key={child.id}
                                    node={child}
                                    level={level + 1}
                                    type={type === 'branch' ? 'dept' : type === 'dept' ? 'job' : 'employee'}
                                />
                            ))}
                        </div>
                    )}
                </div>
            );
        };

        return (
            <div className="animate-fadeIn p-4">
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-white dark:bg-gray-900">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                        <Network /> {currentCompany.name} Structure
                    </h3>
                    <div className="space-y-2">
                        {treeData.map(branch => (
                            <TreeNode key={branch.id} node={branch} level={0} type="branch" />
                        ))}
                        {treeData.length === 0 && (
                            <div className="text-center text-gray-500 py-8">
                                No structure data available. Assign employees to branches and departments to see the tree.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderOrgContent = () => {
        switch (activeTab) {
            case 'companies': {
                // Inline Edit Logic remains the same, just styling
                if (editingCompany) {
                    return (
                        <div className="animate-fadeIn">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Edit Company: {editingCompany.name}</h2>
                                <button onClick={() => setEditingCompany(null)} className="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:bg-gray-700">
                                    Cancel
                                </button>
                            </div>
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 md:p-5">
                                <form onSubmit={handleUpdateCompany}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2 dark:text-white">Name <FormInfo text={'The official registered name of the company entity.'} /></label>
                                            <input className="py-2.5 px-4 block w-full border-gray-300 bg-gray-50 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 shadow-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400" value={editingCompany.name} onChange={e => setEditingCompany({ ...editingCompany, name: e.target.value })} required />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2 dark:text-white">Domain <FormInfo text={'Primary internet domain (e.g., example.com).'} /></label>
                                            <input className="py-3 px-4 block w-full border-gray-300 bg-gray-50 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 shadow-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" value={editingCompany.domain} onChange={e => setEditingCompany({ ...editingCompany, domain: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2 dark:text-white">Primary Brand Color</label>
                                            <div className="flex gap-2">
                                                <input type="color" className="p-1 h-10 w-14 block bg-white border border-gray-200 cursor-pointer rounded-lg disabled:opacity-50 disabled:pointer-events-none" value={editingCompany.primary_color || '#4f46e5'} onChange={e => setEditingCompany({ ...editingCompany, primary_color: e.target.value })} title="Choose your color" />
                                                <input className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500" value={editingCompany.primary_color || '#4f46e5'} onChange={e => setEditingCompany({ ...editingCompany, primary_color: e.target.value })} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2 dark:text-white">Footer Text</label>
                                            <input className="py-3 px-4 block w-full border-gray-300 bg-gray-50 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 shadow-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" value={editingCompany.footer_text || ''} onChange={e => setEditingCompany({ ...editingCompany, footer_text: e.target.value })} />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium mb-2 dark:text-white">Logo URL</label>
                                            <input className="py-3 px-4 block w-full border-gray-300 bg-gray-50 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 shadow-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" value={editingCompany.logo_url || ''} onChange={e => setEditingCompany({ ...editingCompany, logo_url: e.target.value })} placeholder="https://..." />
                                            {editingCompany.logo_url && <img src={editingCompany.logo_url} alt="Preview" className="h-12 mt-3 object-contain border rounded p-1" />}
                                        </div>
                                    </div>
                                    <div className="flex justify-end mt-6">
                                        <button type="submit" className="py-3 px-4 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none" disabled={saving}>
                                            {saving ? <Loader2 className="animate-spin" /> : <Save size={16} />} Save Changes
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    );
                }

                return (
                    <div className="animate-fadeIn">
                        {/* Header Removed */}


                        {currentUser?.role === 'super_admin' && (
                            <div className="flex flex-col bg-white border shadow-sm rounded-xl dark:bg-neutral-900 dark:border-neutral-700 dark:shadow-neutral-700/70 p-4 mb-6">
                                <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-wide"><Plus size={16} /> Add Company</h3>
                                <form onSubmit={handleAddCompany} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                    <div className="md:col-span-5">
                                        <label className="block text-sm font-medium mb-1 dark:text-white">Name</label>
                                        <input className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600" value={newCompany.name} onChange={e => setNewCompany({ ...newCompany, name: e.target.value })} required placeholder="Enter company name" />
                                    </div>
                                    <div className="md:col-span-5">
                                        <label className="block text-sm font-medium mb-1 dark:text-gray-200">Domain</label>
                                        <input className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600" value={newCompany.domain} onChange={e => setNewCompany({ ...newCompany, domain: e.target.value })} />
                                    </div>
                                    <div className="md:col-span-2">
                                        <button type="submit" className="w-full py-3 px-4 inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none">Add</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="flex flex-col">
                            <div className="-m-1.5 overflow-x-auto">
                                <div className="p-1.5 min-w-full inline-block align-middle">
                                    <div className="border rounded-lg overflow-hidden dark:border-neutral-700">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
                                            <thead className="bg-gray-50 dark:bg-neutral-700">
                                                <tr>
                                                    <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase dark:text-neutral-500">Company Name</th>
                                                    <th scope="col" className="px-6 py-3 text-end text-xs font-medium text-gray-500 uppercase dark:text-neutral-500">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                                                {companies.map(c => (
                                                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-neutral-200 font-medium">
                                                            <div className="flex items-center gap-3">
                                                                {c.logo_url && <img src={c.logo_url} className="w-6 h-6 object-contain" alt="" />}
                                                                {c.name}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-end text-sm font-medium">
                                                            <button onClick={() => setEditingCompany(c)} className="text-blue-600 hover:text-blue-800 mr-4 dark:text-blue-400 dark:hover:text-blue-300">Config</button>
                                                            {currentUser?.role === 'super_admin' && !c.is_default && (
                                                                <button onClick={() => setDeletingCompany(c)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-blue-300">Delete</button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            }
            case 'branches':
                return (
                    <div className="animate-fadeIn">
                        {/* Header Removed */}
                        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6">
                            <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-wide"><Plus size={16} /> Add Branch</h3>
                            <form onSubmit={handleAddBranch} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                {currentUser?.role === 'super_admin' ? (
                                    <div className="md:col-span-3">
                                        <label className="block text-sm font-medium mb-1 dark:text-white">Company</label>
                                        <select className="py-3 px-4 pe-9 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600" value={newBranch.company_id} onChange={e => setNewBranch({ ...newBranch, company_id: e.target.value })} required>
                                            <option value="">Select Company</option>
                                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                ) : <input type="hidden" value={currentCompany?.id || ''} />}

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-200">Type</label>
                                    <select className="py-2.5 px-4 pe-9 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600" value={newBranch.branch_type} onChange={e => setNewBranch({ ...newBranch, branch_type: e.target.value })}>
                                        <option value="branch">Branch</option>
                                        <option value="hq">Headquarters</option>
                                        <option value="shop">Shop</option>
                                        <option value="regional">Regional Office</option>
                                    </select>
                                </div>

                                <div className="md:col-span-3">
                                    <label className="block text-sm font-medium mb-1">Name</label>
                                    <input
                                        className="py-2.5 px-4 block w-full border-gray-300 bg-gray-50 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 shadow-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                                        value={newBranch.name}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setNewBranch({
                                                ...newBranch,
                                                name: val,
                                                code: !newBranch.code || newBranch.code === generateCode(newBranch.name) ? generateCode(val) : newBranch.code
                                            });
                                        }}
                                        required
                                        placeholder="Branch Name"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-200">Code</label>
                                    <input className="py-2.5 px-4 block w-full border-gray-300 bg-gray-50 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 shadow-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" value={newBranch.code} onChange={e => setNewBranch({ ...newBranch, code: e.target.value })} required placeholder="Code" />
                                </div>
                                <div className="md:col-span-2">
                                    <button type="submit" className="w-full py-2 px-3 inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700">Add</button>
                                </div>
                            </form>
                        </div>
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
                            {currentCompany ? (
                                visibleBranches.length > 0 ? (
                                    <ul className="divide-y divide-gray-200">
                                        {visibleBranches.map(b => (
                                            <li key={b.id} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{b.name}</p>
                                                    <p className="text-xs text-gray-500 font-mono mt-0.5">{b.code}</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="inline-flex items-center gap-x-1.5 py-1.5 px-3 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-white">
                                                        {companies.find(c => c.id === b.company_id)?.name}
                                                    </span>
                                                    <button onClick={() => handleDeleteClick('/org/branches', b.id, setBranches, branches, 'Branch')} className="text-red-600 hover:text-red-800">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : <div className="p-8 text-center text-gray-500">No Branches found. Add one above.</div>
                            ) : <div className="p-8 text-center text-gray-500">Select a company to view.</div>}
                        </div>
                    </div>
                );

            default: return <div>Select an organization setting.</div>;
        }
    };

    const renderHRContent = () => {
        switch (activeTab) {
            case 'departments':
                return (
                    <div className="animate-fadeIn">
                        {/* Header Removed */}
                        <div className="flex flex-col bg-white border shadow-sm rounded-xl dark:bg-neutral-900 dark:border-neutral-700 dark:shadow-neutral-700/70 p-4 mb-6">
                            <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-wide"><Plus size={16} /> Add Department</h3>
                            <form onSubmit={handleAddDept} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                <div className="md:col-span-8">
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-200">Department Name</label>
                                    <input className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600" value={newDept.name} onChange={e => setNewDept({ ...newDept, name: e.target.value })} required placeholder="e.g. Finance, HR, Sales" />
                                </div>
                                <div className="md:col-span-4">
                                    <button type="submit" className="w-full py-3 px-4 inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none">Add Department</button>
                                </div>
                            </form>
                        </div>
                        <div className="flex flex-col bg-white border shadow-sm rounded-xl dark:bg-neutral-900 dark:border-neutral-700 dark:shadow-neutral-700/70">
                            {currentCompany ? (
                                visibleDepartments.length > 0 ? (
                                    <ul className="divide-y divide-gray-200">
                                        {visibleDepartments.map(d => (
                                            <li key={d.id} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{d.name}</p>
                                                <button onClick={() => handleDeleteClick('/org/departments', d.id, setDepartments, departments, 'Department')} className="text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={18} /></button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : <div className="p-8 text-center text-gray-500">No Departments found.</div>
                            ) : <div className="p-8 text-center text-gray-500">Select a company to view.</div>}
                        </div>
                    </div>
                );
            case 'designations':
                return (
                    <div className="animate-fadeIn">
                        {/* Header Removed */}
                        {/* Header Removed */}
                        <div className="flex flex-col bg-white border shadow-sm rounded-xl dark:bg-neutral-900 dark:border-neutral-700 dark:shadow-neutral-700/70 p-4 mb-6">
                            <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-wide"><Plus size={16} /> Add Designation</h3>
                            <form onSubmit={handleAddDesignation} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                <div className="md:col-span-8">
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-200">Title</label>
                                    <input className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600" value={newDesignation.title} onChange={e => setNewDesignation({ ...newDesignation, title: e.target.value })} required placeholder="e.g. Manager, Associate" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-200">Level</label>
                                    <input type="number" className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600" value={newDesignation.level} onChange={e => setNewDesignation({ ...newDesignation, level: e.target.value })} />
                                </div>
                                <div className="md:col-span-2">
                                    <button type="submit" className="w-full py-3 px-4 inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none">Add</button>
                                </div>
                            </form>
                        </div>
                        <div className="flex flex-col bg-white border shadow-sm rounded-xl dark:bg-neutral-900 dark:border-neutral-700 dark:shadow-neutral-700/70">
                            {currentCompany ? (
                                visibleDesignations.length > 0 ? (
                                    <ul className="divide-y divide-gray-200">
                                        {visibleDesignations.map(d => (
                                            <li key={d.id} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-800">{d.title}</p>
                                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded ml-2">Level {d.level}</span>
                                                </div>
                                                <button onClick={() => handleDeleteClick('/org/designations', d.id, setDesignations, designations, 'Designation')} className="text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={18} /></button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : <div className="p-8 text-center text-gray-500">No Designations found.</div>
                            ) : <div className="p-8 text-center text-gray-500">Select a company to view.</div>}
                        </div>
                    </div>
                );
            case 'jobs':
                return (
                    <div className="animate-fadeIn">
                        {/* Header Removed */}
                        <div className="flex flex-col bg-white border shadow-sm rounded-xl dark:bg-neutral-900 dark:border-neutral-700 dark:shadow-neutral-700/70 p-4 mb-6">
                            <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-wide"><Plus size={16} /> Add Job Role</h3>
                            <form onSubmit={handleAddJob} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                <div className="md:col-span-4">
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-200">Department</label>
                                    <select className="py-3 px-4 pe-9 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600" value={newJob.department_id} onChange={e => setNewJob({ ...newJob, department_id: e.target.value })} required>
                                        <option value="">Select Dept</option>
                                        {visibleDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div className="md:col-span-6">
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-200">Role Name</label>
                                    <input className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600" value={newJob.name} onChange={e => setNewJob({ ...newJob, name: e.target.value })} required />
                                </div>
                                <div className="md:col-span-2">
                                    <button type="submit" className="w-full py-3 px-4 inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none">Add</button>
                                </div>
                            </form>
                        </div>
                        <div className="flex flex-col bg-white border shadow-sm rounded-xl dark:bg-neutral-900 dark:border-neutral-700 dark:shadow-neutral-700/70">
                            {currentCompany ? (
                                visibleJobs.length > 0 ? (
                                    <ul className="divide-y divide-gray-200">
                                        {visibleJobs.map(j => (
                                            <li key={j.id} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                                <p className="text-sm font-medium text-gray-800">{j.name}</p>
                                                <button onClick={() => handleDeleteClick('/org/job-roles', j.id, setJobs, jobs, 'Job Role')} className="text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={18} /></button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : <div className="p-8 text-center text-gray-500">No Job Roles found.</div>
                            ) : <div className="p-8 text-center text-gray-500">Select a company to view.</div>}
                        </div>
                    </div>
                );
            case 'settings':
                return (
                    <div className="max-w-4xl animate-fadeIn">
                        {/* Header Removed */}
                        <form onSubmit={handleSaveSettings}>
                            <div className="flex flex-col bg-white border shadow-sm rounded-xl dark:bg-neutral-900 dark:border-neutral-700 dark:shadow-neutral-700/70 p-4 md:p-5 mb-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2 dark:text-white">Employee ID Prefix</label>
                                        <input className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600" value={settings.employee_id_prefix} onChange={e => setSettings({ ...settings, employee_id_prefix: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2 dark:text-white">Next Employee Number</label>
                                        <input type="number" className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600" value={settings.next_employee_number} onChange={e => setSettings({ ...settings, next_employee_number: parseInt(e.target.value) })} />
                                    </div>
                                </div>
                                <div className="mt-6">
                                    <button type="submit" className="py-3 px-4 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none">
                                        Save Settings
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                );
            case 'emptypes':
                return (
                    <div className="animate-fadeIn">
                        {/* Header Removed */}
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
                            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2 uppercase tracking-wide"><Plus size={16} /> Add Type</h3>
                            <form onSubmit={handleAddEmpType} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                <div className="md:col-span-4">
                                    <label className="block text-sm font-medium mb-1">Type Name</label>
                                    <input className="py-2.5 px-4 block w-full border-gray-300 bg-gray-50 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 shadow-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" value={newEmpType.name} onChange={e => setNewEmpType({ ...newEmpType, name: e.target.value })} required />
                                </div>
                                <div className="md:col-span-6">
                                    <label className="block text-sm font-medium mb-1">Description</label>
                                    <input className="py-2 px-3 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500" value={newEmpType.description} onChange={e => setNewEmpType({ ...newEmpType, description: e.target.value })} />
                                </div>
                                <div className="md:col-span-2">
                                    <button type="submit" className="w-full py-2 px-3 inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700">Add</button>
                                </div>
                            </form>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                            {empTypes.length > 0 ? (
                                <ul className="divide-y divide-gray-200">
                                    {empTypes.map(et => (
                                        <li key={et.id} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                            <div>
                                                <p className="text-sm font-medium text-gray-800">{et.name}</p>
                                                {et.description && <p className="text-xs text-gray-500">{et.description}</p>}
                                            </div>
                                            <button onClick={() => handleDeleteClick('/hr/employment-types', et.id, setEmpTypes, empTypes, 'Employment Type')} className="text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={18} /></button>
                                        </li>
                                    ))}
                                </ul>
                            ) : <div className="p-8 text-center text-gray-500">No Employment Types found.</div>}
                        </div>
                    </div>
                );
            default: return <div>Select an HR setting.</div>;
        }
    };

    const renderUserContent = () => (
        <div className="animate-fadeIn p-8 text-center border-2 border-dashed border-gray-200 rounded-xl">
            <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">User & Permissions</h3>
            <p className="text-gray-500 mt-2">Advanced user role management and permission settings coming soon.</p>
        </div>
    );

    // Move icons import to top-level if needed, assuming implicit access or I will add them to the import list.
    // Actually, I should check if I can add imports via replace_file separately or just rely on what's there.
    // I will rewrite the renderStructureContent's internal TreeNode to be smarter.

    return (
        <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-4">
            {deletingCompany && (
                <DeleteCheckModal
                    company={deletingCompany}
                    onClose={() => setDeletingCompany(null)}
                    onConfirm={confirmDeleteCompany}
                />
            )}

            {/* Page Header */}
            {/* Page Header - Removed and Hoisted */}


            {/* Top Module Tabs */}
            <div className="mb-8 border-b border-gray-200 dark:border-neutral-700">
                <nav className="-mb-0.5 flex space-x-6 overflow-x-auto" aria-label="Tabs" role="tablist">
                    <button
                        type="button"
                        onClick={() => { setActiveModule('org'); setActiveTab('companies'); }}
                        className={`hs-tab-active:font-semibold hs-tab-active:border-blue-600 hs-tab-active:text-blue-600 py-4 px-1 inline-flex items-center gap-2 border-b-2 border-transparent text-sm whitespace-nowrap text-gray-500 hover:text-blue-600 focus:outline-none focus:text-blue-600 disabled:opacity-50 disabled:pointer-events-none dark:text-neutral-400 dark:hover:text-blue-500 ${activeModule === 'org' ? 'font-semibold border-blue-600 text-blue-600 dark:text-blue-500' : ''}`}
                    >
                        <Building2 size={18} />
                        Organization
                    </button>
                    <button
                        type="button"
                        onClick={() => { setActiveModule('hr'); setActiveTab('departments'); }}
                        className={`hs-tab-active:font-semibold hs-tab-active:border-blue-600 hs-tab-active:text-blue-600 py-4 px-1 inline-flex items-center gap-2 border-b-2 border-transparent text-sm whitespace-nowrap text-gray-500 hover:text-blue-600 focus:outline-none focus:text-blue-600 disabled:opacity-50 disabled:pointer-events-none dark:text-neutral-400 dark:hover:text-blue-500 ${activeModule === 'hr' ? 'font-semibold border-blue-600 text-blue-600 dark:text-blue-500' : ''}`}
                    >
                        <Users size={18} />
                        HR Settings
                    </button>

                    <button
                        type="button"
                        onClick={() => { setActiveModule('structure'); setActiveTab('map'); }}
                        className={`hs-tab-active:font-semibold hs-tab-active:border-blue-600 hs-tab-active:text-blue-600 py-4 px-1 inline-flex items-center gap-2 border-b-2 border-transparent text-sm whitespace-nowrap text-gray-500 hover:text-blue-600 focus:outline-none focus:text-blue-600 disabled:opacity-50 disabled:pointer-events-none dark:text-neutral-400 dark:hover:text-blue-500 ${activeModule === 'structure' ? 'font-semibold border-blue-600 text-blue-600 dark:text-blue-500' : ''}`}
                    >
                        <Network size={18} />
                        Structure Map
                    </button>
                    <button
                        type="button"
                        onClick={() => { setActiveModule('system'); setActiveTab('global'); }}
                        className={`hs-tab-active:font-semibold hs-tab-active:border-blue-600 hs-tab-active:text-blue-600 py-4 px-1 inline-flex items-center gap-2 border-b-2 border-transparent text-sm whitespace-nowrap text-gray-500 hover:text-blue-600 focus:outline-none focus:text-blue-600 disabled:opacity-50 disabled:pointer-events-none dark:text-neutral-400 dark:hover:text-blue-500 ${activeModule === 'system' ? 'font-semibold border-blue-600 text-blue-600 dark:text-blue-500' : ''}`}
                    >
                        <Settings size={18} />
                        System
                    </button>
                </nav>
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-start">
                {/* Sidebar Navigation */}
                <div className="w-full md:w-64 flex-shrink-0 space-y-1">
                    {activeModule === 'org' && (
                        <>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">Structure</p>
                            {[
                                { id: 'companies', label: 'Companies', icon: Building2 },
                                { id: 'branches', label: 'Branches', icon: MapPin },
                            ].map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`w-full flex items-center gap-x-3.5 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === item.id
                                        ? 'bg-blue-50 text-blue-600 shadow-sm dark:bg-blue-900/20 dark:text-blue-400'
                                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                                        }`}
                                >
                                    <item.icon className="w-4 h-4" />
                                    {item.label}
                                </button>
                            ))}
                        </>
                    )}
                    {activeModule === 'hr' && (
                        <>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">Hierachy</p>
                            {[
                                { id: 'departments', label: 'Departments', icon: Building2 },
                                { id: 'designations', label: 'Designations', icon: Users },
                                { id: 'jobs', label: 'Job Roles', icon: Briefcase },
                            ].map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`w-full flex items-center gap-x-3.5 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === item.id
                                        ? 'bg-blue-50 text-blue-600 shadow-sm dark:bg-blue-900/20 dark:text-blue-400'
                                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                                        }`}
                                >
                                    <item.icon className="w-4 h-4" />
                                    {item.label}
                                </button>
                            ))}
                            <div className="my-4 border-t border-gray-200"></div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">Configuration</p>
                            <button
                                onClick={() => setActiveTab('emptypes')}
                                className={`w-full flex items-center gap-x-3.5 py-2 px-3 rounded-lg text-sm transition-colors ${activeTab === 'emptypes'
                                    ? 'bg-blue-50 text-blue-600 font-medium'
                                    : 'text-gray-800 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
                                    }`}
                            >
                                <Users className="w-4 h-4" />
                                Employment Types
                            </button>
                            <button
                                onClick={() => setActiveTab('settings')}
                                className={`w-full flex items-center gap-x-3.5 py-2 px-3 rounded-lg text-sm transition-colors ${activeTab === 'settings'
                                    ? 'bg-blue-50 text-blue-600 font-medium'
                                    : 'text-gray-800 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
                                    }`}
                            >
                                <Settings className="w-4 h-4" />
                                General HR Settings
                            </button>
                        </>
                    )}

                    {activeModule === 'system' && (
                        <>
                            <button
                                onClick={() => setActiveTab('global')}
                                className={`w-full flex items-center gap-x-3.5 py-2 px-3 rounded-lg text-sm transition-colors ${activeTab === 'global'
                                    ? 'bg-blue-50 text-blue-600 font-medium'
                                    : 'text-gray-800 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
                                    }`}
                            >
                                <Settings className="w-4 h-4" />
                                Global Settings
                            </button>
                            <button
                                onClick={() => navigate('/system/mobile-barcode')}
                                className={`w-full flex items-center gap-x-3.5 py-2 px-3 rounded-lg text-sm transition-colors text-gray-800 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white`}
                            >
                                <Smartphone className="w-4 h-4" />
                                Mobile Barcode App
                            </button>
                        </>
                    )}
                    {activeModule === 'structure' && (
                        <button
                            onClick={() => setActiveTab('map')}
                            className={`w-full flex items-center gap-x-3.5 py-2 px-3 rounded-lg text-sm transition-colors ${activeTab === 'map'
                                ? 'bg-blue-50 text-blue-600 font-medium'
                                : 'text-gray-800 hover:bg-gray-100'
                                }`}
                        >
                            <Network className="w-4 h-4" />
                            Visualization
                        </button>
                    )}
                </div>

                {/* Content Area */}
                <div className="flex-1 min-w-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-xl p-6 md:p-8 transition-colors">
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
                        </div>
                    ) : (
                        activeModule === 'org' ? renderOrgContent() :
                            activeModule === 'hr' ? renderHRContent() :

                                activeModule === 'structure' ? renderStructureContent() : (
                                    <div className="text-gray-500 text-center py-10">System Settings (Coming Soon)</div>
                                )
                    )}
                </div>
            </div>

            {/* Generic Delete Modal */}
            <ConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                onConfirm={confirmGenericDelete}
                title={`Delete ${deleteModal.itemName}`}
                message={`Are you sure you want to delete this ${deleteModal.itemName}?`}
                confirmText="Delete"
                destructive={true}
            />
        </div>
    );
};

export default SystemConfig;
