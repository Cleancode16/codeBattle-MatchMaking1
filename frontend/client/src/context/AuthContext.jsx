import { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    const [loading, setLoading] = useState(false);

    const login = (userData) => {
        const completeUser = {
            id: userData.id,
            username: userData.username,
            email: userData.email,
            codeforcesHandle: userData.codeforcesHandle || null,
            score: userData.score || 0
        };
        setUser(completeUser);
        localStorage.setItem('user', JSON.stringify(completeUser));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
    };

    // Update user data (for profile updates)
    const updateUser = (updates) => {
        const updatedUser = { ...user, ...updates };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
    };

    const isAuthenticated = !!user;

    return (
        <AuthContext.Provider value={{ user, login, logout, updateUser, isAuthenticated, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
