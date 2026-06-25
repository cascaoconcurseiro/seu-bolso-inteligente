import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/hooks/useFamily';
import { rpcWithRetry } from '@/utils/rpcWithRetry';
import { startOfMonth } from 'date-fns';

export interface FamilyMemberSummary {
  member_id: string;
  linked_user_id: string;
  member_name: string;
  balance: number;
  patrimony: number;
  income: number;
  expense: number;
}

export function useFamilyConsolidated(currentDate: Date = new Date()) {
  const { user } = useAuth();
  const { data: family } = useFamily();

  return useQuery({
    queryKey: ['family-consolidated', family?.id, startOfMonth(currentDate).toISOString()],
    queryFn: async (): Promise<FamilyMemberSummary[]> => {
      if (!user || !family?.id) return [];
      const monthStart = startOfMonth(currentDate).toISOString().slice(0, 10);
      const data = await rpcWithRetry('get_family_consolidated_summary', {
        p_family_id: family.id,
        p_month_start: monthStart,
      });
      return (data || []) as FamilyMemberSummary[];
    },
    enabled: !!user && !!family?.id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
