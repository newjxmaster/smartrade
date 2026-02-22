// ============================================
// User Settings Page
// Allows users to change their name and password
// ============================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    User,
    Lock,
    Save,
    ArrowLeft,
    Eye,
    EyeOff,
    CheckCircle,
    AlertCircle
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Button, Modal } from '../../components/common';

export const UserSettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    
    // Form states
    const [name, setName] = useState(user?.name || '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    // UI states
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    
    // Modal states
    const [showNameConfirm, setShowNameConfirm] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

    // Validate name change
    const handleNameSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setErrorMessage('Name cannot be empty');
            return;
        }
        if (name === user?.name) {
            setErrorMessage('New name must be different from current name');
            return;
        }
        setShowNameConfirm(true);
    };

    // Validate password change
    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentPassword) {
            setErrorMessage('Current password is required');
            return;
        }
        if (newPassword.length < 6) {
            setErrorMessage('New password must be at least 6 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            setErrorMessage('New passwords do not match');
            return;
        }
        setShowPasswordConfirm(true);
    };

    // Confirm name change
    const confirmNameChange = () => {
        setIsLoading(true);
        setShowNameConfirm(false);
        
        // TODO: Implement UpdateProfile endpoint on backend
        // For now, simulate the request
        console.log('UpdateProfile:', { name: name.trim() });

        // Simulate response (in production, handle via WebSocket response)
        setTimeout(() => {
            setIsLoading(false);
            setSuccessMessage('Name updated successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
        }, 1000);
    };

    // Confirm password change
    const confirmPasswordChange = () => {
        setIsLoading(true);
        setShowPasswordConfirm(false);
        
        // TODO: Implement ChangePassword endpoint on backend
        // For now, simulate the request
        console.log('ChangePassword:', { current_password: '***', new_password: '***' });

        // Simulate response (in production, handle via WebSocket response)
        setTimeout(() => {
            setIsLoading(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setSuccessMessage('Password changed successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
        }, 1000);
    };

    return (
        <div className="min-h-screen" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            {/* Header */}
            <div style={{ borderBottom: '1px solid var(--border-secondary)', background: 'var(--bg-secondary)' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto', padding: 'var(--space-4)' }}>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            style={{
                                padding: '8px',
                                background: 'var(--bg-tertiary)',
                                border: '1px solid var(--border-secondary)',
                                borderRadius: 'var(--radius-lg)',
                                cursor: 'pointer',
                                color: 'var(--text-primary)',
                            }}
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold">User Settings</h1>
                            <p className="text-muted text-sm">Manage your profile and security</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main style={{ maxWidth: '800px', margin: '0 auto', padding: 'var(--space-4)' }}>
                {/* Success/Error Messages */}
                {successMessage && (
                    <div className="mb-4 p-4 rounded-lg flex items-center gap-2" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                        <CheckCircle size={20} style={{ color: 'var(--color-success)' }} />
                        <span style={{ color: 'var(--color-success)' }}>{successMessage}</span>
                    </div>
                )}
                {errorMessage && (
                    <div className="mb-4 p-4 rounded-lg flex items-center gap-2" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        <AlertCircle size={20} style={{ color: 'var(--color-danger)' }} />
                        <span style={{ color: 'var(--color-danger)' }}>{errorMessage}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Profile Settings */}
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
                        <div className="flex items-center gap-2 mb-4">
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                            }}>
                                <User size={20} />
                            </div>
                            <div>
                                <h2 className="font-bold">Profile</h2>
                                <p className="text-muted text-sm">Update your display name</p>
                            </div>
                        </div>

                        <form onSubmit={handleNameSubmit}>
                            <div className="mb-4">
                                <label className="input-label">Current Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={user?.name || ''}
                                    disabled
                                    style={{ background: 'var(--bg-tertiary)', cursor: 'not-allowed' }}
                                />
                            </div>

                            <div className="mb-4">
                                <label className="input-label">New Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={name}
                                    onChange={(e) => {
                                        setName(e.target.value);
                                        setErrorMessage('');
                                    }}
                                    placeholder="Enter new name"
                                    maxLength={50}
                                />
                            </div>

                            <Button
                                type="submit"
                                variant="primary"
                                loading={isLoading}
                                className="w-full"
                            >
                                <Save size={16} />
                                Update Name
                            </Button>
                        </form>
                    </div>

                    {/* Security Settings */}
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
                        <div className="flex items-center gap-2 mb-4">
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--color-warning) 0%, #f59e0b 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                            }}>
                                <Lock size={20} />
                            </div>
                            <div>
                                <h2 className="font-bold">Security</h2>
                                <p className="text-muted text-sm">Change your password</p>
                            </div>
                        </div>

                        <form onSubmit={handlePasswordSubmit}>
                            <div className="mb-4">
                                <label className="input-label">Current Password</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showCurrentPassword ? 'text' : 'password'}
                                        className="input"
                                        value={currentPassword}
                                        onChange={(e) => {
                                            setCurrentPassword(e.target.value);
                                            setErrorMessage('');
                                        }}
                                        placeholder="Enter current password"
                                        style={{ paddingRight: '40px' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        style={{
                                            position: 'absolute',
                                            right: '12px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: 'var(--text-muted)',
                                        }}
                                    >
                                        {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="input-label">New Password</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        className="input"
                                        value={newPassword}
                                        onChange={(e) => {
                                            setNewPassword(e.target.value);
                                            setErrorMessage('');
                                        }}
                                        placeholder="Enter new password (min 6 chars)"
                                        style={{ paddingRight: '40px' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        style={{
                                            position: 'absolute',
                                            right: '12px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: 'var(--text-muted)',
                                        }}
                                    >
                                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="input-label">Confirm New Password</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        className="input"
                                        value={confirmPassword}
                                        onChange={(e) => {
                                            setConfirmPassword(e.target.value);
                                            setErrorMessage('');
                                        }}
                                        placeholder="Confirm new password"
                                        style={{ paddingRight: '40px' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        style={{
                                            position: 'absolute',
                                            right: '12px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: 'var(--text-muted)',
                                        }}
                                    >
                                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                variant="primary"
                                loading={isLoading}
                                className="w-full"
                            >
                                <Lock size={16} />
                                Change Password
                            </Button>
                        </form>
                    </div>
                </div>

                {/* Account Info */}
                <div className="mt-6" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
                    <h3 className="font-bold mb-4">Account Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-muted text-sm">User ID</span>
                            <p className="font-mono">{user?.id || 'N/A'}</p>
                        </div>
                        <div>
                            <span className="text-muted text-sm">Role</span>
                            <p className="capitalize">{user?.role || 'Trader'}</p>
                        </div>
                        <div>
                            <span className="text-muted text-sm">Account Status</span>
                            <p style={{ color: user?.banned ? 'var(--color-danger)' : 'var(--color-success)' }}>
                                {user?.banned ? 'Banned' : 'Active'}
                            </p>
                        </div>
                        <div>
                            <span className="text-muted text-sm">Chat Enabled</span>
                            <p>{user?.chatEnabled !== false ? 'Yes' : 'No'}</p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Name Change Confirmation Modal */}
            {showNameConfirm && (
                <Modal
                    title="Confirm Name Change"
                    onClose={() => setShowNameConfirm(false)}
                    isOpen={true}
                >
                    <div className="text-center">
                        <User size={48} style={{ color: 'var(--color-primary)', margin: '0 auto 16px' }} />
                        <p className="mb-2">
                            Change your name from <strong>{user?.name}</strong> to <strong>{name}</strong>?
                        </p>
                        <p className="text-muted text-sm mb-6">
                            This will be visible to all users on the platform.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Button variant="secondary" onClick={() => setShowNameConfirm(false)}>
                                Cancel
                            </Button>
                            <Button variant="primary" onClick={confirmNameChange}>
                                <CheckCircle size={16} />
                                Confirm Change
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Password Change Confirmation Modal */}
            {showPasswordConfirm && (
                <Modal
                    title="Confirm Password Change"
                    onClose={() => setShowPasswordConfirm(false)}
                    isOpen={true}
                >
                    <div className="text-center">
                        <Lock size={48} style={{ color: 'var(--color-warning)', margin: '0 auto 16px' }} />
                        <p className="mb-2">
                            Are you sure you want to change your password?
                        </p>
                        <p className="text-muted text-sm mb-6">
                            You will need to use your new password for future logins.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Button variant="secondary" onClick={() => setShowPasswordConfirm(false)}>
                                Cancel
                            </Button>
                            <Button variant="primary" onClick={confirmPasswordChange}>
                                <CheckCircle size={16} />
                                Confirm Change
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default UserSettingsPage;
