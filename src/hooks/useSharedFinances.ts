import { moneyUtils } from "@/utils/money";
import { useMemo, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFamilyMembers, useFamily } from './useFamily';
import { useUserProfile } from './useUserProfile';
import { toast } from 'sonner';
import { Database } from '@/types/database';
import { logger } from '@/utils/logger';
import { rpcWithRetry } from '@/utils/rpcWithRetry';
import { SafeFinancialCalculator } from '@/services/SafeFinancialCalculator';
import { 
  generateInvoices, 
  InvoiceItem 
} from '@/utils/sharedFinanceCalculations';

type DBTransaction = Database['public']['Tables']['transactions']['Row'] & {
  category?: { id: string; name: string; icon: string | null; color: string | null } | null;
  transaction_splits?: DBSplit[];
  payer?: { id: string; name: string; user_id: string | null; linked_user_id: string | null } | null;
  currency?: string; 
  competence_date?: string | null; 
};

type DBSplit = Database['public']['Tables']['transaction_splits']['Row'] & {
  settled_by_debtor: boolean; 
  settled_by_creditor: boolean; 
};
type DBAccount = Pick<Database['public']['Tables']['accounts']['Row'], 'id' | 'type' | 'closing_day' | 'due_day' | 'user_id' | 'name'>;

interface UseSharedFinancesProps {
  currentDate?: Date;
  activeTab: 'REGULAR' | 'TRAVEL' | 'HISTORY';
}

