/**
 * Tipos para o sistema de câmbio de viagens
 */

export interface ExchangePurchase {
  id: string;
  trip_id: string;
  user_id: string;
  foreign_amount: number;
  exchange_rate: number;
  cet_percentage: number;
  effective_rate: number;
  local_amount: number;
  description: string | null;
  purchase_date: string;
  created_at: string;
  updated_at: string;
}

export interface ExchangePurchaseInput {
  foreign_amount: number;
  exchange_rate: number;
  cet_percentage: number;
  description?: string;
  purchase_date: string;
}

export interface ExchangeSummary {
  totalForeignPurchased: number;
  totalLocalSpent: number;
  weightedAverageRate: number;
  purchaseCount: number;
}

export interface ExchangePurchaseFormData {
  foreignAmount: string;
  exchangeRate: string;
  cetPercentage: string;
  description: string;
  purchaseDate: string;
}
