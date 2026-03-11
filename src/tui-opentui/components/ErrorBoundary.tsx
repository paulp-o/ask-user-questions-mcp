import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error) => void;
}

/**
 * Error boundary for OpenTUI renderer errors.
 * On error, renders nothing (silent fail) — fallback handled at entry point level.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Always log to stderr so the error is visible even if rendering fails
    process.stderr.write(`\n[OpenTUI Error] ${error.message}\n${error.stack ?? ""}\n`);
    if (info?.componentStack) {
      process.stderr.write(`Component stack: ${info.componentStack}\n`);
    }
    this.props.onError?.(error);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      // Show error message instead of blank screen
      return null;
    }
    return this.props.children;
  }
}