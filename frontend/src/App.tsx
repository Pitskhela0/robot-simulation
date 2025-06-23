// src/App.tsx 
import React from 'react';
import { SimulationProvider } from './context/SimulationContext';
import Layout from './components/Layout/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import SetupWizard from './features/simulation-setup/SetupWizard';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <SimulationProvider>
        <Layout>
          <div className="app-container">
            <main className="app-main">
              <SetupWizard />
            </main>
          </div>
        </Layout>
      </SimulationProvider>
    </ErrorBoundary>
  );
}

export default App;