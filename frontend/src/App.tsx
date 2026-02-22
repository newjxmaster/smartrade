// ============================================
// StockMart App
// Main Application with Routing
// ============================================

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import { AdminLayout, PublicLayout } from './components/layout';

// Features
import { LoginPage, RegisterPage, AuthGuard } from './features/auth';
import { CompaniesListPage } from './features/trader/CompaniesListPage';
import { StockDetailPage } from './features/trader/StockDetailPage';
import { UserSettingsPage } from './features/trader/UserSettingsPage';
import { AdminDashboardPage } from './features/admin/DashboardPage';
import { GameControlPage } from './features/admin/GameControlPage';
import { AgentsPage } from './features/admin/AgentsPage';
import { TradersPage } from './features/admin/TradersPage';
import { CompaniesPage } from './features/admin/CompaniesPage';
import { DiagnosticsPage } from './features/admin/DiagnosticsPage';
import { TradesPage } from './features/admin/TradesPage';
import { OrdersPage } from './features/admin/OrdersPage';
import { OrderbookPage } from './features/admin/OrderbookPage';

// Common Components
import { ErrorBoundary } from './components/common';

// Styles
import './styles/index.css';
import './styles/components.css';
import './styles/layout.css';
import './styles/trading.css';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Public Routes - no login required */}
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<CompaniesListPage />} />
            <Route path="stock/:symbol" element={<StockDetailPage />} />
          </Route>

          {/* Auth Pages */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Trader Routes - unified stock trading page */}
          <Route
            path="/trade"
            element={
              <AuthGuard requiredRole="trader">
                <PublicLayout />
              </AuthGuard>
            }
          >
            {/* Redirect /trade to the first stock or companies list */}
            <Route index element={<Navigate to="/" replace />} />
            <Route path="stock/:symbol" element={<StockDetailPage />} />
          </Route>

          {/* User Settings */}
          <Route
            path="/settings"
            element={
              <AuthGuard requiredRole="trader">
                <UserSettingsPage />
              </AuthGuard>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <AuthGuard requiredRole="admin">
                <AdminLayout />
              </AuthGuard>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="game" element={<GameControlPage />} />
            <Route path="agents" element={<AgentsPage />} />
            <Route path="traders" element={<TradersPage />} />
            <Route path="companies" element={<CompaniesPage />} />
            <Route path="trades" element={<TradesPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orderbook" element={<OrderbookPage />} />
            <Route path="diagnostics" element={<DiagnosticsPage />} />
          </Route>

          {/* Fallback - redirect to landing page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
