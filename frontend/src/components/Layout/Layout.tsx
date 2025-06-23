// src/components/Layout/Layout.tsx
import React, { ReactNode } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, showSidebar = true }) => {
  return (
    <div className="layout">
      <Header />
      <div className="layout-body">
        {showSidebar && <Sidebar />}
        <main className="layout-main">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;