// ============================================
// Auth Guard Component
// Protects routes requiring authentication
// ============================================

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import type { UserRole } from '../../types/models';

interface AuthGuardProps {
    children: React.ReactNode;
    requiredRole?: UserRole;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, requiredRole }) => {
    const { isAuthenticated, user, isLoading, isReconnecting } = useAuthStore();
    const location = useLocation();

    // Show loading state during initial load or reconnection
    if (isLoading || isReconnecting) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
                <div className="flex flex-col items-center gap-4">
                    <div className="spinner spinner-lg" />
                    <p style={{ color: 'var(--text-muted)' }}>
                        {isReconnecting ? 'Restoring session...' : 'Loading...'}
                    </p>
                </div>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated || !user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check role if required
    if (requiredRole && user.role !== requiredRole) {
        // Redirect based on actual role
        if (user.role === 'admin') {
            return <Navigate to="/admin" replace />;
        } else {
            return <Navigate to="/trade" replace />;
        }
    }

    return <>{children}</>;
};

export default AuthGuard;
