import React from 'react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    /** Shown in the fallback UI to identify which section failed */
    section?: string;
    /** Optional custom fallback. If not provided, uses default error card */
    fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * Generic React Error Boundary.
 * Catches render/lifecycle errors in child tree and shows a recovery UI.
 *
 * Usage:
 *   <ErrorBoundary section="Dashboard">
 *     <Dashboard />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error(`[ErrorBoundary${this.props.section ? `: ${this.props.section}` : ''}]`, error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    private handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex items-center justify-center p-8 min-h-[200px]">
                    <div className="bg-sub-alt rounded-xl p-6 max-w-md w-full text-center space-y-4">
                        <div className="text-error text-2xl">!</div>
                        <h3 className="text-text-primary font-lexend font-medium">
                            Something went wrong
                            {this.props.section && (
                                <span className="text-sub text-sm font-mono block mt-1">
                                    in {this.props.section}
                                </span>
                            )}
                        </h3>
                        <p className="text-sub text-sm font-mono">
                            {this.state.error?.message || 'An unexpected error occurred'}
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleReset}
                                className="px-4 py-2 bg-main/10 text-main rounded-lg font-mono text-sm hover:bg-main/20 transition-colors"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={this.handleReload}
                                className="px-4 py-2 bg-sub-alt text-sub rounded-lg font-mono text-sm hover:text-text-primary transition-colors"
                            >
                                Reload Page
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
