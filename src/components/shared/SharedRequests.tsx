/**
 * SHARED REQUESTS
 * Componente para exibir e gerenciar requests de compartilhamento
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Check, X, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useSharedTransactionManager } from '@/hooks/useSharedTransactionManager';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SharedRequest {
  id: string;
  transaction_id: string;
  requester_id: string;
  invited_user_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  assigned_amount: number;
  expires_at: string;
  created_at: string;
  requester?: {
    full_name: string;
  };
  transaction?: {
    description: string;
    amount: number;
    date: string;
  };
}

export function SharedRequests() {
  const [requests, setRequests] = useState<SharedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { respondToRequest } = useSharedTransactionManager();

  useEffect(() => {
    fetchRequests();

    // Realtime subscription
    const subscription = supabase
      .channel('shared_requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shared_transaction_requests',
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('shared_transaction_requests')
        .select(`
          *,
          requester:profiles!requester_id(full_name),
          transaction:transactions(description, amount, date)
        `)
        .eq('invited_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRequests(data || []);
    } catch (error) {
      console.error('Erro ao buscar requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (requestId: string, accept: boolean) => {
    setProcessingId(requestId);
    try {
      await respondToRequest(requestId, accept);
      await fetchRequests();
    } catch (error) {
      console.error('Erro ao responder request:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Nenhum request pendente</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <div
          key={request.id}
          className="p-4 rounded-xl border border-border hover:border-foreground/20 transition-all"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold">
                  {request.requester?.full_name || 'Usuário'}
                </p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                  Pendente
                </span>
              </div>
              
              <p className="text-sm text-muted-foreground mb-2">
                {request.transaction?.description || 'Transação compartilhada'}
              </p>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>
                  Sua parte: {formatCurrency(request.assigned_amount)}
                </span>
                <span>•</span>
                <span>
                  {request.transaction?.date &&
                    format(new Date(request.transaction.date), 'dd MMM yyyy', {
                      locale: ptBR,
                    })}
                </span>
              </div>

              {request.expires_at && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  Expira em{' '}
                  {format(new Date(request.expires_at), 'dd/MM/yyyy HH:mm', {
                    locale: ptBR,
                  })}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRespond(request.id, false)}
                disabled={processingId === request.id}
                className="text-destructive hover:text-destructive"
              >
                {processingId === request.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                onClick={() => handleRespond(request.id, true)}
                disabled={processingId === request.id}
                className="bg-positive hover:bg-positive/90"
              >
                {processingId === request.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
