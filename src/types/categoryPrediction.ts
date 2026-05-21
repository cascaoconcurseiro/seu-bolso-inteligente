/**
 * Interface para predição de categoria
 */
export interface CategoryPrediction {
  categoryId: string;
  categoryName: string;
  confidence: number; // 0.0 a 1.0
  reason: string;
}
