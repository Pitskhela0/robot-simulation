// src/components/Layout/Sidebar.tsx
import React from 'react';
import './Sidebar.css';

const Sidebar: React.FC = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-content">
        <h3>Quick Actions</h3>
        <ul className="sidebar-menu">
          <li>
            <a href="/new-simulation">Create New Simulation</a>
          </li>
          <li>
            <a href="/recent">Recent Simulations</a>
          </li>
          <li>
            <a href="/templates">Templates</a>
          </li>
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;