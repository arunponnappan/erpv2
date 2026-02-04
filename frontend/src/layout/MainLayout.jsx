import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'; // Added useLocation
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    Users,
    Settings,
    LogOut,
    UserCircle,
    ChevronLeft,
    ChevronRight,
    Menu,
    Bell,
    ChevronDown,
    Building2,
    ShieldCheck,
    Sun,
    Moon,
    Palette,
    User,
    Briefcase,
    Map,
    Plus,
    ShoppingBag,
    Box,
    BookOpen,
    Bug
} from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import { useLayout } from '../context/LayoutContext';
import { useTheme } from '../context/ThemeContext';
import { useDebug } from '../context/DebugContext';

const SidebarItem = ({ to, icon: Icon, label, collapsed, onClick, actionIcon: ActionIcon, onAction }) => (
    <div className="relative group w-full">
        <NavLink
            to={to}
            onClick={onClick}
            className={({ isActive }) =>
                `flex items-center gap-x-3.5 py-2 px-2.5 text-sm text-gray-700 rounded-lg hover:bg-gray-100 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-300 ${isActive ? 'bg-gray-100 text-blue-600 dark:bg-neutral-700 dark:text-blue-500' : ''} ${collapsed ? 'justify-center' : ''}`
            }
            title={label}
        >
            <Icon size={20} className="shrink-0" />
            {!collapsed && <span className="flex-1 truncate">{label}</span>}
        </NavLink>
        {/* Quick Action Button */}
        {!collapsed && ActionIcon && (
            <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onAction && onAction();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-blue-600 rounded-md hover:bg-white dark:hover:bg-neutral-600 dark:hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all z-10"
                title={`Add ${label}`}
            >
                <ActionIcon size={16} />
            </button>
        )}
    </div>
);

