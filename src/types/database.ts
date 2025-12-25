// Tipos do banco de dados migrados do PE

export interface Budget {
  id: string;
  user_id: string;
  category: string;
  amount: number;
  period: 'MONTHLY' | 'YEARLY';
  start_date: string;
  end_date?: string;
  alert_threshold?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted: boolean;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  target_amount: number;
  current_amount: number;
  target_date?: string;
  category?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  linked_account_id?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  deleted: boolean;
}

export interface Asset {
  id: string;
  user_id: string;
  name: string;
  type: 'STOCK' | 'BOND' | 'FUND' | 'CRYPTO' | 'REAL_ESTATE' | 'OTHER';
  ticker?: string;
  quantity?: number;
  purchase_price?: number;
  current_price?: number;
  purchase_date?: string;
  account_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  deleted: boolean;
}

export interface FinancialSnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  monthly_income: number;
  monthly_expenses: number;
  savings_rate?: number;
  metadata: Record<string, any>;
  created_at: string;
}

export interface TransactionAudit {
  id: string;
  transaction_id?: string;
  user_id?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// Tipos de retorno das funções RPC

export interface BudgetProgress {
  budget_id: string;
  budgeted_amount: number;
  spent_amount: number;
  remaining_amount: number;
  percentage_used: number;
}

export interface GoalProgress {
  goal_id: string;
  target_amount: number;
  current_amount: number;
  remaining_amount: number;
  percentage_complete: number;
  days_remaining?: number;
}

export interface AssetPerformance {
  asset_id: string;
  invested_amount: number;
  current_value: number;
  profit_loss: number;
  profit_loss_percentage: number;
}

export interface FinancialIntegrityIssue {
  issue_type: string;
  issue_description: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  affected_count: number;
}
