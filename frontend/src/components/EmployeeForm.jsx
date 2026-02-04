
import { useState, useEffect } from 'react';
import api from '../services/api';
import { Loader2, Save, ArrowLeft, ArrowRight, Check, User, Briefcase, Lock, Plus, Building2, Eye, EyeOff, Phone, Mail, MapPin, Calendar, Globe } from 'lucide-react';
// css module removed
import { useCompany } from '../context/CompanyContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const EmployeeForm = ({ employeeToEdit, onSubmit, onCancel }) => {
    const { user: currentUser } = useAuth();
    const { currentCompany } = useCompany();
    const toast = useToast();
    const [currentStep, setCurrentStep] = useState(1);
    const [stepTouched, setStepTouched] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        // Personal
        first_name: '',
        middle_name: '',
        last_name: '',
        date_of_birth: '',
        gender: '',
        marital_status: '',
        blood_group: '',
        national_id_number: '',

        // Contact
        work_email: '',
        personal_email: '',
        mobile_phone: '',
        address_line1: '',
        address_city: '',
        address_state: '',
        address_country: '',
        address_zip: '',

        // Work
        joining_date: new Date().toISOString().split('T')[0],
        branch_id: '',
        department_id: '',
        job_role_id: '', // Renamed from job_position_id
        designation_id: '', // New Field
        employment_type_id: '',
        reporting_manager_id: '',

        // Emergency
        emergency_contact_name: '',
        emergency_contact_phone: '',
        emergency_contact_relation: '',

        user_id: ''
    });

    const [createLogin, setCreateLogin] = useState(false);
    const [userCreds, setUserCreds] = useState({
        username: '',
        password: '',
        confirm_password: '', // Kept in state to avoid breakage if used elsewhere, but effectively unused
        role: 'staff'
    });

    const [departments, setDepartments] = useState([]);
    const [branches, setBranches] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [designations, setDesignations] = useState([]); // New state
    const [empTypes, setEmpTypes] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]); // Dynamic Roles

    // Quick Create State
    const [quickModal, setQuickModal] = useState({ show: false, type: '', data: {} });
    const closeQuickModal = () => setQuickModal({ show: false, type: '', data: {} });
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [deptRes, userRes, jobRes, desigRes, empTypeRes, empRes, branchRes, roleRes] = await Promise.all([
                    api.get('/org/departments/', { params: { company_id: currentCompany?.id } }),
                    api.get('/users/'),
                    api.get('/org/job-roles/', { params: { company_id: currentCompany?.id } }),
                    api.get('/org/designations/', { params: { company_id: currentCompany?.id } }),
                    api.get('/hr/employment-types/'),
                    api.get('/hr/employees/', { params: { company_id: currentCompany?.id } }),
                    api.get('/org/branches/', { params: { company_id: currentCompany?.id } }),
                    api.get('/roles', { params: { company_id: currentCompany?.id } })
                ]);
                setDepartments(deptRes.data);
                setUsers(userRes.data);
                setJobs(jobRes.data);
                setDesignations(desigRes.data);
                setEmpTypes(empTypeRes.data);
                setEmployees(empRes.data);
                setBranches(branchRes.data);
                setRoles(roleRes.data);

                if (employeeToEdit) {
                    // Find linked user to populate credentials
                    let linkedUser = null;
                    if (employeeToEdit.user_id) {
                        linkedUser = userRes.data.find(u => u.id === employeeToEdit.user_id);
                        if (linkedUser) {
                            setCreateLogin(true);
                            setUserCreds({
                                username: linkedUser.username,
                                password: '', // Don't populate password for security, let them leave blank to keep
                                role: linkedUser.role,
                                confirm_password: ''
                            });
                        }
                    }

                    setFormData({
                        ...employeeToEdit,
                        branch_id: employeeToEdit.branch_id || (employeeToEdit.department?.branch_id) || '',
                        department_id: employeeToEdit.department_id || '',
                        job_role_id: employeeToEdit.job_role_id || employeeToEdit.job_position_id || '',
                        designation_id: employeeToEdit.designation_id || '',
                        employment_type_id: employeeToEdit.employment_type_id || '',
                        reporting_manager_id: employeeToEdit.reporting_manager_id || '',
                        user_id: employeeToEdit.user_id || '',

                        // Populate role_id from linked user if available
                        role_id: linkedUser ? (linkedUser.role_id || '') : '',

                        middle_name: employeeToEdit.middle_name || '',
                        date_of_birth: employeeToEdit.date_of_birth || '',
                        gender: employeeToEdit.gender || '',
                        marital_status: employeeToEdit.marital_status || '',
                        blood_group: employeeToEdit.blood_group || '',
                        national_id_number: employeeToEdit.national_id_number || '',
                        personal_email: employeeToEdit.personal_email || '',
                        mobile_phone: employeeToEdit.mobile_phone || '',
                        address_line1: employeeToEdit.address_line1 || '',
                        address_city: employeeToEdit.address_city || '',
                        address_state: employeeToEdit.address_state || '',
                        address_country: employeeToEdit.address_country || '',
                        address_zip: employeeToEdit.address_zip || '',
                        emergency_contact_name: employeeToEdit.emergency_contact_name || '',
                        emergency_contact_phone: employeeToEdit.emergency_contact_phone || '',
                        emergency_contact_relation: employeeToEdit.emergency_contact_relation || '',
                    });
                }
            } catch (error) {
                console.error("Failed to load form data", error);
            } finally {
                setInitialLoading(false);
            }
        };
        fetchData();
    }, [employeeToEdit, currentCompany]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCredsChange = (e) => {
        const { name, value } = e.target;
        setUserCreds(prev => ({ ...prev, [name]: value }));
    };

    const isError = (fieldName) => {
        if (['username', 'password', 'role'].includes(fieldName)) {
            return stepTouched && !userCreds[fieldName];
        }
        return stepTouched && !formData[fieldName];
    };

    const validateStep = (step) => {
        setStepTouched(true);
        if (step === 1) {
            if (!formData.first_name) {
                toast.error("Required", "Please enter First Name");
                return false;
            }
        }
        if (step === 2) {
            // All fields relaxed
            return true;
        }
        if (step === 3) {
            if (createLogin) {
                if (!userCreds.username || !userCreds.password || !userCreds.role) {
                    toast.error("Required", "Please complete all login credentials");
                    return false;
                }
            }
        }
        return true;
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            setStepTouched(false);
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        setStepTouched(false);
        setCurrentStep(prev => prev - 1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Safety Check: If not on step 3, treat as "Next"
        if (currentStep !== 3) {
            handleNext();
            return;
        }

        if (!validateStep(3)) return;

        setLoading(true);
        const payload = {
            ...formData,
            company_id: currentCompany?.id,
            branch_id: formData.branch_id ? parseInt(formData.branch_id) : null,
            department_id: formData.department_id ? parseInt(formData.department_id) : null,
            job_role_id: formData.job_role_id ? parseInt(formData.job_role_id) : null,
            designation_id: formData.designation_id ? parseInt(formData.designation_id) : null,
            employment_type_id: formData.employment_type_id ? parseInt(formData.employment_type_id) : null,
            reporting_manager_id: formData.reporting_manager_id ? parseInt(formData.reporting_manager_id) : null,
            user_id: formData.user_id ? parseInt(formData.user_id) : null,
            create_user: createLogin,
            username: createLogin ? userCreds.username : null,
            user_password: createLogin ? userCreds.password : null,
            user_role: createLogin ? userCreds.role : null
        };

        if (payload.date_of_birth === '') payload.date_of_birth = null;
        if (payload.joining_date === '') payload.joining_date = null;

        await onSubmit(payload);
        setLoading(false);
    };

    const handleQuickAdd = async (e) => {
        e.preventDefault();
        try {
            const { type, data } = quickModal;
            let res;
            if (type === 'branch') {
                const code = data.code || data.name.toUpperCase().substring(0, 3);
                res = await api.post('/org/branches/', { ...data, code, company_id: currentCompany?.id, branch_type: 'branch' });
                setBranches([...branches, res.data]);
                setFormData(p => ({ ...p, branch_id: res.data.id }));
            } else if (type === 'dept') {
                res = await api.post('/org/departments/', { ...data, company_id: currentCompany?.id });
                setDepartments([...departments, res.data]);
                setFormData(p => ({ ...p, department_id: res.data.id }));
            } else if (type === 'job') {
                // Determine dept: either from form or implied? 
                // Job needs Dept ID. Step 2 form has department_id.
                // If user is adding a job, they likely selected a department first?
                // Or we ask for Dept in modal? Let's assume current selected Dept.
                if (!formData.department_id) { throw new Error("Please select a Department first."); }
                res = await api.post('/org/job-roles/', { ...data, department_id: formData.department_id });
                setJobs([...jobs, res.data]);
                setFormData(p => ({ ...p, job_role_id: res.data.id }));
            } else if (type === 'designation') {
                res = await api.post('/org/designations/', { ...data, company_id: currentCompany?.id });
                setDesignations([...designations, res.data]);
                setFormData(p => ({ ...p, designation_id: res.data.id }));
            }
            toast.success("Success", `${type} added.`);
            closeQuickModal();
        } catch (error) {
            console.error(error);
            toast.error("Error", error.message || "Failed to add item.");
        }
    };

    if (initialLoading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;

    const steps = [
        { id: 1, label: 'Personal & Contact', icon: User },
        { id: 2, label: 'Professional Details', icon: Briefcase },
        { id: 3, label: 'System Access', icon: Lock },
    ];

    return (
        <div className="w-full">

            {/* STEPPER */}
            {/* STEPPER */}
            {/* STEPPER */}
            <div className="mb-10">
                <div className="relative flex justify-between w-full max-w-3xl mx-auto">
                    {/* Connecting Line */}
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 dark:bg-neutral-700 -z-10 -translate-y-1/2 rounded-full"></div>
                    <div
                        className="absolute top-1/2 left-0 h-0.5 bg-blue-600 transition-all duration-500 ease-in-out -z-10 -translate-y-1/2 rounded-full"
                        style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                    ></div>

                    {steps.map((step) => {
                        const isCompleted = currentStep > step.id;
                        const isCurrent = currentStep === step.id;

                        return (
                            <div key={step.id} className="flex flex-col items-center group cursor-default">
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 bg-white dark:bg-neutral-900 ${isCompleted
                                        ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-110'
                                        : isCurrent
                                            ? 'border-blue-600 text-blue-600 ring-4 ring-blue-50 dark:ring-blue-900/20 scale-110'
                                            : 'border-gray-200 text-gray-300 dark:border-neutral-700 dark:text-neutral-600'
                                        }`}
                                >
                                    {isCompleted ? <Check size={20} className="animate-scaleIn" /> : <step.icon size={18} />}
                                </div>
                                <span
                                    className={`mt-3 text-xs font-semibold uppercase tracking-wider transition-colors duration-300 ${isCurrent ? 'text-blue-600 dark:text-blue-400 translate-y-0 opacity-100' : isCompleted ? 'text-gray-900 dark:text-gray-200' : 'text-gray-400 dark:text-neutral-500'
                                        }`}
                                >
                                    {step.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-5">

                {/* STEP 1: PERSONAL & CONTACT */}
                {/* STEP 1: PERSONAL & CONTACT */}
                {currentStep === 1 && (
                    <div className="animate-fadeIn">
                        <div className="space-y-8">
                            {/* Personal Details Section */}
                            <section>
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
                                    <User className="text-blue-500" size={20} />
                                    Personal Identification
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="group">
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 dark:text-neutral-400">First Name <span className="text-red-500">*</span></label>
                                        <input
                                            name="first_name"
                                            value={formData.first_name}
                                            onChange={handleChange}
                                            required
                                            className={`py-3 px-4 block w-full border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none bg-gray-50 focus:bg-white transition-all dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200 dark:focus:ring-neutral-600 ${isError('first_name') ? 'border-red-500 focus:border-red-500' : ''}`}
                                            placeholder="e.g. John"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 dark:text-neutral-400">Middle Name</label>
                                        <input
                                            name="middle_name"
                                            value={formData.middle_name}
                                            onChange={handleChange}
                                            className="py-3 px-4 block w-full border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 dark:text-neutral-400">Last Name</label>
                                        <input
                                            name="last_name"
                                            value={formData.last_name}
                                            onChange={handleChange}
                                            className={`py-3 px-4 block w-full border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200`}
                                            placeholder="e.g. Doe"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 dark:text-neutral-400">Date of Birth</label>
                                        <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} className="py-3 px-4 block w-full border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 dark:text-neutral-400">Gender</label>
                                        <select name="gender" value={formData.gender} onChange={handleChange} className="py-3 px-4 pe-9 block w-full border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200">
                                            <option value="">Select Gender</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 dark:text-neutral-400">Marital Status</label>
                                        <select name="marital_status" value={formData.marital_status} onChange={handleChange} className="py-3 px-4 pe-9 block w-full border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200">
                                            <option value="">Select Status</option>
                                            <option value="Single">Single</option>
                                            <option value="Married">Married</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 dark:text-neutral-400">Blood Group</label>
                                        <input name="blood_group" value={formData.blood_group} onChange={handleChange} placeholder="O+" className="py-3 px-4 block w-full border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 dark:text-neutral-400">National ID Number</label>
                                        <input name="national_id_number" value={formData.national_id_number} onChange={handleChange} className="py-3 px-4 block w-full border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200" />
                                    </div>
                                </div>
                            </section>

                            {/* Contact Details Section */}
                            <section className="pt-6 border-t border-gray-100 dark:border-neutral-700">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
                                    <Phone className="text-blue-500" size={20} />
                                    Contact Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 dark:text-neutral-400">Personal Email</label>
                                        <input type="email" name="personal_email" value={formData.personal_email} onChange={handleChange} className="py-3 px-4 block w-full border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200" placeholder="email@example.com" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 dark:text-neutral-400">Phone</label>
                                        <input name="mobile_phone" value={formData.mobile_phone} onChange={handleChange} className="py-3 px-4 block w-full border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200" placeholder="+1 (555) 000-0000" />
                                    </div>
                                </div>
                            </section>

                            {/* Address Section */}
                            <section className="pt-6 border-t border-gray-100 dark:border-neutral-700">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
                                    <Building2 className="text-blue-500" size={20} />
                                    Address
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 dark:text-neutral-400">Address Line 1</label>
                                        <input name="address_line1" value={formData.address_line1} onChange={handleChange} className="py-3 px-4 block w-full border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200" placeholder="Street Address" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 dark:text-neutral-400">City</label>
                                        <input name="address_city" value={formData.address_city} onChange={handleChange} className="py-3 px-4 block w-full border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 dark:text-neutral-400">State</label>
                                        <input name="address_state" value={formData.address_state} onChange={handleChange} className="py-3 px-4 block w-full border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 dark:text-neutral-400">Country</label>
                                        <input name="address_country" value={formData.address_country} onChange={handleChange} className="py-3 px-4 block w-full border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 dark:text-neutral-400">Zip/Post Code</label>
                                        <input name="address_zip" value={formData.address_zip} onChange={handleChange} className="py-3 px-4 block w-full border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200" />
                                    </div>
                                </div>
                            </section>

                            {/* Emergency Contact Section */}
                            <section className="pt-6 border-t border-gray-100 dark:border-neutral-700">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
                                    <Phone className="text-red-500" size={20} />
                                    Emergency Contact
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 dark:text-neutral-400">Contact Name</label>
                                        <input name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleChange} className="py-3 px-4 block w-full border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 dark:text-neutral-400">Relationship</label>
                                        <input name="emergency_contact_relation" value={formData.emergency_contact_relation} onChange={handleChange} className="py-3 px-4 block w-full border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 dark:text-neutral-400">Phone</label>
                                        <input name="emergency_contact_phone" value={formData.emergency_contact_phone} onChange={handleChange} className="py-3 px-4 block w-full border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200" />
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                )}

                {/* STEP 2: PROFESSIONAL */}
                {currentStep === 2 && (
                    <div className="animate-fadeIn">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                            {/* Structure Preview Card */}
                            <div className="md:col-span-2 mb-2">
                                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl shadow-blue-900/20 relative overflow-hidden">
                                    {/* Decorative circles */}
                                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-3xl"></div>
                                    <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-40 h-40 rounded-full bg-white/10 blur-2xl"></div>

                                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div>
                                            <div className="text-blue-100 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                                                Placement Preview
                                            </div>
                                            <h3 className="text-2xl font-bold text-white mb-1">
                                                {jobs.find(j => j.id == formData.job_role_id)?.name || 'Select Job Role'}
                                            </h3>
                                            <p className="text-blue-100 opacity-90">
                                                {designations.find(d => d.id == formData.designation_id)?.title || 'No Designation'}
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap gap-3">
                                            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2 flex items-center gap-3">
                                                <Building2 size={18} className="text-blue-200" />
                                                <div>
                                                    <div className="text-xs text-blue-200">Branch</div>
                                                    <div className="font-semibold text-sm">{branches.find(b => b.id == formData.branch_id)?.name || '---'}</div>
                                                </div>
                                            </div>
                                            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2 flex items-center gap-3">
                                                <Briefcase size={18} className="text-blue-200" />
                                                <div>
                                                    <div className="text-xs text-blue-200">Department</div>
                                                    <div className="font-semibold text-sm">{departments.find(d => d.id == formData.department_id)?.name || '---'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4 mt-2">
                                    <Briefcase className="text-blue-500" size={20} />
                                    Job Details
                                </h3>
                            </div>

                            <div className="flex gap-2 items-end group">
                                <div className="flex-1">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 dark:text-neutral-400">Branch</label>
                                    <select name="branch_id" value={formData.branch_id} onChange={handleChange} className="py-3 px-4 pe-9 block w-full border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200">
                                        <option value="">Select Branch</option>
                                        {branches.filter(b => b.company_id === currentCompany?.id).map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <button type="button" onClick={() => setQuickModal({ show: true, type: 'branch', data: { name: '', code: '' } })} className="mb-0.5 w-[46px] h-[46px] flex justify-center items-center rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors bg-white dark:bg-neutral-800 dark:border-neutral-700 dark:hover:bg-neutral-700 dark:text-neutral-400 shadow-sm"><Plus size={20} /></button>
                            </div>
                            <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 dark:text-neutral-400">Department</label>
                                    <select name="department_id" value={formData.department_id} onChange={handleChange} className="py-3 px-4 pe-9 block w-full border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200">
                                        <option value="">Select Department</option>
                                        {departments
                                            .filter(d => d.company_id == currentCompany?.id) // Global Depts
                                            .map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <button type="button" onClick={() => setQuickModal({ show: true, type: 'dept', data: { name: '' } })} className="mb-0.5 w-[46px] h-[46px] flex justify-center items-center rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors bg-white dark:bg-neutral-800 dark:border-neutral-700 dark:hover:bg-neutral-700 dark:text-neutral-400 shadow-sm"><Plus size={20} /></button>
                            </div>
                            <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 dark:text-neutral-400">Job Role</label>
                                    <select
                                        name="job_role_id"
                                        value={formData.job_role_id}
                                        onChange={handleChange}
                                        className={`py-3 px-4 pe-9 block w-full border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200`}
                                    >
                                        <option value="">Select Job Role</option>
                                        {jobs
                                            .filter(j => !formData.department_id || j.department_id == formData.department_id)
                                            .map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                                    </select>
                                </div>
                                <button type="button" onClick={() => {
                                    if (!formData.department_id) toast.error("Select Dept first");
                                    else setQuickModal({ show: true, type: 'job', data: { name: '' } });
                                }} className="mb-0.5 w-[46px] h-[46px] flex justify-center items-center rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors bg-white dark:bg-neutral-800 dark:border-neutral-700 dark:hover:bg-neutral-700 dark:text-neutral-400 shadow-sm"><Plus size={20} /></button>
                            </div>
                            <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 dark:text-neutral-400">Designation</label>
                                    <select
                                        name="designation_id"
                                        value={formData.designation_id}
                                        onChange={handleChange}
                                        className="py-3 px-4 pe-9 block w-full border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200"
                                    >
                                        <option value="">Select Designation</option>
                                        {designations
                                            .filter(d => d.company_id == currentCompany?.id)
                                            .map(d => <option key={d.id} value={d.id}>{d.title} (L{d.level})</option>)}
                                    </select>
                                </div>
                                <button type="button" onClick={() => setQuickModal({ show: true, type: 'designation', data: { title: '', level: 1 } })} className="mb-0.5 w-[46px] h-[46px] flex justify-center items-center rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors bg-white dark:bg-neutral-800 dark:border-neutral-700 dark:hover:bg-neutral-700 dark:text-neutral-400 shadow-sm"><Plus size={20} /></button>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 dark:text-neutral-400">Employment Type</label>
                                <select name="employment_type_id" value={formData.employment_type_id} onChange={handleChange} className="py-3 px-4 pe-9 block w-full border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200">
                                    <option value="">Select Type</option>
                                    {empTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 dark:text-neutral-400">Reporting Manager</label>
                                <select name="reporting_manager_id" value={formData.reporting_manager_id} onChange={handleChange} className="py-3 px-4 pe-9 block w-full border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200">
                                    <option value="">Select Manager</option>
                                    {employees.filter(e => e.id !== (employeeToEdit?.id)).map(e => (
                                        <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 dark:text-neutral-400">Work Email</label>
                                <input
                                    type="email"
                                    name="work_email"
                                    value={formData.work_email}
                                    onChange={handleChange}
                                    className="py-3 px-4 block w-full border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200"
                                    placeholder="work@company.com"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 dark:text-neutral-400">Date of Joining</label>
                                <input
                                    type="date"
                                    name="joining_date"
                                    value={formData.joining_date}
                                    onChange={handleChange}
                                    className={`py-3 px-4 block w-full border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200`}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 3: SYSTEM ACCESS */}
                {currentStep === 3 && (
                    <div className="space-y-6 animate-fadeIn">
                        {!employeeToEdit && !formData.user_id && (
                            <div className="p-1">
                                <label className={`flex items-center gap-4 cursor-pointer p-6 border-2 rounded-2xl transition-all duration-300 ${createLogin ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'border-gray-200 hover:border-gray-300 dark:border-neutral-700'}`}>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${createLogin ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white dark:bg-neutral-800'}`}>
                                        {createLogin && <Check size={14} />}
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={createLogin}
                                        onChange={(e) => {
                                            setCreateLogin(e.target.checked);
                                            if (e.target.checked) setFormData(p => ({ ...p, user_id: '' }));
                                        }}
                                    />
                                    <div>
                                        <div className="font-bold text-gray-900 dark:text-white mb-0.5">Grant Portal Access</div>
                                        <div className="text-sm text-gray-500">Create a system user account for this employee</div>
                                    </div>
                                </label>
                            </div>
                        )}

                        {createLogin && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl bg-gray-50 dark:bg-neutral-800/50 border border-gray-100 dark:border-neutral-700">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 dark:text-neutral-400">Username <span className="text-red-500">*</span></label>
                                    <input
                                        name="username"
                                        value={userCreds.username}
                                        onChange={handleCredsChange}
                                        required={createLogin}
                                        className={`py-3 px-4 block w-full border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200 ${createLogin && isError('username') ? 'border-red-500 focus:border-red-500' : ''}`}
                                        placeholder="username"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 dark:text-neutral-400">Password <span className="text-red-500">*</span></label>
                                    <div className="relative flex gap-2">
                                        <div className="relative w-full">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                name="password"
                                                value={userCreds.password}
                                                onChange={handleCredsChange}
                                                required={createLogin}
                                                placeholder="••••••••"
                                                className={`py-3 px-4 pe-11 block w-full border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200 ${createLogin && isError('password') ? 'border-red-500 focus:border-red-500' : ''}`}
                                            />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 p-3 text-gray-400 hover:text-blue-600 dark:hover:text-blue-500 focus:outline-none transition-colors">
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
                                                let pass = "";
                                                for (let i = 0; i < 12; i++) {
                                                    pass += chars.charAt(Math.floor(Math.random() * chars.length));
                                                }
                                                setUserCreds(p => ({ ...p, password: pass }));
                                                setShowPassword(true);
                                            }}
                                            className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 hover:text-blue-600 transition-all dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-700 whitespace-nowrap"
                                        >
                                            Generate
                                        </button>
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 dark:text-neutral-400">Account Type <span className="text-red-500">*</span></label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {[
                                            { id: 'staff', label: 'Staff', desc: 'Standard Access' },
                                            { id: 'manager', label: 'Manager', desc: 'Team Management' },
                                            { id: 'admin', label: 'Admin', desc: 'Full System Access' }
                                        ].map((roleType) => (
                                            <label
                                                key={roleType.id}
                                                className={`cursor-pointer p-4 rounded-xl border-2 transition-all text-center ${userCreds.role === roleType.id ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 hover:border-blue-300 bg-white dark:bg-neutral-900 dark:border-neutral-700'}`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="role"
                                                    value={roleType.id}
                                                    checked={userCreds.role === roleType.id}
                                                    onChange={handleCredsChange}
                                                    className="hidden"
                                                />
                                                <div className={`font-bold ${userCreds.role === roleType.id ? 'text-blue-600' : 'text-gray-800 dark:text-white'}`}>{roleType.label}</div>
                                                <div className="text-xs text-gray-500 mt-1">{roleType.desc}</div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 dark:text-neutral-400">System Role (RBAC)</label>
                                    <select
                                        name="role_id"
                                        value={userCreds.role_id || ''}
                                        onChange={handleCredsChange}
                                        className="py-3 px-4 pe-9 block w-full border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200"
                                    >
                                        <option value="">No specific role</option>
                                        {roles.map(r => (
                                            <option key={r.id} value={r.id}>{r.name}</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-2">Assign granular permissions via a defined Role.</p>
                                </div>
                            </div>
                        )}

                        {!createLogin && (
                            <div className="pt-4 mt-4 border-t border-gray-100 dark:border-neutral-700">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 dark:text-neutral-400">Link Existing User (Optional)</label>
                                <select name="user_id" value={formData.user_id} onChange={handleChange} className="py-3 px-4 pe-9 block w-full border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200">
                                    <option value="">No Login Access</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>
                                            {u.full_name} ({u.username})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex justify-between items-center mt-12 pt-6 border-t border-gray-200 dark:border-neutral-700">
                    {currentStep === 1 ? (
                        <button type="button" onClick={onCancel} className="py-3 px-5 inline-flex items-center gap-x-2 text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-700 transition-colors">
                            Cancel
                        </button>
                    ) : (
                        <button type="button" onClick={handleBack} className="py-3 px-5 inline-flex items-center gap-x-2 text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-700 transition-colors">
                            <ArrowLeft size={16} /> Back
                        </button>
                    )}

                    {currentStep < 3 ? (
                        <button
                            type="button"
                            key="next-btn"
                            onClick={handleNext}
                            className="py-3 px-8 inline-flex items-center gap-x-2 text-sm font-semibold rounded-xl border border-transparent bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg hover:shadow-blue-600/30 transition-all disabled:opacity-50 disabled:pointer-events-none transform active:scale-95"
                        >
                            Next Step <ArrowRight size={16} />
                        </button>
                    ) : (
                        <button
                            type="submit"
                            key="submit-btn"
                            className="py-3 px-8 inline-flex items-center gap-x-2 text-sm font-semibold rounded-xl border border-transparent bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl hover:shadow-blue-600/30 transition-all disabled:opacity-50 disabled:pointer-events-none transform active:scale-95"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            {employeeToEdit ? 'Update Employee' : 'Create Employee'}
                        </button>
                    )}
                </div>
            </form >

            {/* Quick Create Modal */}
            {
                quickModal.show && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
                        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-scaleIn border border-gray-100 dark:border-neutral-700">
                            <div className="flex justify-between items-start mb-6">
                                <h3 className="text-xl font-bold capitalize text-gray-900 dark:text-white">Add {quickModal.type}</h3>
                                <button onClick={closeQuickModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                    <span className="sr-only">Close</span>
                                    <svg className="w-4 h-4" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12.5 3.5L3.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M12.5 12.5L3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>

                            <form onSubmit={handleQuickAdd}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 dark:text-neutral-400">Name / Title</label>
                                        <input
                                            className="py-3 px-4 block w-full border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 focus:bg-white dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
                                            value={quickModal.data.name || quickModal.data.title || ''}
                                            onChange={e => setQuickModal({ ...quickModal, data: { ...quickModal.data, [quickModal.type === 'designation' ? 'title' : 'name']: e.target.value } })}
                                            required
                                            autoFocus
                                            placeholder={`Enter ${quickModal.type} name`}
                                        />
                                    </div>
                                    {quickModal.type === 'designation' && (
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 dark:text-neutral-400">Level</label>
                                            <input
                                                type="number"
                                                className="py-3 px-4 block w-full border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 focus:bg-white dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
                                                value={quickModal.data.level || ''}
                                                onChange={e => setQuickModal({ ...quickModal, data: { ...quickModal.data, level: e.target.value } })}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="mt-8 flex justify-end gap-3">
                                    <button type="button" onClick={closeQuickModal} className="py-2.5 px-4 text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white transition-colors">Cancel</button>
                                    <button type="submit" className="py-2.5 px-5 text-sm font-semibold rounded-xl border border-transparent bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg transition-all">Create {quickModal.type}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
export default EmployeeForm;
