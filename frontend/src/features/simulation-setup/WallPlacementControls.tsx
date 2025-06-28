// src/features/simulation-setup/WallPlacementControls.tsx
import React from 'react';
import Button from '../../components/UI/Button';
import './WallPlacementControls.css';

interface WallPlacementControlsProps {
  wallMode: boolean;
  wallCount: number;
  pendingCount: number;
  canUndo: boolean;
  hasChanges: boolean;
  isLoading: boolean;
  onToggleWallMode: () => void;
  onSavePending: () => void;
  onClearAll: () => void;
  onUndo: () => void;
}

const WallPlacementControls: React.FC<WallPlacementControlsProps> = ({
  wallMode,
  wallCount,
  pendingCount,
  canUndo,
  hasChanges,
  isLoading,
  onToggleWallMode,
  onSavePending,
  onClearAll,
  onUndo
}) => {
  return (
    <div className="wall-placement-controls">
      <div className="wall-stats">
        <div className="stat-item">
          <span className="stat-label">Total Walls:</span>
          <span className="stat-value">{wallCount}</span>
        </div>
        {pendingCount > 0 && (
          <div className="stat-item pending">
            <span className="stat-label">Pending:</span>
            <span className="stat-value">{pendingCount}</span>
          </div>
        )}
      </div>

      <div className="wall-controls">
        <div className="primary-controls">
          <Button
            onClick={onToggleWallMode}
            disabled={isLoading}
            className={`wall-mode-toggle ${wallMode ? 'active' : ''}`}
          >
            {wallMode ? '🧱 Exit Wall Mode' : '🧱 Place Walls'}
          </Button>

          {hasChanges && (
            <Button
              onClick={onSavePending}
              disabled={isLoading || pendingCount === 0}
              className="save-walls-btn"
            >
              {isLoading ? 'Saving...' : `Save ${pendingCount} Wall(s)`}
            </Button>
          )}
        </div>

        <div className="secondary-controls">
          <Button
            onClick={onUndo}
            disabled={!canUndo || isLoading}
            className="undo-btn"
            title="Undo last action"
          >
            ↶ Undo
          </Button>

          <Button
            onClick={onClearAll}
            disabled={wallCount === 0 || isLoading}
            className="clear-all-btn danger"
            title="Remove all walls"
          >
            🗑️ Clear All
          </Button>
        </div>
      </div>

      {wallMode && (
        <div className="wall-mode-tips">
          <h5>Wall Placement Tips:</h5>
          <ul>
            <li>Click empty cells to add walls</li>
            <li>Click existing walls to remove them</li>
            <li>Walls block robot movement</li>
            <li>Cannot place walls at base station or robot locations</li>
            <li>Use "Save" to confirm your changes</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default WallPlacementControls;