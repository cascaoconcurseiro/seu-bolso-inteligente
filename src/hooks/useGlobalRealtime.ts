import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { invalidateAllFinancialData } from '@/utils/queryInvalidation';
import { logger } from '@/utils/logger';

/**
 * Escuta eventos de tempo real (Realtime) do Supabase globalmente.
 * Invalida queries do React Query automaticamente quando há mudanças no banco.
 */
export function useGlobalRealtime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Só conectar se houver usuário logado
    if (!user?.id) return;

    logger.debug('Conectando ao Supabase Realtime...');

    const channel = supabase
      .channel('global-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload) => {
          const { table } = payload;
          logger.debug(`Evento Realtime recebido na tabela: ${table}`);

          if ((window as { _realtimeTimeout?: ReturnType<typeof setTimeout> })._realtimeTimeout) {
            clearTimeout((window as { _realtimeTimeout?: ReturnType<typeof setTimeout> })._realtimeTimeout);
          }

          (window as { _realtimeTimeout?: ReturnType<typeof setTimeout> })._realtimeTimeout = setTimeout(() => {
            logger.debug('Executando invalidação financeira após evento Realtime');
            invalidateAllFinancialData(queryClient);
          }, 100);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('Conectado ao Supabase Realtime com sucesso');
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('Erro no canal Supabase Realtime');
        }
      });

    return () => {
      logger.debug('Desconectando do Supabase Realtime...');
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);
}
