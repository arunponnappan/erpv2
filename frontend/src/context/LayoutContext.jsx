import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const LayoutContext = createContext();

export const useLayout = () => {
    return useContext(LayoutContext);
};

export const LayoutProvider = ({ children }) => {
    const [title, setTitle] = useState('');
    const [actions, setActions] = useState(null);

    // Helper to easily set both. Note: actions can be null
    // Wrapped in useCallback to ensure stability and avoid infinite loops in useEffects
    const setHeader = useCallback((newTitle, newActions = null) => {
        setTitle(newTitle);
        setActions(newActions);
    }, []);

    const value = useMemo(() => ({
        title,
        setTitle,
        actions,
        setActions,
        setHeader
    }), [title, actions, setHeader]);

    return (
        <LayoutContext.Provider value={value}>
            {children}
        </LayoutContext.Provider>
    );
};
