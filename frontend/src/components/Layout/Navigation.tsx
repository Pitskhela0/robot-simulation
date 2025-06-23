// src/components/Layout/Navigation.tsx
import React from 'react';
import './Navigation.css';

const Navigation: React.FC = () => {
  return (
    <nav className="navigation">
      <ul className="nav-list">
        <li className="nav-item">
          <a href="/" className="nav-link active">
            Home
          </a>
        </li>
        <li className="nav-item">
          <a href="/simulations" className="nav-link">
            Simulations
          </a>
        </li>
        <li className="nav-item">
          <a href="/about" className="nav-link">
            About
          </a>
        </li>
      </ul>
    </nav>
  );
};

export default Navigation;