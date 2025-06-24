// src/__tests__/components/BaseStationStep.test.tsx 
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SimulationProvider } from '../../context/SimulationContext';
import BaseStationStep from '../../features/simulation-setup/BaseStationStep';

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SimulationProvider>
    {children}
  </SimulationProvider>
);

describe('BaseStationStep Component', () => {
  test('renders base station placement interface', () => {
    render(
      <TestWrapper>
        <BaseStationStep />
      </TestWrapper>
    );
    
    expect(screen.getByRole('heading', { name: 'Place Base Station' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Place Base Station' })).toBeInTheDocument();
  });

  test('enables placement mode when button is clicked', () => {
    render(
      <TestWrapper>
        <BaseStationStep />
      </TestWrapper>
    );
    
    fireEvent.click(screen.getByRole('button', { name: 'Place Base Station' }));
    expect(screen.getByText('Click on grid to place base station')).toBeInTheDocument();
  });

  test('shows placement instruction when in placement mode', () => {
    render(
      <TestWrapper>
        <BaseStationStep />
      </TestWrapper>
    );
    
    fireEvent.click(screen.getByRole('button', { name: 'Place Base Station' }));
    expect(screen.getByText('🎯 Click on any cell in the grid to place the base station')).toBeInTheDocument();
  });
});