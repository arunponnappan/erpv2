import { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom'; // Added
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate(); // Added hook

    useEffect(() => {
        const fetchUser = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const response = await api.get('/users/me');
                    setUser(response.data);
                } catch (error) {
                    console.error("Failed to fetch user:", error);
                    localStorage.removeItem('token');
                }
            }
            setLoading(false);
        };

        fetchUser();
    }, []);

    const login = async (username, password) => {
        // API expects form-data for OAuth2
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        const response = await api.post('/auth/login/access-token', formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const { access_token } = response.data;
        localStorage.setItem('token', access_token);

        // Fetch user details immediately
        const userResponse = await api.get('/users/me');
        setUser(userResponse.data);
    };

    const logout = () => {
        console.log("AuthContext: Logging out...");
        localStorage.removeItem('token');
        setUser(null);
        console.log("AuthContext: State cleared, navigating...");
        navigate('/login');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
