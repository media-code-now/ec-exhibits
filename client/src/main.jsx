import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      // Add error handling for queries
      onError: (error) => {
        // Suppress external extension errors
        if (
          error?.stack?.includes('solanaActionsContentScript') ||
          error?.stack?.includes('chrome-extension://') ||
          error?.stack?.includes('moz-extension://')
        ) {
          console.warn('[QueryClient] Suppressed external extension error');
          return;
        }
        console.error('[QueryClient] Query error:', error);
      },
    },
    mutations: {
      retry: 0,
      // Add error handling for mutations
      onError: (error) => {
        // Suppress external extension errors
        if (
          error?.stack?.includes('solanaActionsContentScript') ||
          error?.stack?.includes('chrome-extension://') ||
          error?.stack?.includes('moz-extension://')
        ) {
          console.warn('[QueryClient] Suppressed external extension error');
          return;
        }
        console.error('[QueryClient] Mutation error:', error);
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
