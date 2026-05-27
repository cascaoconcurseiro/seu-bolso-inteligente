import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
    isSubmitting: boolean;
    isReported: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            isSubmitting: false,
            isReported: false,
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null,
            isSubmitting: false,
            isReported: false,
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

    handleReportError = async () => {
        this.setState({ isSubmitting: true });
        try {
            const { error, errorInfo } = this.state;
            const { error: rpcError } = await supabase.rpc('submit_error_report', {
                p_error_message: error?.message || 'Erro desconhecido',
                p_stack_trace: error?.stack || errorInfo?.componentStack || '',
                p_context: window.location.href
            });
            if (rpcError) throw rpcError;
            this.setState({ isReported: true });
        } catch (err) {
            console.error('Erro ao enviar relatório:', err);
        } finally {
            this.setState({ isSubmitting: false });
        }
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

                                <div className="flex gap-3 mt-4">
                                    <Button
                                        onClick={() => {
                                            this.setState({ hasError: false, error: null, errorInfo: null, isReported: false });
                                            window.location.reload();
                                        }}
                                        variant="outline"
                                        className="flex-1"
                                    >
                                        Recarregar página
                                    </Button>
                                    
                                    <Button 
                                        onClick={this.handleReportError} 
                                        disabled={this.state.isSubmitting || this.state.isReported}
                                        variant={this.state.isReported ? "secondary" : "default"}
                                        className="flex-1"
                                    >
                                        {this.state.isSubmitting ? (
                                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
                                        ) : this.state.isReported ? (
                                            <><CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" /> Relatório Enviado</>
                                        ) : (
                                            <><Send className="mr-2 h-4 w-4" /> Enviar Relatório ao Suporte</>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </AlertDescription>
                    </Alert>
                </div>
            );
        }

        return this.props.children;
    }
}
