// ============================================
// Public Layout
// For pages accessible without authentication
// ============================================

import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { ToastContainer } from '../../components/common';

export const PublicLayout: React.FC = () => {
    return (
        <div className="app-layout">
            <Header variant="default" />
            <main className="trader-main-content">
                <Outlet />
            </main>
            <ToastContainer />
        </div>
    );
};

export default PublicLayout;