export const useSharedFinances = ({ currentDate = new Date(), activeTab }: UseSharedFinancesProps) => {
  const { user } = useAuth();
  const { data: members = [] } = useFamilyMembers();
  const { data: family } = useFamily();
  const { data: profile } = useUserProfile();
  const queryClient = useQueryClient();

  // Invalida a query consolidada (única fonte de dados)
  const refetchAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['shared-transactions-consolidated'] }),
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['accounts'] }),
    ]);
  };

  // NOVO: Fetch de saldos consolidados via RPC nativo (Performance DBA)
  const { data: sharedBalances, isLoading: isBalancesLoading } = useQuery({
    queryKey: ['shared-balances', user?.id],
    queryFn: async () => {
      if (!user) return null;
      try {
        const data = await rpcWithRetry('get_current_shared_debts', {
          p_user_id: user.id
        });
        return data as Array<{
          member_id: string;
          currency: string;
          total_credits: number;
          total_debits: number;
          net_balance: number;
        }>;
      } catch (error) {
        logger.error('Erro ao buscar saldos via RPC', error);
        return null;
      }
    },
    enabled: !!user,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // NOVO: Fetch consolidado via RPC para popular a lista de transações
  const { data: sharedData, isLoading, refetch } = useQuery({
    queryKey: ['shared-transactions-consolidated', user?.id],
    queryFn: async () => {
      if (!user) return null;
      try {
        const data = await rpcWithRetry('get_shared_invoice_data', {
          p_user_id: user.id
        });
        return data;
      } catch (error) {
        logger.error('Erro ao buscar dados consolidados de finanças compartilhadas', error);
        throw error;
      }
    },
    enabled: !!user,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // REALTIME: Escutar mudanças em transaction_splits para atualizar a UI instantaneamente
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('shared_splits_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transaction_splits'
        },
        () => {
          logger.info('Realtime: Mudança detectada em splits, atualizando...');
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetch]);

  // Mapear dados do RPC para os estados existentes
  const transactionsWithSplits = useMemo(() => ({
    transactions: sharedData?.transactions || [],
    accounts: sharedData?.accounts || []
  }), [sharedData]);

  // Transações pagas por outros vêm da RPC consolidada (sem consulta extra)
  const paidByOthersTransactions = useMemo(() => {
    const txList: DBTransaction[] = sharedData?.transactions || [];
    return txList.filter(
      (t: DBTransaction) => t.user_id === user?.id && t.payer_id != null && t.source_transaction_id == null
    );
  }, [sharedData, user?.id]);

  const invoices = useMemo(() => {
    const transactions = (transactionsWithSplits as { transactions: DBTransaction[] }).transactions || [];
    const accounts = (transactionsWithSplits as { accounts: DBAccount[] }).accounts || [];
    
    return generateInvoices(
      transactions,
      accounts,
      paidByOthersTransactions,
      members,
      user?.id,
      profile,
      family
    );
  }, [transactionsWithSplits, paidByOthersTransactions, members, user?.id, profile, family]);

  const getFilteredInvoice = (memberId: string): InvoiceItem[] => {
    const allItems = invoices[memberId] || [];
    
    // Buscar configuração de escopo do membro
    const member = members.find(m => m.id === memberId);
    
    // Aplicar filtro de escopo
    let scopeFilteredItems = allItems;
    if (member && member.sharing_scope !== 'all') {
      scopeFilteredItems = allItems.filter(item => {
        switch (member.sharing_scope) {
          case 'trips_only':
            // Apenas transações de viagens
            return !!item.tripId;
          
          case 'date_range': {
            // Apenas transações no período
            if (!member.scope_start_date && !member.scope_end_date) return true;
            const itemDate = new Date(item.date);
            const startDate = member.scope_start_date ? new Date(member.scope_start_date) : null;
            const endDate = member.scope_end_date ? new Date(member.scope_end_date) : null;
            
            if (startDate && itemDate < startDate) return false;
            if (endDate && itemDate > endDate) return false;
            return true;
          }
          
          case 'specific_trip':
            // Apenas transações de uma viagem específica
            return item.tripId === member.scope_trip_id;
          
          default:
            return true;
        }
      });
    }

    if (activeTab === 'TRAVEL') {
      // TRAVEL: Mostrar TODOS os itens de viagens (sem filtro de mês)
      // As viagens são agrupadas por trip, então não faz sentido filtrar por mês
      const filtered = scopeFilteredItems
        .filter((i) => {
          return !!i.tripId; // Mostrar TODOS os itens de viagem
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      
      return filtered;
    } else if (activeTab === 'HISTORY') {
      // HISTORY: Mostrar apenas itens TOTALMENTE ACERTADOS filtrados pelo mês atual
      return scopeFilteredItems
        .filter(i => {
          // NOVO: Vai para o histórico se estiver TOTALMENTE acertado
          // OU se EU já fiz minha parte (isPaid reflete a minha ação baseada no meu papel)
          if (!i.isSettled && !i.isPaid) return false;

          // Filtrar pelo mês selecionado
          const [year, month] = i.date.split('-').map(Number);
          const itemMonth = month - 1;
          const itemYear = year;
          
          const currentMonth = currentDate.getMonth();
          const currentYear = currentDate.getFullYear();
          
          return itemMonth === currentMonth && itemYear === currentYear;
        })
        .sort((a, b) => b.date.localeCompare(a.date));
    } else {
      // REGULAR: Mostrar apenas itens NÃO TOTALMENTE ACERTADOS não relacionados a viagens, filtrados pelo mês atual
      const filtered = scopeFilteredItems
        .filter(i => {
          // Não mostrar itens de viagens
          if (i.tripId) return false;
          
          // Não mostrar itens totalmente acertados (devem ir para o histórico)
          if (i.isSettled) return false;

          // NOVO: Não mostrar se EU já fiz minha parte (já foi para o histórico/aguardando outro)
          if (i.isPaid) return false;
          
          // CORREÇÃO CRÍTICA: Usar competence_date ao invés de date para filtrar parcelas
          // Isso garante que cada parcela apareça apenas no seu mês de competência
          const dateToUse = i.date; // Usar date pois é o que vem no InvoiceItem
          
          // Parse date as YYYY-MM-DD to avoid timezone issues
          const [year, month] = dateToUse.split('-').map(Number);
          
          const currentMonth = currentDate.getMonth();
          const currentYear = currentDate.getFullYear();

          // Lógica de isolamento de competência de parcelas
          // Parcelas são exibidas estritamente no seu mês de vencimento correspondente, sem acúmulo
          const isInstallment = i.totalInstallments && i.totalInstallments > 1;
          if (isInstallment) {
            return (month - 1) === currentMonth && year === currentYear;
          }
          
          // Despesas fixas/recorrentes/comuns também devem ser exibidas ESTRITAMENTE no seu mês
          return (month - 1) === currentMonth && year === currentYear;
        })
        .sort((a, b) => b.date.localeCompare(a.date));
      
      
      return filtered;
    }
  };

  const getTotals = (items: InvoiceItem[]) => {
    const totalsByCurrency: Record<string, { credits: number; debits: number; net: number }> = {};

    items.forEach(i => {
      const curr = i.currency || 'BRL';
      if (!totalsByCurrency[curr]) {
        totalsByCurrency[curr] = { credits: 0, debits: 0, net: 0 };
      }

      if (!i.isPaid) {
        if (i.type === 'CREDIT') {
          totalsByCurrency[curr].credits = SafeFinancialCalculator.add(totalsByCurrency[curr].credits, i.amount);
        } else {
          totalsByCurrency[curr].debits = SafeFinancialCalculator.add(totalsByCurrency[curr].debits, i.amount);
        }
      }
    });

    Object.keys(totalsByCurrency).forEach(curr => {
      totalsByCurrency[curr].net = SafeFinancialCalculator.subtract(totalsByCurrency[curr].credits, totalsByCurrency[curr].debits);
    });

    return totalsByCurrency;
  };

  // Calculate global summary - SEPARADO POR MOEDA (NUNCA SOMAR MOEDAS DIFERENTES!)
  // Utilizando a NOVA RPC do Banco de Dados para aliviar o cálculo do Frontend
  const getSummary = () => {
    const summaryByCurrency: Record<string, { totalCredits: number; totalDebits: number; net: number }> = {};
    
    // Se a RPC retornou com sucesso os saldos mastigados do DB, usamos isso!
    if (sharedBalances && sharedBalances.length > 0) {
      sharedBalances.forEach(balance => {
        const curr = balance.currency || 'BRL';
        if (!summaryByCurrency[curr]) {
          summaryByCurrency[curr] = { totalCredits: 0, totalDebits: 0, net: 0 };
        }
        
        summaryByCurrency[curr].totalCredits = SafeFinancialCalculator.add(summaryByCurrency[curr].totalCredits, Number(balance.total_credits));
        summaryByCurrency[curr].totalDebits = SafeFinancialCalculator.add(summaryByCurrency[curr].totalDebits, Number(balance.total_debits));
        summaryByCurrency[curr].net = SafeFinancialCalculator.add(summaryByCurrency[curr].net, Number(balance.net_balance));
      });
      
      return {
        byCurrency: summaryByCurrency,
        hasMultipleCurrencies: Object.keys(summaryByCurrency).length > 1,
      };
    }
    
    // Fallback de segurança: calcula via Frontend caso a RPC falhe ou ainda não tenha sido injetada
    Object.values(invoices).forEach(items => {
      items.forEach(item => {
        const curr = item.currency || 'BRL';
        if (!summaryByCurrency[curr]) {
          summaryByCurrency[curr] = { totalCredits: 0, totalDebits: 0, net: 0 };
        }
        
        if (!item.isPaid) {
          if (item.type === 'CREDIT') {
            summaryByCurrency[curr].totalCredits = SafeFinancialCalculator.add(summaryByCurrency[curr].totalCredits, item.amount);
          } else {
            summaryByCurrency[curr].totalDebits = SafeFinancialCalculator.add(summaryByCurrency[curr].totalDebits, item.amount);
          }
        }
      });
    });
    
    // Calcular net para cada moeda individualmente
    Object.keys(summaryByCurrency).forEach(curr => {
      summaryByCurrency[curr].net = SafeFinancialCalculator.subtract(
        summaryByCurrency[curr].totalCredits,
        summaryByCurrency[curr].totalDebits
      );
    });

    return {
      byCurrency: summaryByCurrency,
      hasMultipleCurrencies: Object.keys(summaryByCurrency).length > 1,
    };
  };

  return { 
    invoices, 
    getFilteredInvoice, 
    getTotals, 
    getSummary,
    members, 
    transactions: transactionsWithSplits?.transactions || [],
    isLoading,
    refetch: refetchAll // Usar refetchAll para invalidar todas as queries
  };
};


// Hook para confirmar ressarcimento de um split usando RPC seguro
export function useSettleSplit() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ splitId, amount, accountId }: { splitId: string; amount: number; accountId: string }) => {
      if (!user) throw new Error("Usuário não autenticado");
      
      const { data, error } = await supabase.rpc('settle_split', {
        p_split_id: splitId,
        p_amount: amount,
        p_account_id: accountId,
        p_user_id: user.id
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-transactions-consolidated'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Ressarcimento processado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao processar ressarcimento: ' + error.message);
    },
  });
}

