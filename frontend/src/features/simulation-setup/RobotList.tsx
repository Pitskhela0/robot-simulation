// src/features/simulation-setup/RobotList.tsx
import React from 'react';
import { Robot } from '../../types/robot';
import RobotCard from './RobotCard';
import './RobotList.css';

interface RobotListProps {
  robots: Robot[];
  onRobotDeleted: () => void;
}

const RobotList: React.FC<RobotListProps> = ({ robots, onRobotDeleted }) => {
  if (robots.length === 0) {
    return (
      <div className="robot-list empty">
        <div className="empty-state">
          <span className="empty-icon">🤖</span>
          <p>No robots added yet</p>
          <p className="empty-subtitle">Add your first robot to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="robot-list">
      <h4>Robots ({robots.length})</h4>
      <div className="robot-cards">
        {robots.map((robot) => (
          <RobotCard
            key={robot.id}
            robot={robot}
            onDeleted={onRobotDeleted}
          />
        ))}
      </div>
    </div>
  );
};

export default RobotList;