const MainLayout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [userDropdownOpen, setUserDropdownOpen] = useState(false);
    const userDropdownRef = useRef(null);

    // Close User Dropdown on Click Outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
                setUserDropdownOpen(false);
            }
        };

        if (userDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [userDropdownOpen]);

    const { companies, currentCompany, selectCompany, installedApps } = useCompany();
    const { title, actions, setHeader } = useLayout(); // Destructure setHeader
    const { theme, toggleTheme } = useTheme();
    const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
    const { isDebugEnabled, toggleDebug } = useDebug();
    const location = useLocation(); // Get location

    // Reset Header on Route Change
    useEffect(() => {
        // Optional: only reset if you want a blank state between transitions
        // or set a default. For now, let's keep it clean or set to Company Name.
        // setHeader(''); 
        // Actually, let's NOT clear it proactively if we want smooth transitions, 
        // BUT the user complaint is "header not changing".
        // A safety reset is good.
        setHeader('');
    }, [location.pathname, setHeader]);

    // Check if Employees module is installed
    const isEmployeesInstalled = installedApps?.some(inst => inst.app.name === 'Employees');

    // Branding State
    const [branding, setBranding] = useState({
        company_name: 'Internal App',
        logo_url: null,
        footer_text: null
    });

    useEffect(() => {
        if (currentCompany) {
            setBranding({
                company_name: currentCompany.name,
                logo_url: currentCompany.logo_url,
                footer_text: currentCompany.footer_text || "© 2024 All Rights Reserved"
            });
            if (currentCompany.primary_color) {
                document.documentElement.style.setProperty('--primary', currentCompany.primary_color);
            }
            document.title = `${currentCompany.name} - Portal`;
        }
    }, [currentCompany]);

    const handleLogout = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        console.log("MainLayout: handleLogout clicked");
        logout();
    };

    const handleMobileClick = () => {
        if (window.innerWidth <= 768) {
            setMobileOpen(false);
        }
    };

    return (
        <div className="bg-gray-50 dark:bg-neutral-900 min-h-screen font-sans">
            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-50 bg-gray-900/50 lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 start-0 bottom-0 z-[60] bg-white border-e border-gray-200 pt-7 pb-10 overflow-y-auto transition-all duration-300 transform dark:bg-neutral-800 dark:border-neutral-700 ${collapsed ? 'w-20' : 'w-64'
                    } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
            >
                <div className={`px-6 flex items-center justify-between mb-8 ${collapsed ? 'justify-center px-2' : ''}`}>
                    {!collapsed ? (
                        <div className="font-bold text-xl text-gray-800 dark:text-white truncate">
                            {branding.logo_url ? (
                                <img src={branding.logo_url} alt="Logo" className="max-h-8" />
                            ) : (
                                branding.company_name
                            )}
                        </div>
                    ) : (
                        <div className="font-bold text-xl text-blue-600 dark:text-blue-500">
                            {branding.company_name.charAt(0)}
                        </div>
                    )}

                    {/* Toggle Button (Desktop only) */}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className={`hidden lg:flex items-center justify-center p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-neutral-700 ${collapsed ? 'absolute top-6 start-1/2 -translate-x-1/2 mt-12' : ''}`}
                    >
                        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>
                    {/* Close Button (Mobile only) */}
                    <button
                        onClick={() => setMobileOpen(false)}
                        className="lg:hidden text-gray-500"
                    >
                        <ChevronLeft size={24} />
                    </button>
                </div>

                <nav className="p-4 w-full flex flex-col flex-wrap gap-y-2" data-hs-accordion-always-open>
                    <SidebarItem
                        to="/"
                        icon={LayoutDashboard}
                        label="Dashboard"
                        collapsed={collapsed}
                        onClick={handleMobileClick}
                    />

                    {['super_admin', 'admin'].includes(user?.role) && (
                        <>
                            <div className={`mt-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider dark:text-neutral-500 ${collapsed ? 'text-center' : 'px-2'}`}>
                                {collapsed ? 'HR' : 'Human Resources'}
                            </div>

                            {isEmployeesInstalled && (
                                <SidebarItem
                                    to="/employees"
                                    icon={Briefcase}
                                    label="Employees"
                                    collapsed={collapsed}
                                    onClick={handleMobileClick}
                                    actionIcon={Plus}
                                    onAction={() => navigate('/employees/new')}
                                />
                            )}

                            <SidebarItem
                                to="/users"
                                icon={Users}
                                label="User Management"
                                collapsed={collapsed}
                                onClick={handleMobileClick}
                                actionIcon={Plus}
                                onAction={() => navigate('/users?action=create')}
                            />
                        </>
                    )}

                    <div className={`mt-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider dark:text-neutral-500 ${collapsed ? 'text-center' : 'px-2'}`}>
                        {collapsed ? 'App' : 'Apps'}
                    </div>

                    <SidebarItem
                        to="/marketplace"
                        icon={ShoppingBag}
                        label="Marketplace"
                        collapsed={collapsed}
                        onClick={handleMobileClick}
                    />
                    <SidebarItem
                        to="/apps"
                        icon={Box}
                        label="Installed Apps"
                        collapsed={collapsed}
                        onClick={handleMobileClick}
                    />

                    <div className={`mt-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider dark:text-neutral-500 ${collapsed ? 'text-center' : 'px-2'}`}>
                        {collapsed ? 'Sys' : 'System'}
                    </div>


                    {['super_admin', 'admin'].includes(user?.role) && (
                        <>
                            <SidebarItem
                                to="/system/roles"
                                icon={ShieldCheck}
                                label="Roles & Permissions"
                                collapsed={collapsed}
                                onClick={handleMobileClick}
                            />
                            <SidebarItem
                                to="/system/user-guide"
                                icon={BookOpen}
                                label="User Guide"
                                collapsed={collapsed}
                                onClick={handleMobileClick}
                            />
                            <SidebarItem
                                to="/system/config"
                                icon={Settings}
                                label="Configuration"
                                collapsed={collapsed}
                                onClick={handleMobileClick}
                            />
                            <SidebarItem
                                to="/ui-elements"
                                icon={Palette}
                                label="UI Elements"
                                collapsed={collapsed}
                                onClick={handleMobileClick}
                            />
                            <SidebarItem
                                to="/system/map"
                                icon={Map}
                                label="App Map"
                                collapsed={collapsed}
                                onClick={handleMobileClick}
                            />
                        </>
                    )}
                </nav>


            </aside>

            {/* Header */}
            <header className={`fixed top-0 z-40 flex h-16 w-full items-center border-b border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 transition-all duration-300 ${collapsed ? 'lg:ps-20' : 'lg:ps-64'}`}>
                <div className="flex w-full items-center justify-between px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            className="text-gray-500 hover:text-gray-600 lg:hidden"
                            onClick={() => setMobileOpen(true)}
                        >
                            <Menu size={24} />
                        </button>
                        {title && (
                            <div className="hidden md:block">
                                {typeof title === 'string' ? (
                                    <h1 className="text-xl font-bold text-gray-800 dark:text-white">{title}</h1>
                                ) : (
                                    title
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        {actions && <div className="flex gap-2">{actions}</div>}

                        {/* Company Switcher */}
                        {companies && companies.length > 0 && user?.role === 'super_admin' && (
                            <div className="relative">
                                <button
                                    className="flex items-center gap-2 py-2 px-3 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors dark:bg-neutral-800 dark:border-neutral-700 dark:hover:bg-neutral-700 text-sm font-medium text-gray-800 dark:text-neutral-200"
                                    onClick={() => setCompanyDropdownOpen(!companyDropdownOpen)}
                                >
                                    <Building2 size={16} className="text-gray-500 dark:text-neutral-400" />
                                    <span className="hidden sm:inline-block">{currentCompany ? currentCompany.name : 'Select Company'}</span>
                                    <ChevronDown size={14} className="text-gray-400" />
                                </button>
                                {companyDropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-50 dark:bg-neutral-800 dark:border-neutral-700">
                                        {companies.map(company => (
                                            <button
                                                key={company.id}
                                                onClick={() => {
                                                    selectCompany(company.id);
                                                    setCompanyDropdownOpen(false);
                                                }}
                                                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-neutral-700 ${currentCompany?.id === company.id ? 'text-blue-600 font-semibold bg-blue-50 dark:bg-neutral-700/50' : 'text-gray-700 dark:text-neutral-300'}`}
                                            >
                                                {company.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            onClick={toggleDebug}
                            className={`p-2 rounded-full focus:outline-none transition-colors ${isDebugEnabled ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'text-gray-500 hover:bg-gray-100 dark:text-neutral-400 dark:hover:bg-neutral-700'}`}
                            title="Toggle Debug Mode"
                        >
                            <Bug size={20} />
                        </button>

                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-neutral-400 dark:hover:bg-neutral-700 focus:outline-none"
                        >
                            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-neutral-400 dark:hover:bg-neutral-700 focus:outline-none relative">
                            <Bell size={20} />
                            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 border border-white dark:border-neutral-800"></span>
                        </button>

                        <div className="relative" ref={userDropdownRef}>
                            <button
                                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                                className="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-neutral-700 p-1.5 rounded-lg transition-colors"
                            >
                                <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
                                    {user?.full_name?.[0] || 'U'}
                                </div>
                                <div className="hidden sm:block text-start">
                                    <p className="text-sm font-medium text-gray-800 dark:text-white leading-none">{user?.full_name}</p>
                                    <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">{user?.role?.replace('_', ' ')}</p>
                                </div>
                                <ChevronDown size={14} className="text-gray-400" />
                            </button>

                            {userDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-50 dark:bg-neutral-800 dark:border-neutral-700">
                                    <div className="p-3 border-b border-gray-200 dark:border-neutral-700">
                                        <p className="text-sm font-medium text-gray-800 dark:text-white">{user?.full_name}</p>
                                        <p className="text-xs text-gray-500 dark:text-neutral-400 truncate">{user?.email}</p>
                                    </div>
                                    <div className="p-1">
                                        <button
                                            onClick={() => {
                                                navigate('/profile');
                                                setUserDropdownOpen(false);
                                            }}
                                            className="w-full text-left flex items-center gap-x-3.5 py-2 px-3 rounded-lg text-sm text-gray-800 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
                                        >
                                            <UserCircle size={16} /> Profile
                                        </button>
                                        {['super_admin', 'admin'].includes(user?.role) && (
                                            <button
                                                onClick={() => {
                                                    navigate('/system/config');
                                                    setUserDropdownOpen(false);
                                                }}
                                                className="w-full text-left flex items-center gap-x-3.5 py-2 px-3 rounded-lg text-sm text-gray-800 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
                                            >
                                                <Settings size={16} /> Settings
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                handleLogout(e);
                                                setUserDropdownOpen(false);
                                            }}
                                            className="w-full text-left flex items-center gap-x-3.5 py-2 px-3 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:text-red-500 dark:hover:bg-red-900/10"
                                        >
                                            <LogOut size={16} /> Sign Out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Content Body */}
            <main className={`w-full pt-16 px-4 sm:px-6 lg:px-8 pb-6 transition-all duration-300 ${collapsed ? 'lg:ps-20' : 'lg:ps-64'}`}>
                <div className="mt-4">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default MainLayout;
