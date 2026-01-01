import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CategoryPredictionService } from '@/services/categoryPredictionService';
import type { CategoryPrediction } from '@/types/categoryPrediction';
import { useDebounce } from '@/hooks/useDebounce';

/**
 * Hook para predição automática de categoria baseado na descrição
 */
export function useCategoryPrediction(
  description: string,
  type: 'expense' | 'income',
  enabled: boolean = true
) {
  const { user } = useAuth();
  const [prediction, setPrediction] = useState<CategoryPrediction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Debounce para não fazer requisição a cada tecla digitada
  const debouncedDescription = useDebounce(description, 500);
  
  useEffect(() => {
    // Resetar se não tiver descrição ou usuário
    if (!enabled || !user || !debouncedDescription || debouncedDescription.length < 3) {
      setPrediction(null);
      setIsLoading(false);
      return;
    }
    
    const predict = async () => {
      setIsLoading(true);
      try {
        const result = await CategoryPredictionService.predictCategory(
          debouncedDescription,
          user.id,
          type
        );
        setPrediction(result);
      } catch (error) {
        console.error('Erro ao predizer categoria:', error);
        setPrediction(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    predict();
  }, [debouncedDescription, user, type, enabled]);
  
  return { prediction, isLoading };
}
