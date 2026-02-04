import { useState, useEffect } from "react";
import { useLayout } from "../context/LayoutContext";
import { useToast } from "../context/ToastContext";
import Breadcrumb from "../components/Breadcrumb";
import Modal from "../components/Modal";
import {
    Bell, CheckCircle, XCircle, AlertTriangle, Info, ChevronDown, Search, Plus,
    Trash2, Edit2, Loader2, Moon, Sun, Palette, Wifi, WifiOff, RefreshCw,
    MoreVertical, Filter, ArrowLeft, ArrowRight, Upload, X, Check, Save,
    Download, Share2, Grid, List, ChevronLeft, ChevronRight as ChevronRightIcon
} from "lucide-react";

// Helper components
const Section = ({ title, children, id }) => (
    <section id={id} className="mb-12 animate-fade-in-up scroll-mt-24">
        <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white border-b-2 border-blue-500 pb-1">
                {title}
            </h2>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
            {children}
        </div>
    </section>
);

const ComponentGroup = ({ label, children, className = "" }) => (
    <div className={`mb-8 last:mb-0 ${className}`}>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            {label}
            <span className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></span>
        </h3>
        <div className="flex flex-wrap items-center gap-4">{children}</div>
    </div>
);

const UiElements = () => {
    const { setHeader } = useLayout();
    const toast = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // UI States for Demos
    const [toggleState, setToggleState] = useState(false);
    const [viewMode, setViewMode] = useState('grid'); // Button Group Demo
    const [activeTab, setActiveTab] = useState('profile');

    useEffect(() => {
        setHeader(
            <Breadcrumb items={[{ label: 'System' }, { label: 'UI Elements' }]} />,
            <button className="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:bg-gray-700">
                <Palette size={16} />
                Theme Preview
            </button>
        );
    }, [setHeader]);

    const handleSimulateLoad = () => {
        setIsLoading(true);
        setTimeout(() => setIsLoading(false), 2000);
    };

    return (
        <div className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14 mx-auto">
            {/* Quick Nav */}
            <div className="hidden lg:flex fixed right-8 top-32 flex-col gap-2 p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm z-10 w-48">
                <span className="text-xs font-bold uppercase text-gray-500 mb-2">Jump To</span>
                {['Buttons', 'Navigation', 'Inputs', 'Feedback', 'Overlays', 'Data Display'].map(item => (
                    <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`} className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        {item}
                    </a>
                ))}
            </div>

            <div className="mb-10 max-w-2xl">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Design System</h1>
                <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                    The single source of truth for UI components, ensuring
                    consistency, accessibility, and visual harmony across the application.
                    <span className="block mt-2 text-sm text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md w-fit">
                        Built with Preline UI
                    </span>
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4">

                {/* TYPOGRAPHY */}
                <Section title="Typography" id="typography">
                    <ComponentGroup label="Headings">
                        <div className="space-y-4">
                            <div>
                                <h1 className="text-4xl font-bold text-gray-800 dark:text-white">Heading 1</h1>
                                <span className="text-xs text-gray-400">text-4xl font-bold</span>
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Heading 2</h2>
                                <span className="text-xs text-gray-400">text-3xl font-bold</span>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Heading 3</h3>
                                <span className="text-xs text-gray-400">text-2xl font-bold</span>
                            </div>
                            <div>
                                <h4 className="text-xl font-bold text-gray-800 dark:text-white">Heading 4</h4>
                                <span className="text-xs text-gray-400">text-xl font-bold</span>
                            </div>
                        </div>
                    </ComponentGroup>

                    <div className="grid md:grid-cols-2 gap-8">
                        <ComponentGroup label="Body Text">
                            <div className="space-y-4">
                                <p className="text-gray-800 dark:text-gray-200">
                                    <span className="font-semibold block mb-1">Regular Paragraph</span>
                                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    <span className="font-semibold block mb-1">Small Text</span>
                                    Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                                </p>
                            </div>
                        </ComponentGroup>

                        <ComponentGroup label="Decorated Text">
                            <div className="space-y-4">
                                <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-700 dark:text-gray-300">
                                    "This is a blockquote for emphasizing impactful statements or testimonials."
                                </blockquote>
                                <div className="bg-gray-100 dark:bg-neutral-900 p-3 rounded-md font-mono text-sm text-gray-800 dark:text-gray-200">
                                    <span className="text-blue-600">const</span> message = <span className="text-green-600">"Hello World"</span>;
                                </div>
                                <div>
                                    <a href="#" className="text-blue-600 hover:underline dark:text-blue-500">Inline Anchor Link</a>
                                </div>
                            </div>
                        </ComponentGroup>
                    </div>
                </Section>

                {/* BUTTONS & ACTIONS */}
                <Section title="Buttons & Actions" id="buttons">
                    <ComponentGroup label="Standard Variations">
                        <button type="button" className="py-3 px-4 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none transition-all">
                            Primary Action
                        </button>
                        <button type="button" className="py-3 px-4 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-800 transition-all">
                            Secondary
                        </button>
                        <button type="button" className="py-3 px-4 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-transparent text-blue-600 hover:bg-blue-100/50 hover:text-blue-800 disabled:opacity-50 disabled:pointer-events-none dark:text-blue-500 dark:hover:text-blue-400 transition-all">
                            Ghost Button
                        </button>
                    </ComponentGroup>

                    <ComponentGroup label="Icon Buttons">
                        <button type="button" className="py-3 px-4 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5">
                            <Plus size={18} />
                            Create New
                        </button>
                        <button type="button" className="p-2 inline-flex justify-center items-center gap-x-2 text-sm font-medium rounded-full border border-transparent bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-500 dark:hover:bg-blue-900/50 transition-colors">
                            <Edit2 size={16} />
                        </button>
                        <button type="button" className="p-3 inline-flex justify-center items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50 hover:text-blue-600 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 transition-all">
                            <MoreVertical size={18} />
                        </button>
                    </ComponentGroup>

                    <ComponentGroup label="Button Groups (Segmented Control)">
                        <div className="inline-flex rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-900 p-1 gap-1">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`py-2 px-3 inline-flex justify-center items-center gap-2 rounded-md text-sm font-medium transition-all focus:outline-none ${viewMode === 'grid' ? 'bg-white dark:bg-neutral-800 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-neutral-300'}`}
                            >
                                <Grid size={16} />
                                Grid
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`py-2 px-3 inline-flex justify-center items-center gap-2 rounded-md text-sm font-medium transition-all focus:outline-none ${viewMode === 'list' ? 'bg-white dark:bg-neutral-800 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-neutral-300'}`}
                            >
                                <List size={16} />
                                List
                            </button>
                        </div>
                    </ComponentGroup>

                    <ComponentGroup label="Semantic Actions">
                        <button className="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-red-600 shadow-sm hover:bg-red-50 dark:bg-neutral-900 dark:border-neutral-700 dark:text-red-500 dark:hover:bg-red-900/10">
                            <Trash2 size={16} /> Delete
                        </button>
                        <button className="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-green-700 shadow-sm hover:bg-green-50 dark:bg-neutral-900 dark:border-neutral-700 dark:text-green-500 dark:hover:bg-green-900/10">
                            <Save size={16} /> Save Changes
                        </button>
                        <button className="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">
                            <Share2 size={16} /> Share
                        </button>
                    </ComponentGroup>
                </Section>

                {/* NAVIGATION */}
                <Section title="Navigation Properties" id="navigation">
                    <ComponentGroup label="Pagination">
                        <nav className="flex items-center gap-x-1">
                            <button type="button" className="min-h-[38px] min-w-[38px] py-2 px-2.5 inline-flex justify-center items-center gap-x-2 text-sm rounded-lg text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none dark:text-white dark:hover:bg-white/10 dark:focus:bg-white/10">
                                <ChevronLeft size={16} />
                                <span className="sr-only">Previous</span>
                            </button>
                            <div className="flex items-center gap-x-1">
                                <button type="button" className="min-h-[38px] min-w-[38px] flex justify-center items-center bg-gray-200 text-gray-800 py-2 px-3 text-sm rounded-lg focus:outline-none focus:bg-gray-300 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-600 dark:text-white dark:focus:bg-neutral-500">1</button>
                                <button type="button" className="min-h-[38px] min-w-[38px] flex justify-center items-center text-gray-800 hover:bg-gray-100 py-2 px-3 text-sm rounded-lg focus:outline-none focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none dark:text-white dark:hover:bg-white/10 dark:focus:bg-white/10">2</button>
                                <button type="button" className="min-h-[38px] min-w-[38px] flex justify-center items-center text-gray-800 hover:bg-gray-100 py-2 px-3 text-sm rounded-lg focus:outline-none focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none dark:text-white dark:hover:bg-white/10 dark:focus:bg-white/10">3</button>
                            </div>
                            <button type="button" className="min-h-[38px] min-w-[38px] py-2 px-2.5 inline-flex justify-center items-center gap-x-2 text-sm rounded-lg text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none dark:text-white dark:hover:bg-white/10 dark:focus:bg-white/10">
                                <ChevronRightIcon size={16} />
                                <span className="sr-only">Next</span>
                            </button>
                        </nav>
                    </ComponentGroup>

                    <ComponentGroup label="Section Tabs">
                        <div className="border-b border-gray-200 dark:border-neutral-700">
                            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                                {['Profile', 'Security', 'Billing', 'Notifications'].map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab.toLowerCase())}
                                        className={`
                                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all
                                            ${activeTab === tab.toLowerCase()
                                                ? 'border-blue-500 text-blue-600 dark:text-blue-500'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-neutral-400 dark:hover:text-neutral-300'}
                                        `}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </ComponentGroup>
                </Section>

                {/* INTERACTIVE & DROPDOWNS */}
                <Section title="Interactive Elements" id="dropdowns">
                    <ComponentGroup label="Dropdown Menus">
                        <div className="flex flex-wrap gap-4 min-h-[200px] items-start">
                            {/* Basic Dropdown */}
                            <div className="hs-dropdown relative inline-flex">
                                <button id="hs-dropdown-default" type="button" className="hs-dropdown-toggle py-3 px-4 inline-flex justify-center items-center gap-2 rounded-md border font-medium bg-white text-gray-700 shadow-sm align-middle hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-600 transition-all text-sm dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-gray-700 dark:text-gray-400 dark:hover:text-white dark:focus:ring-offset-gray-800">
                                    Actions
                                    <svg className="hs-dropdown-open:rotate-180 w-2.5 h-2.5 text-gray-600" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M2 5L8 11L14 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                                <div className="hs-dropdown-menu transition-[opacity,margin] duration hs-dropdown-open:opacity-100 opacity-0 hidden min-w-[15rem] bg-white shadow-md rounded-lg p-2 mt-2 dark:bg-gray-800 dark:border dark:border-gray-700" aria-labelledby="hs-dropdown-default">
                                    <a className="flex items-center gap-x-3.5 py-2 px-3 rounded-md text-sm text-gray-800 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300" href="#">
                                        Newsletter
                                    </a>
                                    <a className="flex items-center gap-x-3.5 py-2 px-3 rounded-md text-sm text-gray-800 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300" href="#">
                                        Purchases
                                    </a>
                                    <a className="flex items-center gap-x-3.5 py-2 px-3 rounded-md text-sm text-gray-800 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300" href="#">
                                        Downloads
                                    </a>
                                    <a className="flex items-center gap-x-3.5 py-2 px-3 rounded-md text-sm text-gray-800 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300" href="#">
                                        Team Account
                                    </a>
                                </div>
                            </div>

                            {/* Icon Dropdown */}
                            <div className="hs-dropdown relative inline-flex">
                                <button id="hs-dropdown-custom-icon" type="button" className="hs-dropdown-toggle p-3 inline-flex justify-center items-center gap-2 rounded-md border font-medium bg-white text-gray-700 shadow-sm align-middle hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-600 transition-all text-sm dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-gray-700 dark:text-gray-400 dark:hover:text-white dark:focus:ring-offset-gray-800">
                                    <MoreVertical size={16} />
                                </button>
                                <div className="hs-dropdown-menu transition-[opacity,margin] duration hs-dropdown-open:opacity-100 opacity-0 hidden min-w-[15rem] bg-white shadow-md rounded-lg p-2 mt-2 dark:bg-gray-800 dark:border dark:border-gray-700" aria-labelledby="hs-dropdown-custom-icon">
                                    <a className="flex items-center gap-x-3.5 py-2 px-3 rounded-md text-sm text-gray-800 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300" href="#">
                                        <Edit2 size={14} /> Edit Profile
                                    </a>
                                    <a className="flex items-center gap-x-3.5 py-2 px-3 rounded-md text-sm text-red-600 hover:bg-red-50 focus:ring-2 focus:ring-blue-500 dark:text-red-500 dark:hover:bg-red-900/10" href="#">
                                        <Trash2 size={14} /> Delete
                                    </a>
                                </div>
                            </div>
                        </div>
                    </ComponentGroup>
                </Section>

                {/* DATA ENTRY (CONT.) */}
                <Section title="Date & Time" id="date-time">
                    <ComponentGroup label="Native Pickers">
                        <div className="grid md:grid-cols-2 gap-8 w-full">
                            <div>
                                <label className="block text-sm font-medium mb-2 dark:text-white">Date Picker</label>
                                <input type="date" className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2 dark:text-white">Datetime Local</label>
                                <input type="datetime-local" className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600" />
                            </div>
                        </div>
                    </ComponentGroup>
                </Section>

                {/* ORIGINAL INPUTS & FILTERS */}
                <Section title="Data Entry & Filters" id="inputs">
                    <div className="grid md:grid-cols-2 gap-8">
                        <ComponentGroup label="Form Controls">
                            <div className="w-full space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2 dark:text-white">Text Input</label>
                                    <input type="text" className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600" placeholder="Type specific placeholder..." />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2 dark:text-white">Password</label>
                                    <input type="password" value="password123" readOnly className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400" />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2 dark:text-white">Select Menu</label>
                                    <select className="py-3 px-4 pe-9 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600">
                                        <option defaultValue>Open this select menu</option>
                                        <option>Option 1</option>
                                        <option>Option 2</option>
                                        <option>Option 3</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2 dark:text-white">Textarea</label>
                                    <textarea className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600" rows="3" placeholder="Leave a comment..."></textarea>
                                </div>
                            </div>
                        </ComponentGroup>

                        <ComponentGroup label="Validation States & Specialized">
                            <div className="w-full space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2 dark:text-white">Valid Input</label>
                                    <div className="relative">
                                        <input type="text" className="py-3 px-4 block w-full border-teal-500 rounded-lg text-sm focus:border-teal-500 focus:ring-teal-500 dark:bg-neutral-800 dark:border-teal-500 dark:text-gray-400" placeholder="Success state" />
                                        <div className="absolute inset-y-0 end-0 flex items-center pointer-events-none pe-3">
                                            <CheckCircle className="h-4 w-4 text-teal-500" />
                                        </div>
                                    </div>
                                    <p className="text-sm text-teal-600 mt-2">Looks good!</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2 dark:text-white">Invalid Input</label>
                                    <div className="relative">
                                        <input type="text" className="py-3 px-4 block w-full border-red-500 rounded-lg text-sm focus:border-red-500 focus:ring-red-500 dark:bg-neutral-800 dark:border-red-500 dark:text-gray-400" placeholder="Error state" />
                                        <div className="absolute inset-y-0 end-0 flex items-center pointer-events-none pe-3">
                                            <AlertTriangle className="h-4 w-4 text-red-500" />
                                        </div>
                                    </div>
                                    <p className="text-sm text-red-600 mt-2">Please enter a valid value.</p>
                                </div>

                                {/* Search Group */}
                                <div>
                                    <label className="block text-sm font-medium mb-2 dark:text-white">Complex Filter Group</label>
                                    <div className="flex rounded-lg shadow-sm">
                                        <div className="relative flex-grow focus-within:z-10">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Search className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                type="text"
                                                className="block w-full rounded-l-md border-0 py-2.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 dark:bg-neutral-800 dark:ring-neutral-700 dark:text-white"
                                                placeholder="Search entries..."
                                            />
                                        </div>
                                        <button type="button" className="-ml-px relative inline-flex items-center gap-x-1.5 rounded-r-md px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-neutral-800 dark:ring-neutral-700 dark:text-gray-300 dark:hover:bg-neutral-700">
                                            <Filter className="-ml-0.5 h-4 w-4 text-gray-400" aria-hidden="true" />
                                            Filters
                                            <ChevronDown className="-mr-1 h-5 w-5 text-gray-400" aria-hidden="true" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </ComponentGroup>
                    </div>

                    <div className="mt-8 grid md:grid-cols-2 gap-8">
                        <ComponentGroup label="File Upload">
                            <div className="flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10 dark:border-neutral-600">
                                <div className="text-center">
                                    <Upload className="mx-auto h-12 w-12 text-gray-300" aria-hidden="true" />
                                    <div className="mt-4 flex text-sm leading-6 text-gray-600 dark:text-gray-400">
                                        <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500">
                                            <span>Upload a file</span>
                                            <input id="file-upload" name="file-upload" type="file" className="sr-only" />
                                        </label>
                                        <p className="pl-1">or drag and drop</p>
                                    </div>
                                    <p className="text-xs leading-5 text-gray-600 dark:text-gray-400">PNG, JPG, GIF up to 10MB</p>
                                </div>
                            </div>
                        </ComponentGroup>

                        <ComponentGroup label="Switches & Toggles">
                            <div className="space-y-4">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={toggleState} onChange={() => setToggleState(!toggleState)} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                    <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">Email Notifications</span>
                                </label>

                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Radio Group</label>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <input type="radio" name="role" id="r-admin" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                                            <label htmlFor="r-admin" className="text-sm font-medium text-gray-900 dark:text-gray-300">Admin</label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input type="radio" name="role" id="r-user" defaultChecked className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                                            <label htmlFor="r-user" className="text-sm font-medium text-gray-900 dark:text-gray-300">User</label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ComponentGroup>
                    </div>
                </Section>

                {/* FEEDBACK */}
                <Section title="Feedback & States" id="feedback">
                    <ComponentGroup label="Loaders & Spinners">
                        <div className="flex items-center gap-8">
                            <div className="text-center">
                                <Loader2 className="animate-spin text-blue-600 h-8 w-8" />
                                <span className="text-xs text-gray-500 mt-2 block">Lucide Spin</span>
                            </div>

                            <div className="text-center">
                                <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span className="text-xs text-gray-500 mt-2 block">SVG Ring</span>
                            </div>

                            <div className="text-center">
                                <button onClick={handleSimulateLoad} disabled={isLoading} className="py-2 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold flex items-center gap-2">
                                    {isLoading ? <><Loader2 className="animate-spin h-4 w-4" /> Saving...</> : 'Click to Load'}
                                </button>
                            </div>
                        </div>
                    </ComponentGroup>

                    <ComponentGroup label="Toast Notifications (Interactive)">
                        <div className="flex gap-4">
                            <button onClick={() => toast.success("Operation Successful", "The data has been saved.")} className="py-2 px-3 bg-teal-100 text-teal-800 text-sm font-medium rounded-lg hover:bg-teal-200">
                                Trigger Success
                            </button>
                            <button onClick={() => toast.error("Connection Failed", "Unable to reach the server.")} className="py-2 px-3 bg-red-100 text-red-800 text-sm font-medium rounded-lg hover:bg-red-200">
                                Trigger Error
                            </button>
                            <button onClick={() => toast.info("New Update", "Version 2.0 is available.")} className="py-2 px-3 bg-blue-100 text-blue-800 text-sm font-medium rounded-lg hover:bg-blue-200">
                                Trigger Info
                            </button>
                        </div>
                    </ComponentGroup>

                    <ComponentGroup label="Connection States">
                        <span className="inline-flex items-center gap-x-1.5 py-1.5 px-3 rounded-full text-xs font-bold uppercase tracking-wide bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <Wifi size={14} /> Connected
                        </span>
                        <span className="inline-flex items-center gap-x-1.5 py-1.5 px-3 rounded-full text-xs font-bold uppercase tracking-wide bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            <WifiOff size={14} /> Error
                        </span>
                        <span className="inline-flex items-center gap-x-1.5 py-1.5 px-3 rounded-full text-xs font-bold uppercase tracking-wide bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                            <RefreshCw size={14} className="animate-spin" /> Checking...
                        </span>
                    </ComponentGroup>
                </Section>

                {/* OVERLAYS */}
                <Section title="Overlays & Modals" id="overlays">
                    <ComponentGroup label="Modal Dialog">
                        <button onClick={() => setIsModalOpen(true)} className="py-3 px-4 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none">
                            Open Demo Modal
                        </button>
                    </ComponentGroup>

                    <ComponentGroup label="Empty States">
                        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-xl w-full max-w-sm mx-auto">
                            <div className="bg-gray-50 p-4 rounded-full mb-4 dark:bg-gray-800">
                                <Search className="h-8 w-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No items found</h3>
                            <p className="text-sm text-gray-500 text-center mt-1 mb-4">You haven't added any items yet. Start by creating a new one.</p>
                            <button className="text-sm font-medium text-blue-600 hover:text-blue-500">
                                Create New Item &rarr;
                            </button>
                        </div>
                    </ComponentGroup>
                </Section>

            </div>

            {/* Modal Implementation */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Modal Component">
                <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-300">
                        This is a reusable modal component. It handles the backdrop blur, centering, and accessibility features automatically.
                    </p>
                    <div className="p-4 bg-gray-50 rounded-lg dark:bg-neutral-900 border border-gray-100 dark:border-neutral-700">
                        <h4 className="text-sm font-bold text-gray-800 mb-2 dark:text-white">Features:</h4>
                        <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400">
                            <li>Backdrop Click to Close</li>
                            <li>Sticky Header</li>
                            <li>Scrollable Content Area</li>
                            <li>Dark Mode Compatible</li>
                        </ul>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <button onClick={() => setIsModalOpen(false)} className="py-2 px-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                            Cancel
                        </button>
                        <button onClick={() => { toast.success("Confirmed", "Action taken inside modal"); setIsModalOpen(false); }} className="py-2 px-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                            Confirm Action
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default UiElements;
