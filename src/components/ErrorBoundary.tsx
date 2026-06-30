import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

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
        logger.error('❌ [ErrorBoundary] Erro capturado:', error);
        logger.error('❌ [ErrorBoundary] Stack:', errorInfo.componentStack);
        logger.error('❌ [ErrorBoundary] Error name:', error.name);
        logger.error('❌ [ErrorBoundary] Error message:', error.message);
        logger.error('❌ [ErrorBoundary] Full error:', JSON.stringify(error, null, 2));

        this.setState({
            error,
            errorInfo,
        });
    }

    handleReportError = async () => {
        this.setState({ isSubmitting: true });
        try {
            const { error, errorInfo } = this.state;
            const { error: dbError } = await supabase.from('error_logs').insert({
                error_type: error?.name || 'Error',
                message: error?.message || 'Erro desconhecido',
                stack: (error?.stack || errorInfo?.componentStack || '').slice(0, 2000),
                url: window.location.href,
                user_agent: navigator.userAgent.slice(0, 300),
                app_version: import.meta.env.VITE_APP_VERSION || 'unknown',
                extra: {
                    component_stack: errorInfo?.componentStack || null,
                    source: 'ErrorBoundary',
                },
                user_id: (await supabase.auth.getUser()).data.user?.id ?? null
            });
            if (dbError) throw dbError;
            this.setState({ isReported: true });
        } catch (err) {
            logger.error('Erro ao enviar relatório:', err);
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

                                <details className="text-sm">
                                    <summary className="cursor-pointer font-semibold mb-2">
                                        Detalhes técnicos (clique para expandir)
                                    </summary>
                                    <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-106">
                                        {this.state.errorInfo?.componentStack}
                                    </pre>
                                    <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-106 mt-2">
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