// Hook para solicitar o acerto de múltiplos splits usando RPC (Passo 1)
export function useRequestSettlement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ splitIds, accountId, isPayment }: { splitIds: string[]; accountId: string; isPayment: boolean }) => {
      if (!user) throw new Error("Usuário não autenticado");
      
      const { data, error } = await supabase.rpc('request_settlement', {
        p_split_ids: splitIds,
        p_account_id: accountId,
        p_user_id: user.id,
        p_is_payment: isPayment
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shared-transactions-consolidated'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success(`${(data as any)?.processed_count || 0} acerto(s) informados. Aguardando confirmação!`);
    },
    onError: (error) => {
      toast.error('Erro ao processar pagamentos: ' + error.message);
    },
  });
}

// Hook para confirmar o recebimento de múltiplos splits usando RPC (Passo 2)
export function useConfirmSettlement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ splitIds, accountId, isReceiving }: { splitIds: string[]; accountId: string; isReceiving: boolean }) => {
      if (!user) throw new Error("Usuário não autenticado");
      
      const { data, error } = await supabase.rpc('confirm_settlement', {
        p_split_ids: splitIds,
        p_account_id: accountId,
        p_user_id: user.id,
        p_is_receiving: isReceiving
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shared-transactions-consolidated'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success(`${(data as any)?.confirmed_count || 0} recebimento(s) confirmados e liquidados!`);
    },
    onError: (error) => {
      toast.error('Erro ao confirmar recebimentos: ' + error.message);
    },
  });
}

// Hook para desfazer ressarcimento usando RPC seguro (undo_settlement)
export function useUnsettleSplit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (splitId: string) => {
      const { data, error } = await supabase.rpc('undo_settlement', {
        p_split_id: splitId
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-transactions-consolidated'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Ressarcimento desfeito e saldo restaurado!');
    },
    onError: (error) => {
      toast.error('Erro ao desfazer ressarcimento: ' + error.message);
    },
  });
}
