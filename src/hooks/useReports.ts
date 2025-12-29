import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMonth } from '@/contexts/MonthContext';
import { startOfMonth, endOfMonth, format } from 'date-fns';

// Interface para gastos por categoria
export interface CategoryExpense {
  category_id: string | null;
  category_name: string;
  category_icon: string | null;
  total_amount: number;
  transaction_count: number;
  percentage: number;
}

// Interface para evolução mensal
export interface MonthlyEvolution {
  month_year: string;
  month_start: string;
  income: number;
  expenses: number;
  savings: number;
}

// Interface para resumo financeiro mensal
export interface MonthlyFinancialSummary {
  total_income: number;
  total_expenses: number;
  net_savings: number;
  total_balance: number;
}

/**
 * Hook para buscar gastos por categoria (SINGLE SOURCE OF TRUTH)
 * Os valores são calculados diretamente das transações pelo banco de dados
 */
export function useExpensesByCategory() {
  const { user } = useAuth();
  const { currentDate } = useMonth();
  
  const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['expenses-by-category', user?.id, startDate, endDate],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase.rpc('get_expenses_by_category', {
        p_user_id: user.id,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) throw error;
      return data as CategoryExpense[];
    },
    enabled: !!user,
    staleTime: 30000,
  });
}

/**
 * Hook para buscar evolução mensal (SINGLE SOURCE OF TRUTH)
 * Os valores são calculados diretamente das transações pelo banco de dados
 */
export function useMonthlyEvolution(months: number = 12) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['monthly-evolution', user?.id, months],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase.rpc('get_monthly_evolution', {
        p_user_id: user.id,
        p_months: months,
      });

      if (error) throw error;
      return data as MonthlyEvolution[];
    },
    enabled: !!user,
    staleTime: 60000, // Cache por 1 minuto
  });
}

/**
 * Hook para buscar resumo financeiro mensal (SINGLE SOURCE OF TRUTH)
 * Os valores são calculados diretamente das transações pelo banco de dados
 */
export function useMonthlyFinancialSummary() {
  const { user } = useAuth();
  const { currentDate } = useMonth();
  
  const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['monthly-financial-summary', user?.id, startDate, endDate],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase.rpc('get_monthly_financial_summary', {
        p_user_id: user.id,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) throw error;
      return data?.[0] as MonthlyFinancialSummary | null;
    },
    enabled: !!user,
    staleTime: 30000,
  });
}

/**
 * Hook para calcular gasto em uma categoria específica (SINGLE SOURCE OF TRUTH)
 */
export function useCategorySpent(categoryId: string | null) {
  const { user } = useAuth();
  const { currentDate } = useMonth();
  
  const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['category-spent', user?.id, categoryId, startDate, endDate],
    queryFn: async () => {
      if (!user || !categoryId) return 0;

      const { data, error } = await supabase.rpc('calculate_budget_spent', {
        p_user_id: user.id,
        p_category_id: categoryId,
        p_start_date: startDate,
        p_end_date: endDate,
        p_currency: 'BRL',
      });

      if (error) throw error;
      return data as number;
    },
    enabled: !!user && !!categoryId,
    staleTime: 30000,
  });
}
