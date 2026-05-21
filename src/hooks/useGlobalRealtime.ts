import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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

          // Invalida as queries com base na tabela alterada para rebuscar os dados imediatamente
          // Isso garante que qualquer tela aberta (Viagens, Dashboard, etc) se atualize sem F5.
          switch (table) {
            case 'transactions':
            case 'transaction_splits':
              queryClient.invalidateQueries({ queryKey: ['transactions'] });
              queryClient.invalidateQueries({ queryKey: ['shared-finances'] });
              queryClient.invalidateQueries({ queryKey: ['trip-transactions'] });
              queryClient.invalidateQueries({ queryKey: ['trip-participant-balances'] });
              queryClient.invalidateQueries({ queryKey: ['trip-financial-summary'] });
              queryClient.invalidateQueries({ queryKey: ['budget-summary'] });
              break;
            case 'trips':
            case 'trip_members':
              queryClient.invalidateQueries({ queryKey: ['trips'] });
              queryClient.invalidateQueries({ queryKey: ['trip'] });
              queryClient.invalidateQueries({ queryKey: ['trip-participants'] });
              queryClient.invalidateQueries({ queryKey: ['trip-members'] });
              break;
            case 'accounts':
              queryClient.invalidateQueries({ queryKey: ['accounts'] });
              break;
            case 'categories':
              queryClient.invalidateQueries({ queryKey: ['categories'] });
              break;
            case 'family_members':
            case 'families':
              queryClient.invalidateQueries({ queryKey: ['family-members'] });
              queryClient.invalidateQueries({ queryKey: ['family'] });
              break;
            case 'budgets':
              queryClient.invalidateQueries({ queryKey: ['budgets'] });
              break;
            case 'goals':
              queryClient.invalidateQueries({ queryKey: ['goals'] });
              break;
            default:
              // Se for uma tabela não mapeada especificamente, podemos invalidar
              // ou apenas logar. Para o momento, vamos ignorar silenciosamente as demais
              // ou invalidar a root se quisermos ser agressivos, mas é melhor ser contido.
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
