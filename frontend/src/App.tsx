// src/App.tsx
import React from 'react';
import { SimulationProvider } from './context/SimulationContext';
import SetupWizard from './features/simulation-setup/SetupWizard';
import './App.css';

function App() {
  return (
    <SimulationProvider>
      <div className="app-container">
        <header className="app-header">
          <h1>Robot Task Simulator</h1>
        </header>
        <main className="app-main">
          <SetupWizard />
        </main>
      </div>
    </SimulationProvider>
  );
}

export default App;