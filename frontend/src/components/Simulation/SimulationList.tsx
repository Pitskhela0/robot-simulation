// src/components/Simulation/SimulationList.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Simulation, 
  SimulationFilters, 
  PaginatedSimulations,
  SimulationPermissions 
} from '../../types/simulation';
import { 
  getMySimulations, 
  getSharedSimulations, 
  getPublicSimulations,
  deleteSimulation,
  toggleSimulationFavorite 
} from '../../services/simulationService';
import { useApi } from '../../hooks/useApi';
import Button from '../UI/Button';
import Input from '../UI/Input';
import Select from '../UI/Select';
import LoadingSpinner from '../UI/LoadingSpinner';
import ErrorDisplay from '../UI/ErrorDisplay';
import { SimulationPermissionBadge } from './SimulationSharingModal';
import './SimulationList.css';

interface SimulationListProps {
  mode: 'my' | 'shared' | 'public';
  onSimulationSelect?: (simulation: Simulation) => void;
  showActions?: boolean;
}

const SimulationList: React.FC<SimulationListProps> = ({
  mode,
  onSimulationSelect,
  showActions = true
}) => {
  const { user } = useAuth();
  const [simulations, setSimulations] = useState<PaginatedSimulations | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('updated_at');

  const {
    loading,
    error,
    execute: fetchSimulations
  } = useApi(async () => {
    const filters: SimulationFilters = {};
    if (searchQuery) filters.search = searchQuery;
    if (statusFilter) filters.status = statusFilter;

    switch (mode) {
      case 'my':
        return getMySimulations(currentPage, 10, filters);
      case 'shared':
        return getSharedSimulations(currentPage, 10);
      case 'public':
        return getPublicSimulations(currentPage, 10, searchQuery);
      default:
        throw new Error('Invalid simulation list mode');
    }
  });

  useEffect(() => {
    loadSimulations();
  }, [mode, currentPage, searchQuery, statusFilter, sortBy]);

  const loadSimulations = async () => {
    try {
      const result = await fetchSimulations();
      setSimulations(result);
    } catch (err) {
      console.error('Failed to load simulations:', err);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleFilterChange = (filter: string) => {
    setStatusFilter(filter);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleDeleteSimulation = async (simulationId: number) => {
    if (!window.confirm('Are you sure you want to delete this simulation? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteSimulation(simulationId);
      await loadSimulations(); // Refresh the list
    } catch (err) {
      console.error('Failed to delete simulation:', err);
      // You might want to show an error toast here
    }
  };

  const handleToggleFavorite = async (simulationId: number) => {
    try {
      await toggleSimulationFavorite(simulationId);
      await loadSimulations(); // Refresh to show updated favorite status
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleDuplicateSimulation = (simulation: Simulation) => {
    // Navigate to creation with this simulation as template
    window.location.href = `/simulations/new?template=${simulation.id}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#22c55e';
      case 'running': return '#3b82f6';
      case 'paused': return '#f59e0b';
      case 'failed': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'created', label: 'Created' },
    { value: 'running', label: 'Running' },
    { value: 'paused', label: 'Paused' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' }
  ];

  if (loading && !simulations) {
    return <LoadingSpinner message="Loading simulations..." />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={loadSimulations} />;
  }

  return (
    <div className="simulation-list">
      {/* Header and Controls */}
      <div className="simulation-list-header">
        <div className="list-title">
          <h3>
            {mode === 'my' && 'My Simulations'}
            {mode === 'shared' && 'Shared with Me'}
            {mode === 'public' && 'Public Simulations'}
          </h3>
          <span className="simulation-count">
            {simulations?.pagination.total || 0} simulation(s)
          </span>
        </div>

        <div className="list-controls">
          <div className="search-control">
            <Input
              type="text"
              placeholder="Search simulations..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="search-input"
            />
          </div>

          {mode !== 'public' && (
            <div className="filter-control">
              <Select
                value={statusFilter}
                onChange={(e) => handleFilterChange(e.target.value)}
                options={statusOptions}
                className="status-filter"
              />
            </div>
          )}

          {mode === 'my' && (
            <div className="action-control">
              <Button 
                onClick={() => window.location.href = '/simulations/new'}
                className="create-button"
              >
                + New Simulation
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Simulation Cards */}
      <div className="simulation-grid">
        {simulations?.data.map((simulation) => (
          <SimulationCard
            key={simulation.id}
            simulation={simulation}
            currentUserId={user?.id}
            showActions={showActions}
            onSelect={() => onSimulationSelect?.(simulation)}
            onDelete={() => handleDeleteSimulation(simulation.id)}
            onToggleFavorite={() => handleToggleFavorite(simulation.id)}
            onDuplicate={() => handleDuplicateSimulation(simulation)}
          />
        ))}
      </div>

      {/* Empty State */}
      {simulations?.data.length === 0 && (
        <div className="empty-simulation-list">
          <div className="empty-icon">🤖</div>
          <h4>
            {mode === 'my' && 'No simulations yet'}
            {mode === 'shared' && 'No shared simulations'}
            {mode === 'public' && searchQuery ? 'No simulations found' : 'No public simulations'}
          </h4>
          <p>
            {mode === 'my' && 'Create your first simulation to get started'}
            {mode === 'shared' && 'Simulations shared with you will appear here'}
            {mode === 'public' && (searchQuery ? 'Try adjusting your search' : 'No public simulations available')}
          </p>
          {mode === 'my' && (
            <Button onClick={() => window.location.href = '/simulations/new'}>
              Create Simulation
            </Button>
          )}
        </div>
      )}

      {/* Pagination */}
      {simulations && simulations.pagination.totalPages > 1 && (
        <div className="simulation-pagination">
          <Button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={!simulations.pagination.hasPrev}
            className="pagination-btn"
          >
            Previous
          </Button>
          
          <span className="pagination-info">
            Page {simulations.pagination.page} of {simulations.pagination.totalPages}
          </span>
          
          <Button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!simulations.pagination.hasNext}
            className="pagination-btn"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

// Individual Simulation Card Component
interface SimulationCardProps {
  simulation: Simulation;
  currentUserId?: number;
  showActions: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onDuplicate: () => void;
}

const SimulationCard: React.FC<SimulationCardProps> = ({
  simulation,
  currentUserId,
  showActions,
  onSelect,
  onDelete,
  onToggleFavorite,
  onDuplicate
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const canWrite = SimulationPermissions.canWrite(simulation, currentUserId);
  const canDelete = SimulationPermissions.canDelete(simulation, currentUserId);
  const canShare = SimulationPermissions.canShare(simulation, currentUserId);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger onSelect if clicking on action buttons
    if ((e.target as Element).closest('.simulation-actions')) {
      return;
    }
    onSelect();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#22c55e';
      case 'running': return '#3b82f6';
      case 'paused': return '#f59e0b';
      case 'failed': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div className="simulation-card" onClick={handleCardClick}>
      <div className="simulation-card-header">
        <div className="simulation-info">
          <h4 className="simulation-name">{simulation.name}</h4>
          <div className="simulation-meta">
            <span className="simulation-owner">
              by {simulation.owner.first_name} {simulation.owner.last_name}
            </span>
            <span className="simulation-date">
              Updated {formatDate(simulation.updated_at)}
            </span>
          </div>
        </div>

        {showActions && (
          <div className="simulation-actions">
            <button
              className="favorite-button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              title="Add to favorites"
            >
              ⭐
            </button>

            <div className="action-dropdown">
              <button
                className="action-menu-button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDropdown(!showDropdown);
                }}
              >
                ⋮
              </button>

              {showDropdown && (
                <div className="action-dropdown-menu">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect();
                      setShowDropdown(false);
                    }}
                  >
                    Open
                  </button>

                  {canWrite && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/simulations/${simulation.id}/edit`;
                        setShowDropdown(false);
                      }}
                    >
                      Edit
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicate();
                      setShowDropdown(false);
                    }}
                  >
                    Duplicate
                  </button>

                  {canShare && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Open sharing modal
                        setShowDropdown(false);
                      }}
                    >
                      Share
                    </button>
                  )}

                  {canDelete && (
                    <>
                      <div className="dropdown-divider"></div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete();
                          setShowDropdown(false);
                        }}
                        className="delete-action"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="simulation-card-content">
        {simulation.description && (
          <p className="simulation-description">{simulation.description}</p>
        )}

        <div className="simulation-stats">
          <div className="stat-item">
            <span className="stat-icon">🤖</span>
            <span className="stat-value">{simulation.robot_count || 0}</span>
            <span className="stat-label">Robots</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">📋</span>
            <span className="stat-value">{simulation.task_count || 0}</span>
            <span className="stat-label">Tasks</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">🧱</span>
            <span className="stat-value">{simulation.wall_count || 0}</span>
            <span className="stat-label">Walls</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">📐</span>
            <span className="stat-value">{simulation.grid_width}×{simulation.grid_height}</span>
            <span className="stat-label">Grid</span>
          </div>
        </div>
      </div>

      <div className="simulation-card-footer">
        <div className="simulation-badges">
          <span
            className="status-badge"
            style={{ backgroundColor: getStatusColor(simulation.status) }}
          >
            {simulation.status}
          </span>

          <SimulationPermissionBadge
            simulation={simulation}
            userId={currentUserId}
          />

          {simulation.is_public && (
            <span className="public-badge">Public</span>
          )}
        </div>

        <div className="simulation-shared-info">
          {simulation.shared_with.length > 0 && (
            <span className="shared-count">
              Shared with {simulation.shared_with.length} user{simulation.shared_with.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimulationList;