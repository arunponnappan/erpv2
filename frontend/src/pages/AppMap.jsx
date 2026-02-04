import React from 'react';
import { useLayout } from '../context/LayoutContext';
import Breadcrumb from '../components/Breadcrumb';
import {
    LayoutDashboard, Users, Settings, Briefcase, Building2,
    ShieldCheck, Key, FileText, Network, UserPlus,
    CreditCard, Layers, Map as MapIcon, ChevronRight,
    ShoppingBag, Box
} from 'lucide-react';

const AppMap = () => {
    const { setHeader } = useLayout();

    React.useEffect(() => {
        setHeader(
            <Breadcrumb items={[{ label: 'System' }, { label: 'Application Map' }]} />,
            null
        );
    }, []);

    const appStructure = [
        {
            module: "System Core",
            icon: LayoutDashboard,
            description: "Foundation for the multi-tenant SaaS architecture.",
            features: [
                {
                    name: "Dashboard",
                    status: "Active",
                    description: "Central command center for quick insights.",
                    actions: [
                        "View Live Statistics (Employees, Depts)",
                        "Monitor Recent Activity",
                        "View Pending Requests",
                        "Check System Health Status"
                    ]
                },
                {
                    name: "User Profile",
                    icon: Users,
                    status: "Active",
                    description: "Personal account management.",
                    actions: [
                        "Update Personal Info",
                        "Change Password",
                        "View Activity Log",
                        "Manage Notification Preferences"
                    ]
                },
                {
                    name: "Authentication & Security",
                    icon: ShieldCheck,
                    status: "Active",
                    description: "Secure access control using RBAC.",
                    actions: [
                        "Login / Logout Flow",
                        "Password Reset (Forgot Password)",
                        "Session Management (JWT)",
                        "Role Enforcement Middleware"
                    ]
                },
                {
                    name: "Multi-Tenancy",
                    icon: Building2,
                    status: "Active",
                    description: "Data isolation & company management.",
                    actions: [
                        "Create/Delete Companies (Super Admin)",
                        "Switch Active Company Context",
                        "Organization Branding (Logo, Colors)",
                        "Cross-Company Data Isolation"
                    ]
                }
            ]
        },
        {
            module: "Human Resources (HR)",
            icon: Briefcase,
            description: "Complete employee lifecycle management.",
            features: [
                {
                    name: "Employee Management",
                    status: "Active",
                    description: "Central database of all personnel.",
                    actions: [
                        "List Employees (Filter by Branch/Dept)",
                        "Onboarding Wizard (Personal + Professional Details)",
                        "Auto-Generate Password for Portal Access",
                        "Assign Reporting Manager",
                        "View Employee Profile"
                    ]
                },
                {
                    name: "User Management",
                    icon: Users,
                    status: "Active",
                    description: "System access for employees and admins.",
                    actions: [
                        "Create User Account",
                        "Link User to Employee Record",
                        "Role Assignment (Staff -> Super Admin)",
                        "Activate/Deactivate/Suspend Users",
                        "View Login History"
                    ]
                }
            ]
        },
        {
            module: "Configuration & Settings",
            icon: Settings,
            description: "Global and company-level system configuration.",
            features: [
                {
                    name: "Organization Structure",
                    icon: Network,
                    status: "Active",
                    description: "Defining the hierarchy of the business.",
                    actions: [
                        "Manage Branches (HQ, Regional)",
                        "Manage Departments (Global)",
                        "Manage Designations (Levels)",
                        "Manage Job Roles (Dept-Specific)",
                        "Visualize Hierarchy Tree"
                    ]
                },
                {
                    name: "Roles & Permissions (RBAC)",
                    icon: Key,
                    status: "Active",
                    description: "Dynamic access control engine.",
                    actions: [
                        "Create/Edit Custom Roles",
                        "Define Granular Module Permissions",
                        "Assign Roles to Users",
                        "View Permission Matrix"
                    ]
                },
                {
                    name: "Billing & Finance",
                    icon: CreditCard,
                    status: "In Development",
                    description: "Subscription and billing management.",
                    actions: [
                        "View Invoices",
                        "Manage Payment Methods",
                        "Upgrade/Downgrade Plan",
                        "Billing Contact Info"
                    ]
                },
                {
                    name: "Developer Tools",
                    icon: FileText,
                    status: "Active",
                    description: "System internals and design resources.",
                    actions: [
                        "UI Element Library (Design System)",
                        "View System Logs",
                        "API Documentation",
                        "Application Map (This Page)"
                    ]
                }
            ]
        },
        {
            module: "Marketplace Ecosystem",
            icon: ShoppingBag,
            description: "Extensible architecture for addon modules.",
            features: [
                {
                    name: "App Store",
                    icon: Box,
                    status: "Active",
                    description: "Discover and install new modules.",
                    actions: [
                        "Browse Available Apps",
                        "One-Click Install/Uninstall",
                        "View App Details & Metadata",
                        "Manage Installed Apps"
                    ]
                },
                {
                    name: "Monday.com Connector",
                    icon: Layers,
                    status: "Active",
                    description: "Two-way integration with Monday.com boards.",
                    actions: [
                        "Secure API Key Connection",
                        "Sync Boards & Items",
                        "Map Columns to Local DB",
                        "Real-time Updates"
                    ]
                }
            ]
        }
    ];

    const getStatusColor = (status) => {
        switch (status) {
            case 'Active': return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400';
            case 'In Development': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
            case 'Hold': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
            default: return 'bg-blue-100 text-blue-800';
        }
    };

    return (
        <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-4">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Application Map</h2>
                <p className="text-gray-600 dark:text-gray-400">
                    A comprehensive overview of all modules, features, and capabilities currently implemented in the system.
                </p>
            </div>

            <div className="space-y-12">
                {appStructure.map((module, mIdx) => (
                    <div key={mIdx} className="relative">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/20 text-white">
                                <module.icon size={28} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{module.module}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{module.description}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pl-4 md:pl-0">
                            {module.features.map((feature, fIdx) => (
                                <div key={fIdx} className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl p-5 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            {feature.icon ? <feature.icon size={20} className="text-blue-500" /> : <Layers size={20} className="text-blue-500" />}
                                            <h4 className="font-semibold text-gray-800 dark:text-gray-200">{feature.name}</h4>
                                        </div>
                                        {feature.status && (
                                            <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${getStatusColor(feature.status)}`}>
                                                {feature.status}
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 h-10">
                                        {feature.description}
                                    </p>

                                    <div className="space-y-2">
                                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Capabilities</div>
                                        <ul className="space-y-1.5">
                                            {feature.actions.map((action, aIdx) => (
                                                <li key={aIdx} className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2">
                                                    <ChevronRight size={14} className="mt-0.5 text-gray-400 shrink-0" />
                                                    <span className="leading-tight">{action}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {/* Connecting Line (Visual Flair) */}
                        {mIdx !== appStructure.length - 1 && (
                            <div className="absolute left-6 top-16 bottom-[-3rem] w-0.5 bg-gray-200 dark:bg-neutral-800 -z-10 hidden md:block"></div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AppMap;
