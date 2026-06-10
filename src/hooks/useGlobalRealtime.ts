import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

import { invalidateAllFinancialData } from '@/utils/queryInvalidation';

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

          // O React Query é inteligente o suficiente para recarregar apenas o que está visível.
          // Iniciar invalidação global de TUDO que estiver na tela do usuário.
          // Porem para não sobrecarregar o celular, não usamos invalidateQueries global sem parâmetros.
          
          if ((window as any)._realtimeTimeout) {
            clearTimeout((window as any)._realtimeTimeout);
          }
          
          (window as any)._realtimeTimeout = setTimeout(() => {
            console.log('🔄 Executando invalidação financeira após evento Realtime');
            invalidateAllFinancialData(queryClient);
          }, 1500);
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
