import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Top-level React error boundary preventing full-screen crashes and offering
 * an accessible recovery action.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // Error boundary isolates rendering errors without exposing internal traces to users
  }

  private handleReset = (): void => {
    this.setState({ hasError: false });
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <section className="card error-boundary-card" role="alert">
          <h2 className="card-title">
            <AlertTriangle size={20} aria-hidden="true" />
            Something went wrong displaying this section
          </h2>
          <p className="card-subtitle">
            Your data is safe. Try reloading this panel to continue viewing live air quality guidance.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={this.handleReset}
          >
            <RefreshCw size={15} aria-hidden="true" />
            Reload View
          </button>
        </section>
      );
    }

    return this.props.children;
  }
}
