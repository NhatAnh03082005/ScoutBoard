import React, { Component, type ReactNode } from 'react';
import { Notification } from './Notification';

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
        <Notification
          variant="error"
          message="Unable to load view. There was a problem loading this page module. Please check your network connection and reload."
          actions={(
            <button
              type="button"
              className="scout-btn scout-btn-primary"
              onClick={() => window.location.reload()}
            >
              Reload Application
            </button>
          )}
          style={{
            maxWidth: '640px',
            margin: '48px auto',
          }}
        />
      );
    }

    return this.props.children;
  }
}
