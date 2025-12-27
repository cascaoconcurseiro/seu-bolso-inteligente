/**
 * HOOK: useSharedTransactionManager
 * Hook para usar o SharedTransactionManager
 */

import { useEffect, useState, useCallback } from 'react';
import { getSharedTransactionManager } from '@/services/SharedTransactionManager';
import { toast } from 'sonner';

export function useSharedTransactionManager() {
  const [isReady, setIsReady] = useState(false);
  const manager = getSharedTransactionManager();

  useEffect(() => {
    setIsReady(true);

    // Listener para transações criadas
    const handleTransactionCreated = (transaction: any) => {
      toast.success('Transação compartilhada criada');
    };

    // Listener para requests respondidos
    const handleRequestResponded = (data: { requestId: string; accept: boolean }) => {
      if (data.accept) {
        toast.success('Request aceito');
      } else {
        toast.info('Request rejeitado');
      }
    };

    manager.on('transaction:created', handleTransactionCreated);
    manager.on('request:responded', handleRequestResponded);

    return () => {
      manager.off('transaction:created', handleTransactionCreated);
      manager.off('request:responded', handleRequestResponded);
    };
  }, []);

  const createSharedTransaction = useCallback(
    async (data: any, payerId: string) => {
      try {
        return await manager.createSharedTransaction(data, payerId);
      } catch (error) {
        toast.error('Erro ao criar transação compartilhada');
        throw error;
      }
    },
    [manager]
  );

  const respondToRequest = useCallback(
    async (requestId: string, accept: boolean) => {
      try {
        await manager.respondToRequest(requestId, accept);
      } catch (error) {
        toast.error('Erro ao responder request');
        throw error;
      }
    },
    [manager]
  );

  return {
    isReady,
    createSharedTransaction,
    respondToRequest,
    manager,
  };
}
