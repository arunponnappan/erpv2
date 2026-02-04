import { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import marketplaceService from '../services/marketplaceService';
import { useAuth } from './AuthContext';

const CompanyContext = createContext({
    companies: [],
    currentCompany: null,
    selectCompany: () => { },
    loading: false,
    refreshCompanies: () => { },
    installedApps: [],
    refreshInstalledApps: () => { }
});

export const CompanyProvider = ({ children }) => {
    const [companies, setCompanies] = useState([]);
    const [currentCompany, setCurrentCompany] = useState(null);
    const [installedApps, setInstalledApps] = useState([]);
    const [loading, setLoading] = useState(true);

    const { user } = useAuth(); // NEW: Access user state

    const fetchCompanies = async () => {
        // Prevent fetching if no user is logged in (stops 401 loop on login page)
        if (!user) {
            setLoading(false);
            return;
        }

        try {
            const response = await api.get('/companies/');
            setCompanies(response.data);
            const comps = response.data;

            // Logic to select or validate initial company
            if (comps.length > 0) {
                const savedId = localStorage.getItem('selectedCompanyId');
                // Check if we have a current company state or saved preference
                const candidateId = currentCompany?.id || (savedId ? parseInt(savedId) : null);

                // Find if this candidate still exists
                const found = comps.find(c => c.id === candidateId);

                if (found) {
                    setCurrentCompany(found);
                } else {
                    // Fallback: Default to first company if current/saved is invalid/deleted
                    setCurrentCompany(comps[0]);
                    localStorage.setItem('selectedCompanyId', comps[0].id);
                }
            } else {
                // No companies exist at all
                setCurrentCompany(null);
                localStorage.removeItem('selectedCompanyId');
            }
        } catch (error) {
            console.error("Failed to fetch companies:", error);
            // If 401, do nothing, let global handler or AuthContext handle it
        } finally {
            setLoading(false);
        }
    };

    const fetchInstalledApps = async () => {
        if (!currentCompany) {
            setInstalledApps([]);
            return;
        }
        try {
            const apps = await marketplaceService.getInstalledApps();
            setInstalledApps(apps);
        } catch (error) {
            console.error("Failed to fetch installed apps:", error);
        }
    };

    useEffect(() => {
        if (user) {
            fetchCompanies();
        } else {
            setLoading(false); // Ensure loading stops if no user
        }
    }, [user]); // NEW: Re-fetch when user logs in

    useEffect(() => {
        if (currentCompany) {
            fetchInstalledApps();
        }
    }, [currentCompany]);

    const selectCompany = (companyId) => {
        const company = companies.find(c => c.id === parseInt(companyId));
        if (company) {
            setCurrentCompany(company);
            localStorage.setItem('selectedCompanyId', company.id);
            // Optional: Window reload if we want to force full refresh of all data
            // window.location.reload(); 
        }
    };

    return (
        <CompanyContext.Provider value={{
            companies,
            currentCompany,
            selectCompany,
            loading,
            refreshCompanies: fetchCompanies,
            installedApps,
            refreshInstalledApps: fetchInstalledApps
        }}>
            {children}
        </CompanyContext.Provider>
    );
};

export const useCompany = () => useContext(CompanyContext);
