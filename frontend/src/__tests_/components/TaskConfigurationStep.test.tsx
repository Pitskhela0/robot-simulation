// src/__tests__/components/TaskConfigurationStep.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SimulationProvider } from '../../context/SimulationContext';
import TaskConfigurationStep from '../../features/simulation-setup/TaskConfigurationStep';
import * as taskService from '../../services/taskService';
import * as wallService from '../../services/wallService';
import { TaskType, TaskStatus, Task } from '../../types/task';
import AddTaskForm from '../../features/simulation-setup/AddTaskForm';
import { Wall } from '../../types/grid';




// Mock the services
jest.mock('../../services/taskService');
jest.mock('../../services/wallService');

const mockGetTasksBySimulation = taskService.getTasksBySimulation as jest.MockedFunction<typeof taskService.getTasksBySimulation>;
const mockGetWallsBySimulation = wallService.getWallsBySimulation as jest.MockedFunction<typeof wallService.getWallsBySimulation>;
const mockCreateTask = taskService.createTask as jest.MockedFunction<typeof taskService.createTask>;
const mockDeleteTask = taskService.deleteTask as jest.MockedFunction<typeof taskService.deleteTask>;

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
  robots: [
    {
      id: 1,
      simulation_id: 1,
      name: 'Test Robot',
      version: 'V1',
      x_position: 0,
      y_position: 0,
      direction: 'north',
      battery_level: 100,
      status: 'idle',
      color: '#3B82F6',
      created_at: '2023-01-01',
      updated_at: '2023-01-01'
    }
  ]
};

