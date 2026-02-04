import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useLayout } from '../context/LayoutContext';
import { useToast } from '../context/ToastContext';
import EmployeeForm from '../components/EmployeeForm';
import api from '../services/api';
import { ArrowLeft } from 'lucide-react';

const EmployeeFormPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { setHeader } = useLayout();
    const toast = useToast();
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(!!id);

    useEffect(() => {
        if (id) {
            const fetchEmployee = async () => {
                try {
                    const res = await api.get(`/hr/employees/${id}`);
                    setEmployee(res.data);
                } catch (error) {
                    console.error("Failed to fetch employee", error);
                    navigate('/employees');
                } finally {
                    setLoading(false);
                }
            };
            fetchEmployee();
        } else {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        setHeader(id ? 'Edit Employee' : 'New Employee');
    }, [id]);

    const handleSubmit = async (data) => {
        try {
            if (id) {
                await api.put(`/hr/employees/${id}`, data);
                toast.success("Success", "Employee updated.");
            } else {
                await api.post('/hr/employees/', data);
                toast.success("Success", "Employee created.");
            }
            navigate('/employees');
        } catch (error) {
            toast.error("Operation Failed", error.response?.data?.detail || error.message);
        }
    };

    if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;

    return (
        <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-8">
            <button
                onClick={() => navigate('/employees')}
                className="mb-6 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg text-gray-500 hover:text-blue-600 focus:outline-none focus:text-blue-600 disabled:opacity-50 disabled:pointer-events-none dark:text-neutral-400 dark:hover:text-blue-400 dark:focus:text-blue-400 transition-colors"
            >
                <ArrowLeft size={18} /> Back to Employees
            </button>

            <div className="flex flex-col bg-white border border-gray-200/60 shadow-xl shadow-gray-200/40 rounded-2xl dark:bg-neutral-800 dark:border-neutral-700 dark:shadow-neutral-900/50 p-6 md:p-8 relative overflow-hidden">
                {/* Decorative top accent */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

                <EmployeeForm
                    employeeToEdit={employee}
                    onSubmit={handleSubmit}
                    onCancel={() => navigate('/employees')}
                />
            </div>
        </div>
    );
};

export default EmployeeFormPage;
