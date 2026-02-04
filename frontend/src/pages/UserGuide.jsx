import React, { useEffect } from 'react';
import { Shield, Users, Lock, ChevronRight, Check, AlertTriangle, BookOpen, Key, Briefcase } from 'lucide-react';
import { useLayout } from '../context/LayoutContext';
import Breadcrumb from '../components/Breadcrumb';

import api from '../services/api';

const UserGuide = () => {
    const { setHeader } = useLayout();
    const [roles, setRoles] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    useEffect(() => {
        setHeader(
            <Breadcrumb items={[{ label: 'System' }, { label: 'User Guide' }]} />
        );
        fetchRoles();
    }, [setHeader]);

    const fetchRoles = async () => {
        try {
            const response = await api.get('/roles');
            // Transform DB roles to UI format
            const mappedRoles = response.data.map(role => ({
                name: role.name,
                code: role.name.toLowerCase().replace(/\s+/g, '_'), // simplistic code generation
                level: role.is_system_role ? 1 : 2, // approximation
                reportsTo: role.is_system_role ? null : "Admin",
                color: getRoleColor(role.name),
                icon: getRoleIcon(role.name),
                description: role.description || "No description provided.",
                access: role.permissions ? role.permissions.map(p => p.name) : ["Basic Access"]
            }));
            // Fallback if DB is empty (to avoid broken UI during migration)
            if (mappedRoles.length === 0) {
                setRoles(DefaultSystemRoles);
            } else {
                setRoles(mappedRoles);
            }
        } catch (error) {
            console.error("Failed to fetch roles", error);
            setRoles(DefaultSystemRoles); // Fallback
        } finally {
            setLoading(false);
        }
    };

    const getRoleColor = (name) => {
        const n = name.toLowerCase();
        if (n.includes('super')) return 'red';
        if (n.includes('admin')) return 'orange';
        if (n.includes('manager')) return 'blue';
        return 'green';
    };

    const getRoleIcon = (name) => {
        const n = name.toLowerCase();
        if (n.includes('super')) return Shield;
        if (n.includes('admin')) return Lock;
        if (n.includes('manager')) return Briefcase;
        return Users;
    };

    const DefaultSystemRoles = [
        {
            name: "Super Admin",
            code: "super_admin",
            level: 1,
            reportsTo: null,
            color: "red",
            icon: Shield,
            description: "Full system access. can manage all companies, billing, and system configurations.",
            access: ["All Companies", "Global Settings", "Billing", "System Configuration", "User Management"]
        },
        {
            name: "Admin",
            code: "admin",
            level: 2,
            reportsTo: "Super Admin",
            color: "orange",
            icon: Lock,
            description: "Company-level administrator. Full access within their specific company organization.",
            access: ["Company Settings", "Employee Management", "Role Assignment", "Department Management"]
        },
        {
            name: "Staff",
            code: "staff",
            level: 3,
            reportsTo: "Admin",
            color: "green",
            icon: Users,
            description: "Standard system user. Can only view own profile and perform basic assigned tasks.",
            access: ["View Own Profile", "Submit Requests", "Clock In/Out"]
        }
    ];

    const AccessConcepts = [
        {
            title: "System Roles vs Custom Roles",
            icon: Key,
            content: "System Roles (Super Admin, Admin, Staff etc.) are hardcoded levels of authority that determine what a user *is*. Custom Roles allow you to define granular permissions (what a user *can do*) such as 'Can Delete Users' or 'Can View Salaries'. Typically, a user has one primary System Role and can be assigned a Custom Role for fine-grained control."
        },
        {
            title: "Permissions Matrix",
            icon: Shield,
            content: "Permissions are additive. A user with 'Staff' level might not be able to edit anything, but if assigned a 'Content Editor' custom role, they gain specific edit rights. Permissions are grouped by module (e.g., HR, Sales, System)."
        },
        {
            title: "Data Isolation",
            icon: Lock,
            content: "Users are strictly isolated to their assigned Company. A 'Manager' in Company A cannot see any data from Company B. Only 'Super Admins' have cross-company visibility."
        }
    ];


    const SystemMatrixData = {
        categories: [
            {
                name: "Data Scope",
                permissions: [
                    { action: "View All Companies", super_admin: true, admin: false, staff: false },
                    { action: "View Own Company Data", super_admin: true, admin: true, staff: true },
                    { action: "View Other Users' Data", super_admin: true, admin: true, staff: false },
                ]
            },
            {
                name: "User Management",
                permissions: [
                    { action: "Create/Delete Users", super_admin: true, admin: true, staff: false },
                    { action: "Assign Roles", super_admin: true, admin: true, staff: false },
                    { action: "Reset Passwords", super_admin: true, admin: true, staff: false },
                ]
            },
            {
                name: "System Configuration",
                permissions: [
                    { action: "Global Settings", super_admin: true, admin: false, staff: false },
                    { action: "Company Settings", super_admin: true, admin: true, staff: false },
                    { action: "Audit Logs", super_admin: true, admin: true, staff: false },
                ]
            }
        ],
        roles: ["super_admin", "admin", "staff"]
    };

    return (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
            {/* ... Header ... */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-8 sm:p-12 text-white shadow-lg">
                <div className="relative z-10 max-w-3xl">
                    <h1 className="text-3xl sm:text-4xl font-bold mb-4">User Roles & Access Guide</h1>
                    <p className="text-blue-100 text-lg sm:text-xl leading-relaxed">
                        Understanding how users, roles, and permissions work together to keep your data secure while empowering your team.
                    </p>
                </div>
                <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-white/10 to-transparent transform skew-x-12 translate-x-1/2"></div>
                <div className="absolute bottom-0 right-12 opacity-10">
                    <Shield size={200} />
                </div>
            </div>

            {/* ... Core Concepts ... */}
            <div className="grid md:grid-cols-3 gap-6">
                {AccessConcepts.map((item, idx) => (
                    <div key={idx} className="bg-white dark:bg-neutral-800 p-6 rounded-xl border border-gray-200 dark:border-neutral-700 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                <item.icon size={24} />
                            </div>
                            <h3 className="font-bold text-lg text-gray-800 dark:text-white">{item.title}</h3>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                            {item.content}
                        </p>
                    </div>
                ))}
            </div>

            {/* System Permission Matrix */}
            <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                    <Check className="text-blue-600" />
                    System Permission Matrix
                </h2>
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-neutral-700 shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
                        <thead className="bg-gray-50 dark:bg-neutral-800">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-start text-xs font-semibold text-gray-500 uppercase dark:text-neutral-400 w-1/3">Action</th>
                                {SystemMatrixData.roles.map(r => (
                                    <th key={r} scope="col" className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase dark:text-neutral-400">{r.replace('_', ' ')}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-neutral-700 bg-white dark:bg-neutral-900">
                            {SystemMatrixData.categories.map((cat, idx) => (
                                <React.Fragment key={idx}>
                                    <tr className="bg-gray-50/50 dark:bg-neutral-800/50">
                                        <td colSpan={4} className="px-6 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                            {cat.name}
                                        </td>
                                    </tr>
                                    {cat.permissions.map((perm, pIdx) => (
                                        <tr key={pIdx} className="hover:bg-gray-50 dark:hover:bg-neutral-800">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-neutral-200">
                                                {perm.action}
                                            </td>
                                            {SystemMatrixData.roles.map(r => (
                                                <td key={r} className="px-6 py-4 whitespace-nowrap text-center">
                                                    {perm[r] ? (
                                                        <Check size={18} className="mx-auto text-green-600 dark:text-green-500" />
                                                    ) : (
                                                        <span className="block w-1.5 h-1.5 mx-auto rounded-full bg-gray-300 dark:bg-neutral-600"></span>
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Workflow & Security */}
            <div className="grid lg:grid-cols-2 gap-12">
                {/* Workflow */}
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                        <Users className="text-blue-600" />
                        Role-Permission Flow
                    </h2>
                    <div className="relative border-l-2 border-dashed border-gray-200 dark:border-neutral-700 ml-4 space-y-8 pl-8 py-2">
                        {[
                            { title: "Define Role", desc: "Create a new role (e.g. 'Auditor') in System > Roles or use a preset." },
                            { title: "Map Permissions", desc: "Select specific toggles from the permission pool (e.g. 'View Financials')." },
                            { title: "Assign to User", desc: "Navigate to User Management and attach the role to specific users." },
                            { title: "Middleware Authorization", desc: "On every API request, the system validates the user's active role against required scopes." }
                        ].map((step, i) => (
                            <div key={i} className="relative">
                                <span className="absolute -left-[41px] top-0 h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/50 border-2 border-blue-600 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400">
                                    {i + 1}
                                </span>
                                <h3 className="font-bold text-gray-800 dark:text-white text-lg">{step.title}</h3>
                                <p className="text-gray-600 dark:text-gray-400 mt-1">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Compliance & Security */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                        <Shield className="text-blue-600" />
                        Security & Compliance
                    </h2>

                    <div className="bg-white dark:bg-neutral-800 p-5 rounded-xl border border-gray-200 dark:border-neutral-700">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                            <Lock size={18} className="text-indigo-600" />
                            Authorization Middleware
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            The system uses a strict <code>AuthorizationMiddleware</code> pattern. Permissions are checked at the request level before any business logic executes, ensuring zero-trust verification for every API call.
                        </p>
                    </div>

                    <div className="bg-white dark:bg-neutral-800 p-5 rounded-xl border border-gray-200 dark:border-neutral-700">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                            <AlertTriangle size={18} className="text-orange-600" />
                            Edge Cases & Temporary Access
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Granting temporary access requires an explicit role change which is logged. There is no concept of "ad-hoc" permissions; all access must be backed by a defined Role entity to maintain auditability.
                        </p>
                    </div>

                    <div className="bg-white dark:bg-neutral-800 p-5 rounded-xl border border-gray-200 dark:border-neutral-700">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                            <Shield size={18} className="text-green-600" />
                            SOC2 / ISO Validation
                        </h3>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1">
                            <li><strong>Access Control:</strong> Strict Principle of Least Privilege (PoLP).</li>
                            <li><strong>Audit Trails:</strong> All role changes and assignments are logged.</li>
                            <li><strong>Separation of Duties:</strong> Critical actions require distinct permissions.</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Visual Hierarchy */}
            <div className="flex flex-col items-center">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-8 flex items-center gap-2">
                    <Users className="text-blue-600" />
                    Access Hierarchy
                </h2>
                <div className="relative w-full max-w-4xl flex flex-col items-center gap-6">
                    {/* Level 1 */}
                    <div className="flex flex-col items-center">
                        <div className="bg-red-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 w-48 justify-center z-10">
                            <Shield size={20} />
                            <span className="font-bold">Super Admin</span>
                        </div>
                        <div className="h-6 w-0.5 bg-gray-300 dark:bg-neutral-600"></div>
                    </div>

                    {/* Level 2 */}
                    <div className="flex flex-col items-center">
                        <div className="bg-orange-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 w-48 justify-center z-10">
                            <Lock size={20} />
                            <span className="font-bold">Admin</span>
                        </div>
                        <div className="h-6 w-0.5 bg-gray-300 dark:bg-neutral-600"></div>
                    </div>

                    {/* Level 3 */}
                    <div className="flex flex-col items-center">
                        <div className="bg-green-500 text-white px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-2 w-48 justify-center">
                            <Users size={18} />
                            <span className="font-semibold">Staff</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* System Roles Detail */}
            <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                    <BookOpen className="text-blue-600" />
                    Role Definitions
                </h2>
                <div className="grid gap-6">
                    {loading ? (
                        <div className="text-center py-12 text-gray-500">Loading role definitions...</div>
                    ) : (
                        roles.map((role) => (
                            <div key={role.code} className="group flex flex-col sm:flex-row gap-6 bg-white dark:bg-neutral-800 p-6 rounded-xl border border-gray-200 dark:border-neutral-700 shadow-sm hover:border-blue-500/30 transition-all relative overflow-hidden">
                                {/* Level Indicator Watermark */}
                                <div className="absolute right-0 top-0 p-4 opacity-5">
                                    <span className="text-9xl font-black">{role.level}</span>
                                </div>

                                <div className={`sm:w-64 shrink-0 flex flex-col items-center sm:items-start text-center sm:text-left border-b sm:border-b-0 sm:border-r border-gray-100 dark:border-neutral-700 pb-4 sm:pb-0 sm:pr-6 relative z-10`}>
                                    <div className={`inline-flex p-3 rounded-full mb-3 bg-${role.color}-100 dark:bg-${role.color}-900/20 text-${role.color}-600 dark:text-${role.color}-400`}>
                                        <role.icon size={28} />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">{role.name}</h3>
                                    <div className="mt-2 flex flex-col gap-1 items-center sm:items-start">
                                        <span className="text-xs bg-gray-100 dark:bg-neutral-700 text-gray-500 px-2 py-1 rounded font-mono">
                                            {role.code}
                                        </span>
                                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                                            Level {role.level}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex-1 relative z-10">
                                    <p className="text-gray-600 dark:text-gray-300 mb-4 text-base">
                                        {role.description}
                                    </p>

                                    <div className="mb-4">
                                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Reports To</span>
                                        <div className="flex items-center gap-2">
                                            {role.reportsTo ? (
                                                <>
                                                    <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{role.reportsTo}</span>
                                                </>
                                            ) : (
                                                <span className="text-sm text-gray-400 italic">Top Level Authority</span>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Typical Capabilities</span>
                                        <div className="flex flex-wrap gap-2">
                                            {role.access.map((acc, i) => (
                                                <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-gray-50 dark:bg-neutral-700/50 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-neutral-600">
                                                    <Check size={12} className="text-green-500" />
                                                    {acc}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Help Box */}
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-900/30 p-4 flex gap-4">
                <AlertTriangle className="text-yellow-600 dark:text-yellow-500 shrink-0" />
                <div>
                    <h4 className="font-bold text-yellow-800 dark:text-yellow-400 mb-1">Important Note on Access</h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300/80">
                        While the System Hierarchy establishes the baseline, specific access can be overridden by granular permissions in the Roles & Permissions page. Always check the active applied role on a user's profile for the definitive source of truth.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default UserGuide;
