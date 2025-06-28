// src/__tests__/components/WallPlacementStep.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SimulationProvider } from '../../context/SimulationContext';
import WallPlacementStep from '../../features/simulation-setup/WallPlacementStep';
import * as wallService from '../../services/wallService';

// Mock the wall service
jest.mock('../../services/wallService');
const mockCreateBatchWalls = wallService.createBatchWalls as jest.MockedFunction<typeof wallService.createBatchWalls>;
const mockGetWallsBySimulation = wallService.getWallsBySimulation as jest.MockedFunction<typeof wallService.getWallsBySimulation>;
const mockDeleteWall = wallService.deleteWall as jest.MockedFunction<typeof wallService.deleteWall>;

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SimulationProvider>
    {children}
  </SimulationProvider>
);

// Mock simulation context with required data
const mockContextValue = {
  simulationId: 1,
  width: 10,
  height: 10,
  baseStation: { x: 0, y: 0 },
  robots: []
};

jest.mock('../../context/SimulationContext', () => ({
  useSimulation: () => mockContextValue,
  SimulationProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

describe('WallPlacementStep Component', () => {
  beforeEach(() => {
    mockGetWallsBySimulation.mockClear();
    mockCreateBatchWalls.mockClear();
    mockDeleteWall.mockClear();
    
    // Default mock implementations
    mockGetWallsBySimulation.mockResolvedValue([]);
    mockCreateBatchWalls.mockResolvedValue({
      walls: [{ id: 1, simulation_id: 1, x_position: 5, y_position: 5, type: 'wall', created_at: '2023-01-01' }],
      count: 1
    });
    mockDeleteWall.mockResolvedValue();
  });

  test('renders wall placement interface', async () => {
    render(
      <TestWrapper>
        <WallPlacementStep />
      </TestWrapper>
    );
    
    expect(screen.getByText('Place Walls & Obstacles')).toBeInTheDocument();
    expect(screen.getByText('🧱 Place Walls')).toBeInTheDocument();
    expect(screen.getByText('Total Walls:')).toBeInTheDocument();
  });

  test('loads existing walls on mount', async () => {
    const existingWalls = [
      { id: 1, simulation_id: 1, x_position: 2, y_position: 3, type: 'wall', created_at: '2023-01-01' },
      { id: 2, simulation_id: 1, x_position: 4, y_position: 5, type: 'wall', created_at: '2023-01-01' }
    ];
    
    mockGetWallsBySimulation.mockResolvedValueOnce(existingWalls);
    
    render(
      <TestWrapper>
        <WallPlacementStep />
      </TestWrapper>
    );
    
    await waitFor(() => {
      expect(mockGetWallsBySimulation).toHaveBeenCalledWith(1);
    });
  });

  test('toggles wall mode when button is clicked', async () => {
    render(
      <TestWrapper>
        <WallPlacementStep />
      </TestWrapper>
    );
    
    const toggleButton = screen.getByText('🧱 Place Walls');
    fireEvent.click(toggleButton);
    
    expect(screen.getByText('🧱 Exit Wall Mode')).toBeInTheDocument();
    expect(screen.getByText('🧱 Click on empty cells to add walls, click on existing walls to remove them')).toBeInTheDocument();
  });

  test('prevents wall placement at base station', async () => {
    // Mock window.alert
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    
    render(
      <TestWrapper>
        <WallPlacementStep />
      </TestWrapper>
    );
    
    // Enable wall mode
    fireEvent.click(screen.getByText('🧱 Place Walls'));
    
    // Try to click on base station cell (0,0)
    const baseCell = screen.getByTitle('Cell (0, 0) - base_station (Click to interact)');
    fireEvent.click(baseCell);
    
    expect(alertSpy).toHaveBeenCalledWith('Cannot place wall at base station location');
    
    alertSpy.mockRestore();
  });

  test('creates batch walls when save is clicked', async () => {
    render(
      <TestWrapper>
        <WallPlacementStep />
      </TestWrapper>
    );
    
    // Enable wall mode
    fireEvent.click(screen.getByText('🧱 Place Walls'));
    
    // Click on empty cells to add pending walls
    const emptyCell = screen.getByTitle('Cell (5, 5) - empty (Click to interact)');
    fireEvent.click(emptyCell);
    
    // Should show pending count
    await waitFor(() => {
      expect(screen.getByText('Pending:')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });
    
    // Click save button
    const saveButton = screen.getByText('Save 1 Wall(s)');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockCreateBatchWalls).toHaveBeenCalledWith(1, {
        walls: [{ x_position: 5, y_position: 5, type: 'wall' }]
      });
    });
  });

  test('deletes existing wall when clicked', async () => {
    const existingWalls = [
      { id: 1, simulation_id: 1, x_position: 5, y_position: 5, type: 'wall', created_at: '2023-01-01' }
    ];
    
    mockGetWallsBySimulation.mockResolvedValueOnce(existingWalls);
    
    render(
      <TestWrapper>
        <WallPlacementStep />
      </TestWrapper>
    );
    
    await waitFor(() => {
      expect(mockGetWallsBySimulation).toHaveBeenCalled();
    });
    
    // Enable wall mode
    fireEvent.click(screen.getByText('🧱 Place Walls'));
    
    // Click on existing wall to remove it
    const wallCell = screen.getByTitle('Cell (5, 5) - wall (Click to interact)');
    fireEvent.click(wallCell);
    
    await waitFor(() => {
      expect(mockDeleteWall).toHaveBeenCalledWith(1);
    });
  });

  test('clears all walls when clear button is clicked', async () => {
    const existingWalls = [
      { id: 1, simulation_id: 1, x_position: 2, y_position: 3, type: 'wall', created_at: '2023-01-01' },
      { id: 2, simulation_id: 1, x_position: 4, y_position: 5, type: 'wall', created_at: '2023-01-01' }
    ];
    
    mockGetWallsBySimulation.mockResolvedValueOnce(existingWalls);
    
    // Mock window.confirm
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    
    render(
      <TestWrapper>
        <WallPlacementStep />
      </TestWrapper>
    );
    
    await waitFor(() => {
      expect(mockGetWallsBySimulation).toHaveBeenCalled();
    });
    
    // Click clear all button
    const clearButton = screen.getByText('🗑️ Clear All');
    fireEvent.click(clearButton);
    
    expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to remove all 2 walls?');
    
    await waitFor(() => {
      expect(mockDeleteWall).toHaveBeenCalledTimes(2);
      expect(mockDeleteWall).toHaveBeenCalledWith(1);
      expect(mockDeleteWall).toHaveBeenCalledWith(2);
    });
    
    confirmSpy.mockRestore();
  });

  test('handles undo functionality', async () => {
    render(
      <TestWrapper>
        <WallPlacementStep />
      </TestWrapper>
    );
    
    // Enable wall mode
    fireEvent.click(screen.getByText('🧱 Place Walls'));
    
    // Add a wall
    const emptyCell = screen.getByTitle('Cell (5, 5) - empty (Click to interact)');
    fireEvent.click(emptyCell);
    
    // Save the wall
    const saveButton = screen.getByText('Save 1 Wall(s)');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockCreateBatchWalls).toHaveBeenCalled();
    });
    
    // Undo button should now be enabled
    const undoButton = screen.getByText('↶ Undo');
    expect(undoButton).not.toBeDisabled();
    
    fireEvent.click(undoButton);
    
    await waitFor(() => {
      expect(mockDeleteWall).toHaveBeenCalled();
    });
  });

  test('shows error message when API calls fail', async () => {
    mockGetWallsBySimulation.mockRejectedValueOnce(new Error('Failed to load walls'));
    
    render(
      <TestWrapper>
        <WallPlacementStep />
      </TestWrapper>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Failed to load walls')).toBeInTheDocument();
    });
  });

  test('displays correct wall count', async () => {
    const existingWalls = [
      { id: 1, simulation_id: 1, x_position: 2, y_position: 3, type: 'wall', created_at: '2023-01-01' },
      { id: 2, simulation_id: 1, x_position: 4, y_position: 5, type: 'wall', created_at: '2023-01-01' }
    ];
    
    mockGetWallsBySimulation.mockResolvedValueOnce(existingWalls);
    
    render(
      <TestWrapper>
        <WallPlacementStep />
      </TestWrapper>
    );
    
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument(); // Total walls count
    });
  });

  test('shows wall placement tips when in wall mode', async () => {
    render(
      <TestWrapper>
        <WallPlacementStep />
      </TestWrapper>
    );
    
    // Enable wall mode
    fireEvent.click(screen.getByText('🧱 Place Walls'));
    
    expect(screen.getByText('Wall Placement Tips:')).toBeInTheDocument();
    expect(screen.getByText('Click empty cells to add walls')).toBeInTheDocument();
    expect(screen.getByText('Click existing walls to remove them')).toBeInTheDocument();
    expect(screen.getByText('Walls block robot movement')).toBeInTheDocument();
  });
});