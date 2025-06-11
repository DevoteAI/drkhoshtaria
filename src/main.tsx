import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App.tsx';
import { LanguageProvider } from './contexts/LanguageContext';
import './index.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found');
}

// Conditional StrictMode - disabled in development for stagewise compatibility
const AppWithProviders = (
  <Router>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </Router>
);

createRoot(root).render(
  process.env.NODE_ENV === 'development' ? 
    AppWithProviders : 
    <React.StrictMode>{AppWithProviders}</React.StrictMode>
);
