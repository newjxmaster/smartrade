// ============================================
// Authentication Store
// ============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '../types/models';
import websocketService from '../services/websocket';

interface AuthState {
    // State
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isReconnecting: boolean;  // True when restoring session on page refresh
    error: string | null;

    // Actions
    login: (regno: string, password: string) => Promise<void>;
    loginAdmin: (username: string, password: string) => Promise<void>;
    register: (regno: string, name: string, password: string) => Promise<void>;
    logout: () => void;
    setUser: (user: Partial<User>) => void;
    clearError: () => void;
    setReconnecting: (value: boolean) => void;

    // Internal
    _handleAuthSuccess: (userId: number, name: string, role: UserRole) => void;
    _handleAuthFailed: (reason: string, isReconnection?: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            isReconnecting: false,
            error: null,

            login: async (regno: string, password: string) => {
                set({ isLoading: true, error: null, isReconnecting: false });

                // Use Login message for username+password authentication
                websocketService.send({
                    type: 'Login',
                    payload: { regno, password }
                });

                // Wait for response via WebSocket handlers
                // The actual success/fail is handled by _handleAuthSuccess/_handleAuthFailed
            },

            loginAdmin: async (username: string, password: string) => {
                set({ isLoading: true, error: null, isReconnecting: false });

                // Use Login message for admin authentication - role is validated server-side
                websocketService.send({
                    type: 'Login',
                    payload: { regno: username, password }
                });
            },

            register: async (regno: string, name: string, password: string) => {
                set({ isLoading: true, error: null, isReconnecting: false });

                websocketService.send({
                    type: 'Register',
                    payload: { regno, name, password }
                });
            },

            logout: () => {
                websocketService.clearSessionToken();
                set({
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                    isReconnecting: false,
                    error: null
                });
            },

            setUser: (updates: Partial<User>) => {
                const currentUser = get().user;
                if (currentUser) {
                    set({
                        user: { ...currentUser, ...updates }
                    });
                }
            },

            clearError: () => set({ error: null }),

            setReconnecting: (value: boolean) => set({ isReconnecting: value }),

            _handleAuthSuccess: (userId: number, name: string, role: UserRole) => {
                websocketService.setSessionToken(String(userId));
                set({
                    user: {
                        id: userId,
                        regno: '',
                        name,
                        role,
                        money: 0,
                        lockedMoney: 0,
                        marginLocked: 0,
                        netWorth: 0,
                        portfolio: [],
                        chatEnabled: true,
                        banned: false,
                        createdAt: Date.now()
                    },
                    isAuthenticated: true,
                    isLoading: false,
                    isReconnecting: false,
                    error: null
                });
            },

            _handleAuthFailed: (reason: string, isReconnection = false) => {
                // Clear auth state on failure
                websocketService.clearSessionToken();
                set({
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                    isReconnecting: false,
                    error: isReconnection ? null : reason  // Don't show error on reconnection failure
                });
            }
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                // Only persist minimal auth info
                user: state.user ? { id: state.user.id, name: state.user.name, role: state.user.role } : null,
                isAuthenticated: state.isAuthenticated
            })
        }
    )
);

// === WebSocket Event Bindings ===

websocketService.on('AuthSuccess', (payload: { user_id: number; name: string; role: string }) => {
    // Use role from server response
    const role: UserRole = payload.role === 'admin' ? 'admin' : 'trader';
    useAuthStore.getState()._handleAuthSuccess(payload.user_id, payload.name, role);
});

websocketService.on('AuthFailed', (payload: { reason: string }) => {
    // Only clear auth if this was a reconnection attempt
    const { isReconnecting, isAuthenticated } = useAuthStore.getState();
    if (isReconnecting || isAuthenticated) {
        useAuthStore.getState()._handleAuthFailed(payload.reason, true);
    }
});

websocketService.on('RegisterSuccess', (payload: { user_id: number; name: string; role: string }) => {
    // Use role from server response
    const role: UserRole = payload.role === 'admin' ? 'admin' : 'trader';
    useAuthStore.getState()._handleAuthSuccess(payload.user_id, payload.name, role);
});

websocketService.on('RegisterFailed', (payload: { reason: string }) => {
    useAuthStore.getState()._handleAuthFailed(payload.reason);
});

// Handle page refresh / reconnection
// Check if we have stored auth that needs to be verified
const storedAuth = localStorage.getItem('auth-storage');
const sessionToken = localStorage.getItem('session_token');

if (storedAuth && sessionToken) {
    try {
        const parsed = JSON.parse(storedAuth);
        if (parsed.state?.isAuthenticated && parsed.state?.user?.id) {
            // CRITICAL FIX: Mark as NOT authenticated until backend confirms
            // This prevents race conditions where components send auth-required
            // messages before the backend has validated the token
            useAuthStore.setState({ 
                isReconnecting: true,
                isAuthenticated: false  // Will be set true only after AuthSuccess
            });
            
            // If WebSocket is already connected, send auth immediately
            if (websocketService.getConnectionStatus()) {
                websocketService.send({ type: 'Auth', payload: { token: sessionToken } });
            }
        }
    } catch {
        // Invalid storage, clear it
        localStorage.removeItem('auth-storage');
        localStorage.removeItem('session_token');
    }
}

// Auto-login on reconnect if we have stored auth
websocketService.on('connected', () => {
    const token = websocketService.getSessionToken();
    const { isReconnecting, isAuthenticated } = useAuthStore.getState();
    
    if (token && (isReconnecting || isAuthenticated)) {
        // CRITICAL FIX: Ensure we're in reconnecting state with isAuthenticated=false
        // until the backend confirms our auth token
        useAuthStore.setState({ 
            isReconnecting: true,
            isAuthenticated: false 
        });
        // Send auth request to verify session
        websocketService.send({ type: 'Auth', payload: { token } });
    }
});

// Handle auth-specific errors (e.g., token expired, invalid token)
websocketService.on('Error', (payload: { code?: string; message?: string }) => {
    const { isReconnecting } = useAuthStore.getState();
    
    // CRITICAL FIX: During reconnection, ignore NOT_AUTHENTICATED errors
    // These happen when components send auth-required messages before
    // the backend has finished validating our token. We should NOT logout.
    if (isReconnecting && payload.code === 'NOT_AUTHENTICATED') {
        // Silently ignore - auth verification is still pending
        return;
    }
    
    // If we get an auth-related error, clear the auth state
    if (payload.code === 'NOT_AUTHENTICATED' || payload.code === 'AUTH_FAILED' || 
        payload.message?.toLowerCase().includes('auth') ||
        payload.message?.toLowerCase().includes('token')) {
        websocketService.clearSessionToken();
        useAuthStore.setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            isReconnecting: false,
            error: payload.message || 'Session expired. Please login again.'
        });
    }
});

export default useAuthStore;
