// src/__tests__/components/GridVisualRepresentation.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Grid from '../../components/Grid/Grid';
import GridCell from '../../components/Grid/GridCell';
import { CellType } from '../../types/grid';
import { RobotVersion, RobotStatus } from '../../types/robot';

describe('Grid Visual Representation', () => {
  const defaultProps = {
    width: 5,
    height: 5,
    onCellClick: jest.fn(),
    mode: 'view' as const
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Wall rendering', () => {
    test('renders walls with correct visual styling', () => {
      const walls = [
        { id: 1, simulation_id: 1, x_position: 2, y_position: 3, type: 'wall', created_at: '2023-01-01' },
        { id: 2, simulation_id: 1, x_position: 4, y_position: 1, type: 'wall', created_at: '2023-01-01' }
      ];

      render(<Grid {...defaultProps} walls={walls} />);

      // Check that wall cells are rendered with correct class
      const wallCell1 = screen.getByTitle('Cell (2, 3) - wall');
      const wallCell2 = screen.getByTitle('Cell (4, 1) - wall');

      expect(wallCell1).toHaveClass('cell-wall');
      expect(wallCell2).toHaveClass('cell-wall');

      // Check wall icons are present
      expect(screen.getAllByText('⬛')).toHaveLength(2);
    });

    test('renders pending walls with different styling', () => {
      const pendingWalls = [
        { x_position: 3, y_position: 2 },
        { x_position: 1, y_position: 4 }
      ];

      render(<Grid {...defaultProps} pendingWalls={pendingWalls} />);

      // Check that pending wall cells are rendered with correct class
      const pendingCell1 = screen.getByTitle('Cell (3, 2) - pending_wall');
      const pendingCell2 = screen.getByTitle('Cell (1, 4) - pending_wall');

      expect(pendingCell1).toHaveClass('cell-pending_wall');
      expect(pendingCell2).toHaveClass('cell-pending_wall');

      // Check pending wall icons are present
      expect(screen.getAllByText('⬜')).toHaveLength(2);
    });

    test('prioritizes walls over empty cells', () => {
      const walls = [
        { id: 1, simulation_id: 1, x_position: 2, y_position: 2, type: 'wall', created_at: '2023-01-01' }
      ];

      render(<Grid {...defaultProps} walls={walls} />);

      // Cell (2,2) should be a wall, not empty
      const wallCell = screen.getByTitle('Cell (2, 2) - wall');
      expect(wallCell).toHaveClass('cell-wall');
      expect(wallCell).not.toHaveClass('cell-empty');
    });

    test('shows pending walls over empty cells but under existing walls', () => {
      const walls = [
        { id: 1, simulation_id: 1, x_position: 2, y_position: 2, type: 'wall', created_at: '2023-01-01' }
      ];
      const pendingWalls = [
        { x_position: 2, y_position: 2 }, // Same position as existing wall
        { x_position: 3, y_position: 3 }  // Empty position
      ];

      render(<Grid {...defaultProps} walls={walls} pendingWalls={pendingWalls} />);

      // Existing wall should take priority
      const existingWallCell = screen.getByTitle('Cell (2, 2) - wall');
      expect(existingWallCell).toHaveClass('cell-wall');

      // Pending wall should show in empty position
      const pendingWallCell = screen.getByTitle('Cell (3, 3) - pending_wall');
      expect(pendingWallCell).toHaveClass('cell-pending_wall');
    });
  });

  describe('Multi-layer cell rendering', () => {
    test('renders base station, robots, and walls correctly in same grid', () => {
      const baseStation = { x: 0, y: 0 };
      const robots = [{
        id: 1,
        simulation_id: 1,
        name: 'Test Robot',
        version: RobotVersion.V1,
        x_position: 1,
        y_position: 1,
        direction: 'north',
        battery_level: 100,
        status: RobotStatus.IDLE,
        color: '#3B82F6',
        created_at: '2023-01-01',
        updated_at: '2023-01-01'
      }];
      const walls = [
        { id: 1, simulation_id: 1, x_position: 2, y_position: 2, type: 'wall', created_at: '2023-01-01' }
      ];

      render(
        <Grid 
          {...defaultProps} 
          baseStation={baseStation}
          robots={robots}
          walls={walls}
        />
      );

      // Check all different cell types are rendered
      expect(screen.getByTitle('Cell (0, 0) - base_station')).toHaveClass('cell-base_station');
      expect(screen.getByTitle('Cell (1, 1) - robot')).toHaveClass('cell-robot');
      expect(screen.getByTitle('Cell (2, 2) - wall')).toHaveClass('cell-wall');

      // Check icons are present
      expect(screen.getByText('🏠')).toBeInTheDocument(); // Base station
      expect(screen.getByText('🤖')).toBeInTheDocument(); // Robot
      expect(screen.getByText('⬛')).toBeInTheDocument(); // Wall
    });

    test('robot takes priority over walls at same position', () => {
      const robots = [{
        id: 1,
        simulation_id: 1,
        name: 'Test Robot',
        version: RobotVersion.V1,
        x_position: 2,
        y_position: 2,
        direction: 'north',
        battery_level: 100,
        status: RobotStatus.IDLE,
        color: '#3B82F6',
        created_at: '2023-01-01',
        updated_at: '2023-01-01'
      }];
      const walls = [
        { id: 1, simulation_id: 1, x_position: 2, y_position: 2, type: 'wall', created_at: '2023-01-01' }
      ];

      render(<Grid {...defaultProps} robots={robots} walls={walls} />);

      // Robot should take priority over wall
      const cell = screen.getByTitle('Cell (2, 2) - robot');
      expect(cell).toHaveClass('cell-robot');
      expect(cell).not.toHaveClass('cell-wall');
    });
  });

  describe('Wall mode interactions', () => {
    test('enables wall placement mode', () => {
      const onCellClick = jest.fn();
      
      render(<Grid {...defaultProps} mode="wall" onCellClick={onCellClick} />);

      // Grid should have wall mode class
      const grid = document.querySelector('.grid-container');
      expect(grid).toHaveClass('grid-mode-wall');

      // Empty cells should be selectable in wall mode
      const emptyCell = screen.getByTitle('Cell (0, 0) - empty (Click to interact)');
      expect(emptyCell).toHaveClass('cell-selectable');
    });

    test('handles wall toggle interactions', () => {
      const onCellClick = jest.fn();
      const walls = [
        { id: 1, simulation_id: 1, x_position: 2, y_position: 2, type: 'wall', created_at: '2023-01-01' }
      ];
      
      render(<Grid {...defaultProps} mode="wall" walls={walls} onCellClick={onCellClick} />);

      // Click on existing wall to remove it
      const wallCell = screen.getByTitle('Cell (2, 2) - wall (Click to interact)');
      fireEvent.click(wallCell);

      expect(onCellClick).toHaveBeenCalledWith(2, 2);
    });

    test('handles pending wall interactions', () => {
      const onCellClick = jest.fn();
      const pendingWalls = [
        { x_position: 3, y_position: 3 }
      ];
      
      render(<Grid {...defaultProps} mode="wall" pendingWalls={pendingWalls} onCellClick={onCellClick} />);

      // Click on pending wall to remove it
      const pendingCell = screen.getByTitle('Cell (3, 3) - pending_wall (Click to interact)');
      fireEvent.click(pendingCell);

      expect(onCellClick).toHaveBeenCalledWith(3, 3);
    });
  });

  describe('GridCell component', () => {
    test('renders wall cell with correct styling', () => {
      const wallState = {
        type: CellType.WALL,
        wallId: 1,
        isSelectable: true
      };

      render(
        <GridCell
          x={2}
          y={3}
          state={wallState}
          onClick={jest.fn()}
        />
      );

      const cell = screen.getByRole('button');
      expect(cell).toHaveClass('cell-wall');
      expect(cell).toHaveClass('cell-selectable');
      expect(screen.getByText('⬛')).toBeInTheDocument();
    });

    test('renders pending wall cell with correct styling', () => {
      const pendingState = {
        type: CellType.PENDING_WALL,
        isPending: true,
        isSelectable: true
      };

      render(
        <GridCell
          x={1}
          y={1}
          state={pendingState}
          onClick={jest.fn()}
        />
      );

      const cell = screen.getByRole('button');
      expect(cell).toHaveClass('cell-pending_wall');
      expect(cell).toHaveClass('cell-pending');
      expect(cell).toHaveClass('cell-selectable');
      expect(screen.getByText('⬜')).toBeInTheDocument();
    });

    test('applies disabled state correctly', () => {
      const wallState = {
        type: CellType.WALL,
        isSelectable: false
      };

      render(
        <GridCell
          x={0}
          y={0}
          state={wallState}
          onClick={jest.fn()}
          disabled={true}
        />
      );

      const cell = screen.getByRole('button');
      expect(cell).toHaveClass('cell-disabled');
      expect(cell).toHaveAttribute('tabIndex', '-1');
    });

    test('handles keyboard interactions for wall cells', () => {
      const onClick = jest.fn();
      const wallState = {
        type: CellType.WALL,
        isSelectable: true
      };

      render(
        <GridCell
          x={2}
          y={3}
          state={wallState}
          onClick={onClick}
        />
      );

      const cell = screen.getByRole('button');
      
      // Test Enter key
      fireEvent.keyDown(cell, { key: 'Enter' });
      expect(onClick).toHaveBeenCalledWith(2, 3);

      // Test Space key
      fireEvent.keyDown(cell, { key: ' ' });
      expect(onClick).toHaveBeenCalledTimes(2);
    });
  });

  describe('Accessibility', () => {
    test('provides proper ARIA labels for wall cells', () => {
      const walls = [
        { id: 1, simulation_id: 1, x_position: 2, y_position: 3, type: 'wall', created_at: '2023-01-01' }
      ];

      render(<Grid {...defaultProps} walls={walls} />);

      const wallCell = screen.getByTitle('Cell (2, 3) - wall');
      expect(wallCell).toHaveAttribute('role', 'button');
      expect(wallCell).toHaveAttribute('title', 'Cell (2, 3) - wall');
    });

    test('provides proper keyboard navigation for selectable cells', () => {
      render(<Grid {...defaultProps} mode="wall" />);

      const selectableCells = screen.getAllByRole('button');
      const selectableCell = selectableCells.find(cell => 
        cell.getAttribute('tabIndex') === '0'
      );

      expect(selectableCell).toBeDefined();
    });

    test('excludes non-selectable cells from tab order', () => {
      const walls = [
        { id: 1, simulation_id: 1, x_position: 2, y_position: 3, type: 'wall', created_at: '2023-01-01' }
      ];

      render(<Grid {...defaultProps} mode="view" walls={walls} />);

      const wallCell = screen.getByTitle('Cell (2, 3) - wall');
      expect(wallCell).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Performance', () => {
    test('renders large grids efficiently', () => {
      const largeGridProps = {
        ...defaultProps,
        width: 50,
        height: 50
      };

      const start = performance.now();
      render(<Grid {...largeGridProps} />);
      const end = performance.now();

      // Should render within reasonable time (adjust threshold as needed)
      expect(end - start).toBeLessThan(1000);
    });

    test('handles many walls efficiently', () => {
      const manyWalls = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        simulation_id: 1,
        x_position: i % 10,
        y_position: Math.floor(i / 10),
        type: 'wall',
        created_at: '2023-01-01'
      }));

      const start = performance.now();
      render(<Grid {...defaultProps} width={10} height={10} walls={manyWalls} />);
      const end = performance.now();

      expect(end - start).toBeLessThan(500);
    });
  });
});