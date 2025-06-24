// src/__tests__/components/RobotCard.test.tsx 
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SimulationProvider } from '../../context/SimulationContext';
import RobotCard from '../../features/simulation-setup/RobotCard';
import { Robot, RobotVersion, RobotStatus } from '../../types/robot';
import * as robotService from '../../services/robotService';

// Mock the robot service
jest.mock('../../services/robotService');
const mockDeleteRobot = robotService.deleteRobot as jest.MockedFunction<typeof robotService.deleteRobot>;

const mockRobot: Robot = {
  id: 1,
  simulation_id: 1,
  name: 'Test Robot',
  version: RobotVersion.V1,
  x_position: 0,
  y_position: 0,
  direction: 'north',
  battery_level: 100,
  status: RobotStatus.IDLE,
  color: '#3B82F6',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z'
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SimulationProvider>
    {children}
  </SimulationProvider>
);

describe('RobotCard Component', () => {
  beforeEach(() => {
    mockDeleteRobot.mockClear();
  });

  test('renders robot information', () => {
    const mockOnDeleted = jest.fn();
    
    render(
      <TestWrapper>
        <RobotCard robot={mockRobot} onDeleted={mockOnDeleted} />
      </TestWrapper>
    );
    
    expect(screen.getByText('Test Robot')).toBeInTheDocument();
    expect(screen.getByText('Standard Robot (V1)')).toBeInTheDocument();
    expect(screen.getByText('(0, 0)')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  test('shows and hides details when toggle is clicked', () => {
    const mockOnDeleted = jest.fn();
    
    render(
      <TestWrapper>
        <RobotCard robot={mockRobot} onDeleted={mockOnDeleted} />
      </TestWrapper>
    );
    
    // Initially details should be hidden
    expect(screen.queryByText('Capabilities')).not.toBeInTheDocument();
    
    // Click to show details
    fireEvent.click(screen.getByTitle('Show details'));
    expect(screen.getByText('Capabilities')).toBeInTheDocument();
    
    // Click to hide details
    fireEvent.click(screen.getByTitle('Hide details'));
    expect(screen.queryByText('Capabilities')).not.toBeInTheDocument();
  });

  test('calls delete API when delete button is clicked', async () => {
    mockDeleteRobot.mockResolvedValueOnce();
    const mockOnDeleted = jest.fn();
    
    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = jest.fn(() => true);
    
    render(
      <TestWrapper>
        <RobotCard robot={mockRobot} onDeleted={mockOnDeleted} />
      </TestWrapper>
    );
    
    fireEvent.click(screen.getByTitle('Delete robot'));
    
    await waitFor(() => {
      expect(mockDeleteRobot).toHaveBeenCalledWith(1);
      expect(mockOnDeleted).toHaveBeenCalled();
    });
    
    // Restore window.confirm
    window.confirm = originalConfirm;
  });
});