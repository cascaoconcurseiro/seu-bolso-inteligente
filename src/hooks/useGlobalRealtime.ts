import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

import { 
  invalidateFinancialQueries, 
  invalidateSharedQueries, 
  invalidateTripQueries, 
  invalidateFamilyQueries, 
  invalidateCategoryQueries,
  invalidateBudgetQueries
} from '@/utils/queryInvalidation';

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

    console.log('🔌 Conectando ao Supabase Realtime...');

    // Cria um canal genérico escutando o schema 'public'
    const channel = supabase
      .channel('global-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload) => {
          const { table } = payload;
          console.log(`⚡ Evento Realtime recebido na tabela: ${table}`);

          // Invalida as queries de forma inteligente agrupando por domínio
          switch (table) {
            case 'transactions':
            case 'transaction_splits':
              invalidateFinancialQueries(queryClient);
              invalidateSharedQueries(queryClient);
              invalidateTripQueries(queryClient);
              break;
            case 'trips':
            case 'trip_members':
              invalidateTripQueries(queryClient);
              break;
            case 'accounts':
              invalidateFinancialQueries(queryClient);
              break;
            case 'categories':
              invalidateCategoryQueries(queryClient);
              break;
            case 'family_members':
            case 'families':
              invalidateFamilyQueries(queryClient);
              break;
            case 'budgets':
              invalidateBudgetQueries(queryClient);
              break;
            case 'goals':
              queryClient.invalidateQueries({ queryKey: ['goals'] });
              break;
            default:
              break;
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Conectado ao Supabase Realtime com sucesso!');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Erro no canal Supabase Realtime');
        }
      });

    return () => {
      console.log('🔌 Desconectando do Supabase Realtime...');
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);
}
