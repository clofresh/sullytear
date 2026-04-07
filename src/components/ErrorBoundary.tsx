import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  /** Rendered when no error has occurred. */
  children: ReactNode;
  /** Rendered when an error has been caught. Defaults to nothing — useful
   *  for non-essential subtrees like the animated background, where the
   *  best degraded state is "the visual just doesn't appear". */
  fallback?: ReactNode;
  /** Optional error sink (e.g. for telemetry). */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
}

/**
 * Minimal React error boundary. Used to wrap non-essential subtrees so a
 * crashing dependency (e.g. a Three.js shader compile failure on an old
 * driver, or the lazy `AnimatedBackground` chunk failing to load) does
 * not take down the rest of the UI.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
    if (import.meta.env?.DEV) {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary] caught', error, info.componentStack);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}
