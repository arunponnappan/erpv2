import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLayout } from '../context/LayoutContext';
import Breadcrumb from '../components/Breadcrumb';

const Dashboard = () => {
    const { user } = useAuth();
    const { setHeader } = useLayout();

    useEffect(() => {
        setHeader(<Breadcrumb items={[{ label: 'Dashboard' }]} />);
    }, [setHeader]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    return (
        <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-4">
            <div className="relative overflow-hidden bg-blue-600 rounded-xl p-6 mb-6 text-white dark:bg-blue-500">
                <div className="relative z-10">
                    <h1 className="text-2xl font-bold">{getGreeting()}, {user?.full_name || 'User'}!</h1>
                    <p className="mt-1 text-blue-100">Here is an overview of what is happening today.</p>
                </div>
                <div className="absolute top-0 right-0 -mr-10 -mt-10 w-32 h-32 rounded-full bg-white/20 blur-xl"></div>
                <div className="absolute bottom-0 right-10 -mb-10 w-24 h-24 rounded-full bg-white/10 blur-lg"></div>
            </div>


        </div>
    );
};

export default Dashboard;
