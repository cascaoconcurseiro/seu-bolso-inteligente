import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('❌ [ErrorBoundary] Erro capturado:', error);
        console.error('❌ [ErrorBoundary] Stack:', errorInfo.componentStack);
        console.error('❌ [ErrorBoundary] Error name:', error.name);
        console.error('❌ [ErrorBoundary] Error message:', error.message);
        console.error('❌ [ErrorBoundary] Full error:', JSON.stringify(error, null, 2));

        this.setState({
            error,
            errorInfo,
        });
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="p-8">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Ops! Algo deu errado</AlertTitle>
                        <AlertDescription>
                            <div className="space-y-4">
                                <p className="font-medium">
                                    {this.state.error?.message || 'Erro desconhecido'}
                                </p>

                                <details className="text-xs">
                                    <summary className="cursor-pointer font-semibold mb-2">
                                        Detalhes técnicos (clique para expandir)
                                    </summary>
                                    <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96">
                                        {this.state.errorInfo?.componentStack}
                                    </pre>
                                    <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96 mt-2">
                                        {this.state.error?.stack}
                                    </pre>
                                </details>

                                <Button
                                    onClick={() => {
                                        this.setState({ hasError: false, error: null, errorInfo: null });
                                        window.location.reload();
                                    }}
                                    variant="outline"
                                >
                                    Recarregar página
                                </Button>
                            </div>
                        </AlertDescription>
                    </Alert>
                </div>
            );
        }

        return this.props.children;
    }
}
