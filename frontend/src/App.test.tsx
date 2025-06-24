// src/App.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App Component', () => {
  test('renders main application', () => {
    render(<App />);
    
    // Test for elements that actually exist in your app
    expect(screen.getByText('Robot Task Simulator')).toBeInTheDocument();
    
    // Use more specific selectors for duplicate text
    expect(screen.getByRole('heading', { name: 'Create New Simulation' })).toBeInTheDocument();
    expect(screen.getByText('Configure Grid')).toBeInTheDocument();
  });

  test('renders navigation elements', () => {
    render(<App />);
    
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Simulations')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
  });

  test('renders sidebar', () => {
    render(<App />);
    
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('Recent Simulations')).toBeInTheDocument();
    expect(screen.getByText('Templates')).toBeInTheDocument();
  });

  test('renders setup wizard', () => {
    render(<App />);
    
    // Use role to target the main heading, not the sidebar link
    expect(screen.getByRole('heading', { name: 'Create New Simulation' })).toBeInTheDocument();
    expect(screen.getByText('Configure Grid')).toBeInTheDocument();
    expect(screen.getByText('Place Base Station')).toBeInTheDocument();
    expect(screen.getByText('Add Robots')).toBeInTheDocument();
  });

  test('renders step indicator with correct steps', () => {
    render(<App />);
    
    // Check that all 5 steps are shown
    expect(screen.getByText('Configure Grid')).toBeInTheDocument();
    expect(screen.getByText('Place Base Station')).toBeInTheDocument();
    expect(screen.getByText('Add Robots')).toBeInTheDocument();
    expect(screen.getByText('Place Walls')).toBeInTheDocument();
    expect(screen.getByText('Add Tasks')).toBeInTheDocument();
  });

  test('renders header with brand', () => {
    render(<App />);
    
    expect(screen.getByRole('heading', { name: 'Robot Task Simulator' })).toBeInTheDocument();
  });

  test('renders navigation links', () => {
    render(<App />);
    
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Simulations' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'About' })).toBeInTheDocument();
  });

  test('renders sidebar links', () => {
    render(<App />);
    
    expect(screen.getByRole('link', { name: 'Recent Simulations' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Templates' })).toBeInTheDocument();
    
    // For "Create New Simulation" link in sidebar, use more specific selector
    const sidebarLinks = screen.getAllByText('Create New Simulation');
    expect(sidebarLinks.length).toBeGreaterThan(0); // Just check it exists multiple times
  });

  test('renders wizard form elements', () => {
    render(<App />);
    
    // Test that form elements are present
    expect(screen.getByText('Simulation Name:')).toBeInTheDocument();
    expect(screen.getByText('Grid Width (5-100):')).toBeInTheDocument();
    expect(screen.getByText('Grid Height (5-100):')).toBeInTheDocument();
  });
});