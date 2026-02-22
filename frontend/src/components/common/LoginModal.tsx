// ============================================
// Login Modal Component
// Reusable modal for deferred authentication
// ============================================

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Where to navigate after successful login. Defaults to '/trade' */
    redirectTo?: string;
}

export const LoginModal: React.FC<LoginModalProps> = ({
    isOpen,
    onClose,
    redirectTo = '/trade',
}) => {
    const navigate = useNavigate();
    const { login, isAuthenticated, isLoading, error, clearError, user } = useAuthStore();

    const [regno, setRegno] = useState('');
    const [password, setPassword] = useState('');
    const [validationErrors, setValidationErrors] = useState<{
        regno?: string;
        password?: string;
    }>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    // Clear form when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            clearError();
            setRegno('');
            setPassword('');
            setValidationErrors({});
            setTouched({});
        }
    }, [isOpen, clearError]);

    // Redirect on successful login
    useEffect(() => {
        if (isAuthenticated && user && isOpen) {
            onClose();
            if (user.role === 'admin') {
                navigate('/admin');
            } else {
                navigate(redirectTo);
            }
        }
    }, [isAuthenticated, user, isOpen, onClose, navigate, redirectTo]);

    const validate = (): boolean => {
        const errors: { regno?: string; password?: string } = {};

        if (!regno.trim()) {
            errors.regno = 'Registration number is required';
        } else if (regno.trim().length < 3) {
            errors.regno = 'Must be at least 3 characters';
        }

        if (!password) {
            errors.password = 'Password is required';
        } else if (password.length < 4) {
            errors.password = 'Must be at least 4 characters';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setTouched({ regno: true, password: true });
        if (validate()) {
            login(regno.trim(), password);
        }
    };

    const handleBlur = (field: string) => {
        setTouched(prev => ({ ...prev, [field]: true }));
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Sign In to Trade"
            size="sm"
        >
            <div style={{ padding: 'var(--space-2) 0' }}>
                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 rounded-lg" style={{
                        background: 'var(--color-danger-bg)',
                        border: '1px solid var(--color-danger)',
                        color: 'var(--color-danger)',
                        fontSize: 'var(--text-sm)'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    <Input
                        label="Registration Number"
                        placeholder="Enter your registration ID"
                        value={regno}
                        onChange={(e) => {
                            setRegno(e.target.value);
                            if (touched.regno) {
                                setValidationErrors(prev => ({ ...prev, regno: undefined }));
                            }
                        }}
                        onBlur={() => handleBlur('regno')}
                        icon={<User size={18} />}
                        autoComplete="username"
                        error={touched.regno ? validationErrors.regno : undefined}
                    />

                    <Input
                        label="Password"
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            if (touched.password) {
                                setValidationErrors(prev => ({ ...prev, password: undefined }));
                            }
                        }}
                        onBlur={() => handleBlur('password')}
                        icon={<Lock size={18} />}
                        autoComplete="current-password"
                        error={touched.password ? validationErrors.password : undefined}
                    />

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        loading={isLoading}
                        className="w-full mt-2"
                    >
                        Sign In
                        <ChevronRight size={18} />
                    </Button>
                </form>

                <div style={{
                    textAlign: 'center',
                    marginTop: 'var(--space-4)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--text-muted)',
                }}>
                    Don't have an account?{' '}
                    <Link to="/register" onClick={onClose} style={{ color: 'var(--color-primary)' }}>
                        Register here
                    </Link>
                </div>
            </div>
        </Modal>
    );
};

export default LoginModal;
