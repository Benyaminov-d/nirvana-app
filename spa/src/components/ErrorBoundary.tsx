import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean };

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch() {
    // Intentionally swallow rendering errors and fall back
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <div className="text-red-400 text-sm">Content failed to render.</div>;
    }
    return this.props.children;
  }
}


