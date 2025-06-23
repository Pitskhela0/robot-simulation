// src/components/Layout/Header.tsx
import React from 'react';
import Navigation from './Navigation';
import './Header.css';

const Header: React.FC = () => {
  return (
    <header className="header">
      <div className="header-content">
        <div className="header-brand">
          <h1>Robot Task Simulator</h1>
        </div>
        <Navigation />
      </div>
    </header>
  );
};

export default Header;