jest.mock('../../context/SimulationContext', () => ({
  useSimulation: () => mockContextValue,
  SimulationProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

describe('TaskConfigurationStep Component', () => {
  beforeEach(() => {
    mockGetTasksBySimulation.mockClear();
    mockGetWallsBySimulation.mockClear();
    mockCreateTask.mockClear();
    mockDeleteTask.mockClear();
    
    // Default mock implementations
    mockGetTasksBySimulation.mockResolvedValue([]);
    mockGetWallsBySimulation.mockResolvedValue([]);
  });

  test('renders task configuration interface', async () => {
    render(
      <TestWrapper>
        <TaskConfigurationStep />
      </TestWrapper>
    );
    
    expect(screen.getByText('Configure Tasks')).toBeInTheDocument();
    expect(screen.getByText('Add tasks for robots to complete during the simulation.')).toBeInTheDocument();
    expect(screen.getByText('Total Tasks:')).toBeInTheDocument();
  });

  test('loads existing tasks on mount', async () => {
    const existingTasks = [
      {
        id: 1,
        simulation_id: 1,
        type: TaskType.PICKUP,
        target_x: 5,
        target_y: 5,
        priority: 1,
        status: TaskStatus.PENDING,
        created_at: '2023-01-01',
        updated_at: '2023-01-01'
      }
    ];
    
    mockGetTasksBySimulation.mockResolvedValueOnce(existingTasks);
    
    render(
      <TestWrapper>
        <TaskConfigurationStep />
      </TestWrapper>
    );
    
    await waitFor(() => {
      expect(mockGetTasksBySimulation).toHaveBeenCalledWith(1);
    });
  });

  test('shows add task form when button is clicked', async () => {
    render(
      <TestWrapper>
        <TaskConfigurationStep />
      </TestWrapper>
    );
    
    const addButton = screen.getByText('+ Add Task');
    fireEvent.click(addButton);
    
    expect(screen.getByText('Add New Task')).toBeInTheDocument();
    expect(screen.getByText('Configure a task for robots to complete')).toBeInTheDocument();
  });

  test('displays task statistics correctly', async () => {
    const tasks = [
      { id: 1, type: TaskType.PICKUP, status: TaskStatus.PENDING, priority: 1, target_x: 1, target_y: 1, simulation_id: 1, created_at: '2023-01-01', updated_at: '2023-01-01' },
      { id: 2, type: TaskType.CLEANING, status: TaskStatus.ASSIGNED, priority: 2, target_x: 2, target_y: 2, simulation_id: 1, created_at: '2023-01-01', updated_at: '2023-01-01' },
      { id: 3, type: TaskType.PICKUP, status: TaskStatus.PENDING, priority: 3, target_x: 3, target_y: 3, simulation_id: 1, created_at: '2023-01-01', updated_at: '2023-01-01' }
    ];
    
    mockGetTasksBySimulation.mockResolvedValueOnce(tasks);
    
    render(
      <TestWrapper>
        <TaskConfigurationStep />
      </TestWrapper>
    );
    
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument(); // Total tasks
      expect(screen.getByText('2')).toBeInTheDocument(); // Pending tasks
    });
  });

  test('shows task breakdown by type', async () => {
    const tasks = [
      { id: 1, type: TaskType.PICKUP, status: TaskStatus.PENDING, priority: 1, target_x: 1, target_y: 1, simulation_id: 1, created_at: '2023-01-01', updated_at: '2023-01-01' },
      { id: 1, type: TaskType.PICKUP, status: TaskStatus.PENDING, priority: 1, target_x: 1, target_y: 1, simulation_id: 1, created_at: '2023-01-01', updated_at: '2023-01-01' },
      { id: 1, type: TaskType.CLEANING, status: TaskStatus.PENDING, priority: 1, target_x: 1, target_y: 1, simulation_id: 1, created_at: '2023-01-01', updated_at: '2023-01-01' }
    ];
    
    mockGetTasksBySimulation.mockResolvedValueOnce(tasks);
    
    render(
      <TestWrapper>
        <TaskConfigurationStep />
      </TestWrapper>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Task Breakdown')).toBeInTheDocument();
    });
  });

  test('handles error when loading tasks fails', async () => {
    mockGetTasksBySimulation.mockRejectedValueOnce(new Error('Failed to load tasks'));
    
    render(
      <TestWrapper>
        <TaskConfigurationStep />
      </TestWrapper>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });
});

// src/__tests__/components/AddTaskForm.test.tsx
describe('AddTaskForm Component', () => {
  const mockOnSuccess = jest.fn();
  const mockOnCancel = jest.fn();
  const existingTasks: Task[] = [];
  const walls: Wall[] = [];

  beforeEach(() => {
    mockCreateTask.mockClear();
    mockOnSuccess.mockClear();
    mockOnCancel.mockClear();
  });

  test('renders form fields correctly', () => {
    render(
      <TestWrapper>
        <AddTaskForm 
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          existingTasks={existingTasks}
          walls={walls}
        />
      </TestWrapper>
    );
    
    expect(screen.getByLabelText('Task Type:')).toBeInTheDocument();
    expect(screen.getByLabelText('Target X Coordinate:')).toBeInTheDocument();
    expect(screen.getByLabelText('Target Y Coordinate:')).toBeInTheDocument();
    expect(screen.getByLabelText('Priority:')).toBeInTheDocument();
    expect(screen.getByLabelText('Description (Optional):')).toBeInTheDocument();
  });

  test('shows task preview when type is selected', () => {
    render(
      <TestWrapper>
        <AddTaskForm 
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          existingTasks={existingTasks}
          walls={walls}
        />
      </TestWrapper>
    );
    
    // Default selection should show pickup task preview
    expect(screen.getByText('Pick Up')).toBeInTheDocument();
    expect(screen.getByText('📦')).toBeInTheDocument();
    expect(screen.getByText('Pick up an object from the specified location')).toBeInTheDocument();
  });

  test('validates coordinate bounds', async () => {
    render(
      <TestWrapper>
        <AddTaskForm 
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          existingTasks={existingTasks}
          walls={walls}
        />
      </TestWrapper>
    );
    
    // Set coordinates outside grid bounds
    fireEvent.change(screen.getByLabelText('Target X Coordinate:'), {
      target: { value: '15' } // Outside 10x10 grid
    });
    
    fireEvent.click(screen.getByText('Add Task'));
    
    await waitFor(() => {
      expect(screen.getByText(/X coordinate must be less than/)).toBeInTheDocument();
    });
  });

  test('prevents task placement on base station', async () => {
    render(
      <TestWrapper>
        <AddTaskForm 
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          existingTasks={existingTasks}
          walls={walls}
        />
      </TestWrapper>
    );
    
    // Try to place task at base station (0,0)
    fireEvent.change(screen.getByLabelText('Target X Coordinate:'), {
      target: { value: '0' }
    });
    fireEvent.change(screen.getByLabelText('Target Y Coordinate:'), {
      target: { value: '0' }
    });
    
    fireEvent.click(screen.getByText('Add Task'));
    
    await waitFor(() => {
      expect(screen.getByText('Cannot place task at base station location')).toBeInTheDocument();
    });
  });

  test('calls create API when form is submitted with valid data', async () => {
    const newTask = { id: 1, type: TaskType.PICKUP, status: TaskStatus.PENDING, priority: 1, target_x: 1, target_y: 1, simulation_id: 1, created_at: '2023-01-01', updated_at: '2023-01-01' };
    
    mockCreateTask.mockResolvedValueOnce(newTask);
    
    render(
      <TestWrapper>
        <AddTaskForm 
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          existingTasks={existingTasks}
          walls={walls}
        />
      </TestWrapper>
    );
    
    // Fill in valid form data
    fireEvent.change(screen.getByLabelText('Target X Coordinate:'), {
      target: { value: '5' }
    });
    fireEvent.change(screen.getByLabelText('Target Y Coordinate:'), {
      target: { value: '5' }
    });
    
    fireEvent.click(screen.getByText('Add Task'));
    
    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith(1, {
        type: 'pickup',
        target_x: 5,
        target_y: 5,
        priority: 1,
        description: undefined
      });
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  test('calls onCancel when cancel button is clicked', () => {
    render(
      <TestWrapper>
        <AddTaskForm 
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          existingTasks={existingTasks}
          walls={walls}
        />
      </TestWrapper>
    );
    
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalled();
  });
});

// src/__tests__/utils/taskValidation.test.ts
import { 
  validateTaskCoordinates, 
  validateTaskPriority, 
  validateTaskForm,
  validateTaskPlacement 
} from '../../utils/taskValidation';

describe('Task Validation Utils', () => {
  describe('validateTaskCoordinates', () => {
    test('validates correct coordinates', () => {
      const result = validateTaskCoordinates(5, 3, 10, 10);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('rejects coordinates outside bounds', () => {
      const result = validateTaskCoordinates(15, 5, 10, 10);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('X coordinate must be less than 10');
    });

    test('rejects negative coordinates', () => {
      const result = validateTaskCoordinates(-1, 5, 10, 10);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('X coordinate must be a non-negative integer');
    });
  });

  describe('validateTaskPriority', () => {
    test('validates correct priority', () => {
      const result = validateTaskPriority(5);
      expect(result.isValid).toBe(true);
    });

    test('rejects priority outside range', () => {
      const result = validateTaskPriority(15);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Priority must be between 1 and 10');
    });
  });

  describe('validateTaskPlacement', () => {
    test('allows placement on empty cell', () => {
      const result = validateTaskPlacement(
        5, 5,
        { x: 0, y: 0 }, // base station
        [], // no robots
        []  // no walls
      );
      expect(result.isValid).toBe(true);
    });

    test('prevents placement on base station', () => {
      const result = validateTaskPlacement(
        0, 0,
        { x: 0, y: 0 }, // base station at same location
        [],
        []
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cannot place task at base station location');
    });

    test('prevents placement on robot', () => {
      const result = validateTaskPlacement(
        3, 3,
        { x: 0, y: 0 },
        [{ x_position: 3, y_position: 3 }], // robot at same location
        []
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cannot place task where robot is currently located');
    });

    test('prevents placement on wall', () => {
      const result = validateTaskPlacement(
        2, 2,
        { x: 0, y: 0 },
        [],
        [{ x_position: 2, y_position: 2 }] // wall at same location
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cannot place task on a wall');
    });
  });
});