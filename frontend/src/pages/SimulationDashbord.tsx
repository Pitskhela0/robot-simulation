// src/pages/SimulationDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserSimulationStats, getRecentSimulations } from '../services/simulationService';
import { useApi } from '../hooks/useApi';
import Layout from '../components/Layout/Layout';
import AuthGuard from '../components/Auth/AuthGuard';
import SimulationList from '../components/Simulation/SimulationList';
import { Simulation } from '../types/simulation';
import Button from '../components/UI/Button';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import ErrorDisplay from '../components/UI/ErrorDisplay';
import './SimulationDashboard.css';

type DashboardTab = 'overview' | 'my-simulations' | 'shared' | 'public' | 'favorites';

const SimulationDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [recentSimulations, setRecentSimulations] = useState<Simulation[]>([]);
  const [userStats, setUserStats] = useState<any>(null);

  const {
    loading: statsLoading,
    error: statsError,
    execute: fetchStats
  } = useApi(getUserSimulationStats);

  const {
    loading: recentLoading,
    error: recentError,
    execute: fetchRecent
  } = useApi(() => getRecentSimulations(5));

  useEffect(() => {
    if (activeTab === 'overview') {
      loadDashboardData();
    }
  }, [activeTab]);

  const loadDashboardData = async () => {
    try {
      const [stats, recent] = await Promise.all([
        fetchStats(),
        fetchRecent()
      ]);
      setUserStats(stats);
      setRecentSimulations(recent);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  const handleSimulationSelect = (simulation: Simulation) => {
    window.location.href = `/simulations/${simulation.id}`;
  };

  const handleCreateNew = () => {
    window.location.href = '/simulations/new';
  };

  const renderOverview = () => (
    <div className="dashboard-overview">
      {/* Quick Stats */}
      <div className="stats-grid">
        {statsLoading ? (
          <div className="stats-loading">
            <LoadingSpinner message="Loading statistics..." />
          </div>
        ) : statsError ? (
          <div className="stats-error">
            <ErrorDisplay error={statsError} onRetry={fetchStats} />
          </div>
        ) : userStats ? (
          <>
            <div className="stat-card">
              <div className="stat-icon">🤖</div>
              <div className="stat-content">
                <h3>{userStats.total_simulations || 0}</h3>
                <p>Total Simulations</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🏃‍♂️</div>
              <div className="stat-content">
                <h3>{userStats.running_simulations || 0}</h3>
                <p>Running</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <h3>{userStats.completed_simulations || 0}</h3>
                <p>Completed</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🔗</div>
              <div className="stat-content">
                <h3>{userStats.shared_simulations || 0}</h3>
                <p>Shared</p>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-grid">
          <button className="action-card" onClick={handleCreateNew}>
            <div className="action-icon">➕</div>
            <div className="action-content">
              <h4>New Simulation</h4>
              <p>Start creating a new robot simulation</p>
            </div>
          </button>

          <button 
            className="action-card"
            onClick={() => setActiveTab('public')}
          >
            <div className="action-icon">🌐</div>
            <div className="action-content">
              <h4>Browse Public</h4>
              <p>Explore simulations shared by the community</p>
            </div>
          </button>

          <button 
            className="action-card"
            onClick={() => window.location.href = '/simulations/templates'}
          >
            <div className="action-icon">📋</div>
            <div className="action-content">
              <h4>Use Template</h4>
              <p>Start with a pre-built simulation template</p>
            </div>
          </button>

          <button 
            className="action-card"
            onClick={() => window.location.href = '/tutorials'}
          >
            <div className="action-icon">🎓</div>
            <div className="action-content">
              <h4>Learn</h4>
              <p>View tutorials and documentation</p>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Simulations */}
      <div className="recent-simulations">
        <div className="section-header">
          <h3>Recent Simulations</h3>
          <Button
            onClick={() => setActiveTab('my-simulations')}
            className="view-all-button"
          >
            View All
          </Button>
        </div>

        {recentLoading ? (
          <LoadingSpinner message="Loading recent simulations..." />
        ) : recentError ? (
          <ErrorDisplay error={recentError} onRetry={fetchRecent} />
        ) : recentSimulations.length > 0 ? (
          <div className="recent-list">
            {recentSimulations.map((simulation) => (
              <div 
                key={simulation.id} 
                className="recent-item"
                onClick={() => handleSimulationSelect(simulation)}
              >
                <div className="recent-info">
                  <h4>{simulation.name}</h4>
                  <p>{simulation.description || 'No description'}</p>
                  <span className="recent-date">
                    Updated {new Date(simulation.updated_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="recent-stats">
                  <span>{simulation.grid_width}×{simulation.grid_height}</span>
                  <span className={`status-dot ${simulation.status}`}></span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-recent">
            <p>No recent simulations. <button onClick={handleCreateNew}>Create your first simulation</button></p>
          </div>
        )}
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'my-simulations':
        return (
          <SimulationList
            mode="my"
            onSimulationSelect={handleSimulationSelect}
            showActions={true}
          />
        );
      case 'shared':
        return (
          <SimulationList
            mode="shared"
            onSimulationSelect={handleSimulationSelect}
            showActions={true}
          />
        );
      case 'public':
        return (
          <SimulationList
            mode="public"
            onSimulationSelect={handleSimulationSelect}
            showActions={false}
          />
        );
      case 'favorites':
        return (
          <div className="favorites-placeholder">
            <h3>Favorite Simulations</h3>
            <p>Feature coming soon! You'll be able to bookmark your favorite simulations here.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <AuthGuard>
      <Layout>
        <div className="simulation-dashboard">
          <div className="dashboard-header">
            <div className="welcome-section">
              <h1>Welcome back, {user?.first_name}!</h1>
              <p>Manage your robot simulations and explore the community</p>
            </div>
            
            <div className="header-actions">
              <Button
                onClick={handleCreateNew}
                className="create-button primary"
              >
                + New Simulation
              </Button>
            </div>
          </div>

          <div className="dashboard-navigation">
            <nav className="dashboard-tabs">
              <button
                className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <span className="tab-icon">📊</span>
                Overview
              </button>
              
              <button
                className={`tab-button ${activeTab === 'my-simulations' ? 'active' : ''}`}
                onClick={() => setActiveTab('my-simulations')}
              >
                <span className="tab-icon">🤖</span>
                My Simulations
              </button>
              
              <button
                className={`tab-button ${activeTab === 'shared' ? 'active' : ''}`}
                onClick={() => setActiveTab('shared')}
              >
                <span className="tab-icon">👥</span>
                Shared with Me
              </button>
              
              <button
                className={`tab-button ${activeTab === 'public' ? 'active' : ''}`}
                onClick={() => setActiveTab('public')}
              >
                <span className="tab-icon">🌐</span>
                Public
              </button>
              
              <button
                className={`tab-button ${activeTab === 'favorites' ? 'active' : ''}`}
                onClick={() => setActiveTab('favorites')}
              >
                <span className="tab-icon">⭐</span>
                Favorites
              </button>
            </nav>
          </div>

          <div className="dashboard-content">
            {renderTabContent()}
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
};

export default SimulationDashboard;