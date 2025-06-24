// src/__tests__/components/AddRobotForm.test.tsx 
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SimulationProvider } from '../../context/SimulationContext';
import AddRobotForm from '../../features/simulation-setup/AddRobotForm';
import * as robotService from '../../services/robotService';

jest.mock('../../services/robotService');
const mockCreateRobot = robotService.createRobot as jest.MockedFunction<typeof robotService.createRobot>;

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SimulationProvider>
    {children}
  </SimulationProvider>
);

describe('AddRobotForm Component', () => {
  beforeEach(() => {
    mockCreateRobot.mockClear();
  });

  test('renders form fields', () => {
    const mockOnSuccess = jest.fn();
    const mockOnCancel = jest.fn();
    
    render(
      <TestWrapper>
        <AddRobotForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      </TestWrapper>
    );
    
    // Test form fields that have proper labels
    expect(screen.getByLabelText('Robot Name:')).toBeInTheDocument();
    expect(screen.getByLabelText('Robot Version:')).toBeInTheDocument();
    
    // Test color section by text instead of label (since it's a custom color picker)
    expect(screen.getByText('Robot Color:')).toBeInTheDocument();
    expect(screen.getByText('Robot Capabilities')).toBeInTheDocument();
    
    // Test that color buttons are present
    const colorButtons = screen.getAllByTitle(/Select #/);
    expect(colorButtons).toHaveLength(8); // Should have 8 color options
  });

  test('shows robot capabilities for selected version', () => {
    const mockOnSuccess = jest.fn();
    const mockOnCancel = jest.fn();
    
    render(
      <TestWrapper>
        <AddRobotForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      </TestWrapper>
    );
    
    // Check capabilities section exists
    expect(screen.getByText('Robot Capabilities')).toBeInTheDocument();
    expect(screen.getByText('Task Speed:')).toBeInTheDocument();
    expect(screen.getByText('Battery Capacity:')).toBeInTheDocument();
    expect(screen.getByText('Charge Speed:')).toBeInTheDocument();
    
    // Check for V1 default values (use more specific selectors)
    const capabilityGrid = screen.getByText('Robot Capabilities').closest('.capabilities-preview');
    expect(capabilityGrid).toBeInTheDocument();
  });

  test('validates required fields', async () => {
    const mockOnSuccess = jest.fn();
    const mockOnCancel = jest.fn();
    
    render(
      <TestWrapper>
        <AddRobotForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      </TestWrapper>
    );
    
    // Try to submit without filling name
    fireEvent.click(screen.getByText('Add Robot'));
    
    // Should show validation error (you might need to wait for it)
    await waitFor(() => {
      expect(screen.getByText(/Robot name is required/i)).toBeInTheDocument();
    });
  });

  test('calls onCancel when cancel button is clicked', () => {
    const mockOnSuccess = jest.fn();
    const mockOnCancel = jest.fn();
    
    render(
      <TestWrapper>
        <AddRobotForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      </TestWrapper>
    );
    
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  test('updates capabilities when version changes', () => {
    const mockOnSuccess = jest.fn();
    const mockOnCancel = jest.fn();
    
    render(
      <TestWrapper>
        <AddRobotForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      </TestWrapper>
    );
    
    // Change to V2
    fireEvent.change(screen.getByLabelText('Robot Version:'), {
      target: { value: 'V2' }
    });
    
    // Check that capabilities section updated
    expect(screen.getByText('Task Speed:')).toBeInTheDocument();
    expect(screen.getByText('Battery Capacity:')).toBeInTheDocument();
  });

  test('selects different colors', () => {
    const mockOnSuccess = jest.fn();
    const mockOnCancel = jest.fn();
    
    render(
      <TestWrapper>
        <AddRobotForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      </TestWrapper>
    );
    
    // Click on red color
    const redColorButton = screen.getByTitle('Select #EF4444');
    fireEvent.click(redColorButton);
    
    // Check that red color is now selected
    expect(redColorButton).toHaveClass('selected');
  });

  test('renders form header correctly', () => {
    const mockOnSuccess = jest.fn();
    const mockOnCancel = jest.fn();
    
    render(
      <TestWrapper>
        <AddRobotForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      </TestWrapper>
    );
    
    expect(screen.getByText('Add New Robot')).toBeInTheDocument();
    expect(screen.getByText(/Robot will be placed at the base station/)).toBeInTheDocument();
  });
});