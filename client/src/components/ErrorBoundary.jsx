import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Check if error is from external browser extension
    const isExternalError = 
      error?.stack?.includes('solanaActionsContentScript') ||
      error?.stack?.includes('chrome-extension://') ||
      error?.stack?.includes('moz-extension://');

    if (isExternalError) {
      console.warn('[ErrorBoundary] Suppressed external extension error:', error.message);
      // Don't set error state for external errors, just log them
      this.setState({ hasError: false, error: null, errorInfo: null });
      return;
    }

    // Log the error for application errors
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI for application errors
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
          <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-lg">
            <h2 className="mb-3 text-xl font-bold text-rose-600">Something went wrong</h2>
            <p className="mb-4 text-sm text-slate-600">
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            {this.state.error && (
              <details className="mb-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                <summary className="cursor-pointer font-semibold">Error details</summary>
                <pre className="mt-2 whitespace-pre-wrap break-words">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
