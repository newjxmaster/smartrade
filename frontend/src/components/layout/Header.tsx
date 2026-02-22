// ============================================
// Header Component
// ============================================

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp, Sun, Moon, Wifi, WifiOff, LogOut, LogIn, UserPlus, Settings } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { useConfigStore } from '../../store/configStore';
import { Badge, LoginModal } from '../../components/common';

interface HeaderProps {
    showNav?: boolean;
    variant?: 'default' | 'admin';
}

export const Header: React.FC<HeaderProps> = ({ showNav = true, variant = 'default' }) => {
    const navigate = useNavigate();
    const { user, logout, isAuthenticated } = useAuthStore();
    const { isConnected, marketOpen, netWorth, money, portfolio } = useGameStore();
    
    // Calculate holdings value
    const holdingsValue = portfolio.reduce((sum, item) => {
        const currentPrice = item.currentPrice || item.averageBuyPrice || 0;
        return sum + (currentPrice * item.qty);
    }, 0);
    const { theme, toggleTheme } = useUIStore();
    const formatCurrency = useConfigStore(state => state.formatCurrency);
    const [showLoginModal, setShowLoginModal] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <>
            <header className="header">
                {/* Brand */}
                <div className="header-brand">
                    <Link to={isAuthenticated ? (user?.role === 'admin' ? '/admin' : '/trade') : '/'} className="header-logo">
                        <TrendingUp size={28} />
                        <span>SmarTrade</span>
                    </Link>

                    {variant === 'admin' && (
                        <Badge variant="danger">ADMIN</Badge>
                    )}

                    {isAuthenticated && !marketOpen && (
                        <Badge variant="warning" pulse>MARKET CLOSED</Badge>
                    )}
                </div>

                {/* Center Stats - Trader Only */}
                {showNav && variant !== 'admin' && isAuthenticated && (
                    <div className="header-nav" style={{ gap: 'var(--space-6)' }}>
                        <div className="text-center">
                            <div className="text-xs text-muted">Cash</div>
                            <div className="font-bold text-mono" style={{
                                color: 'var(--color-primary-light)',
                                fontSize: 'var(--text-lg)'
                            }}>
                                {formatCurrency(money)}
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs text-muted">Holdings</div>
                            <div className="font-bold text-mono" style={{
                                color: 'var(--color-warning)',
                                fontSize: 'var(--text-lg)'
                            }}>
                                {formatCurrency(holdingsValue)}
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs text-muted">Net Worth</div>
                            <div className="font-bold text-mono" style={{
                                color: 'var(--color-success)',
                                fontSize: 'var(--text-lg)'
                            }}>
                                {formatCurrency(netWorth)}
                            </div>
                        </div>
                    </div>
                )}

                {/* Right Actions */}
                <div className="header-actions">
                    {/* Connection Status */}
                    <div className={`header-status ${isConnected ? 'connected' : 'disconnected'}`}>
                        <span className="header-status-dot" />
                        {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
                        <span className="text-xs font-medium">
                            {isConnected ? 'Live' : 'Offline'}
                        </span>
                    </div>

                    {/* Theme Toggle */}
                    <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>

                    {/* Authenticated: User Menu + Settings + Logout */}
                    {isAuthenticated && user && (
                        <>
                            <div className="header-user" style={{ cursor: 'pointer' }} onClick={() => navigate('/settings')}>
                                <div className="header-user-avatar">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="header-user-info">
                                    <span className="header-user-name">{user.name}</span>
                                    <span className="header-user-role">{user.role === 'admin' ? 'Administrator' : 'Trader'}</span>
                                </div>
                            </div>
                            {variant !== 'admin' && (
                                <button
                                    className="btn btn-ghost btn-icon"
                                    onClick={() => navigate('/settings')}
                                    title="Settings"
                                >
                                    <Settings size={18} />
                                </button>
                            )}
                            <button
                                className="btn btn-ghost btn-icon"
                                onClick={handleLogout}
                                title="Logout"
                            >
                                <LogOut size={18} />
                            </button>
                        </>
                    )}

                    {/* Not Authenticated: Login + Register */}
                    {!isAuthenticated && (
                        <>
                            <Link
                                to="/register"
                                className="btn btn-ghost"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-1)',
                                    fontSize: 'var(--text-sm)',
                                    fontWeight: 'var(--font-medium)',
                                    padding: 'var(--space-2) var(--space-3)',
                                    color: 'var(--text-secondary)',
                                    textDecoration: 'none',
                                }}
                            >
                                <UserPlus size={16} />
                                Register
                            </Link>
                            <button
                                className="btn btn-primary"
                                onClick={() => setShowLoginModal(true)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-1)',
                                    fontSize: 'var(--text-sm)',
                                    fontWeight: 'var(--font-medium)',
                                    padding: 'var(--space-2) var(--space-4)',
                                }}
                            >
                                <LogIn size={16} />
                                Login
                            </button>
                        </>
                    )}
                </div>
            </header>

            {/* Login Modal */}
            <LoginModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
            />
        </>
    );
};

export default Header;
