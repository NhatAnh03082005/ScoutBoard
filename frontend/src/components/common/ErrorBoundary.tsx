import React, { Component, type ReactNode } from 'react';

export interface ErrorBoundaryProps {
  children: ReactNode;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Page rendering error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="alert-banner alert-error"
          style={{
            maxWidth: '640px',
            margin: '48px auto',
            textAlign: 'center',
            padding: '32px 24px',
            borderRadius: '16px',
          }}
        >
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 700 }}>
            Unable to load view
          </h3>
          <p
            style={{
              margin: '0 0 20px 0',
              color: 'var(--scout-text-secondary)',
              fontSize: '14px',
              lineHeight: 1.5,
            }}
          >
            There was a problem loading this page module. Please check your network connection and reload.
          </p>
          <button
            type="button"
            className="scout-btn scout-btn-primary"
            onClick={() => window.location.reload()}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
