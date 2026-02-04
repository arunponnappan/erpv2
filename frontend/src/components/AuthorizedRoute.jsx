import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UnauthorizedPage from '../pages/UnauthorizedPage';

const AuthorizedRoute = ({ children, requiredRoles }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (requiredRoles && !requiredRoles.includes(user.role)) {
        return <UnauthorizedPage />;
    }

    return children;
};

export default AuthorizedRoute;
