import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';
import { User } from '../types';

interface AuthContextType {
    user: User | null;
    login: (phone: string, name?: string, district?: string, role?: string) => Promise<User | null>;
    logout: () => void;
    updateUser: (updatedUser: User) => void;
    isLoading: boolean;
    impersonatedDistrict: string | null;
    setImpersonatedDistrict: (d: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [impersonatedDistrict, setImpersonatedDistrict] = useState<string | null>(null);

    useEffect(() => {
        // Check if we have a user in storage (simple persistence)
        const checkUser = () => {
            const storedUser = localStorage.getItem('aqua_user');
            if (storedUser) {
                // If the stored string differs from current state, update it
                const parsed = JSON.parse(storedUser);
                setUser(prev => {
                    // Simple check to see if we need update
                    if (JSON.stringify(prev) !== JSON.stringify(parsed)) return parsed;
                    return prev;
                });
            } else {
                setUser(null);
            }
        };

        checkUser();
        setIsLoading(false);

        // Cross-Tab Sync (Micro-Report Technical Requirement)
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'aqua_user') {
                checkUser();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const login = async (phone: string, name?: string, district?: string, role?: string) => {
        try {
            const res = await api.post('/auth/login', { phone, name, district, role });
            const { user, token } = res.data;
            setUser(user);
            localStorage.setItem('aqua_user', JSON.stringify(user));
            localStorage.setItem('aqua_token', token);
            return user;
        } catch (error) {
            console.error('Login failed', error);
            throw error;
        }
    };

    const logout = () => {
        setUser(null);
        setImpersonatedDistrict(null);
        localStorage.removeItem('aqua_user');
        localStorage.removeItem('aqua_token');
    };

    const updateUser = (updatedUser: User) => {
        setUser(updatedUser);
        localStorage.setItem('aqua_user', JSON.stringify(updatedUser));
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, updateUser, isLoading, impersonatedDistrict, setImpersonatedDistrict }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
