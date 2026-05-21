import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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

          // O usuário solicitou que TODO o sistema seja em tempo real sem deixar nada de fora.
          // Iniciar invalidação global de TUDO que estiver na tela do usuário.
          // O React Query é inteligente o suficiente para recarregar apenas o que está visível.
          queryClient.invalidateQueries();
          
          // E também chamar a função massiva por garantia para áreas financeiras:
          invalidateAllFinancialData(queryClient);
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
