'use client';

import React from 'react';
import { ErrorState } from './Feedback';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Catches render-time crashes in a subtree so one broken section cannot blank
 * the whole page. Data-fetch failures are handled by <ErrorState /> instead —
 * this is the last line of defence.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private reset = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      this.props.fallback ?? (
        <ErrorState
          title="This section failed to render"
          message="An unexpected error occurred. Reloading usually fixes it."
          onRetry={this.reset}
        />
      )
    );
  }
}
