import { useState, useEffect, useRef } from 'react';
import { AIAdvisorService } from '@/services/aiAdvisorService';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';

export function useAIPrediction(description: string, enabled: boolean = true) {
  const [suggestion, setSuggestion] = useState<string>('');
  const [predictedCategoryId, setPredictedCategoryId] = useState<string | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  
  const { data: transactions } = useTransactions({ startDate: '2020-01-01', endDate: '2030-12-31' });
  const { data: categories } = useCategories();
  
  const debounceRef = useRef<NodeJS.Timeout>();
  
  useEffect(() => {
    if (!enabled || description.length < 2) {
      setSuggestion('');
      setPredictedCategoryId(null);
      setIsPredicting(false);
      return;
    }

    // Limpar o timeout anterior
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce de 600ms para evitar chamadas API a cada letra digitada
    debounceRef.current = setTimeout(async () => {
      setIsPredicting(true);
      try {
        const historyDescriptions = (transactions || [])
          .filter(t => t.type === 'EXPENSE' && t.description)
          .map(t => t.description);
          
        const formattedCategories = (categories || []).map(c => ({ id: c.id, name: c.name }));
        
        const result = await AIAdvisorService.predictAutocompleteAndCategory(
          description,
          historyDescriptions,
          formattedCategories
        );
        
        // Só aceita a sugestão se a palavra começar com o que o usuário digitou (ignora case)
        if (result.suggestion && result.suggestion.toLowerCase().startsWith(description.toLowerCase())) {
          setSuggestion(result.suggestion);
        } else {
          setSuggestion('');
        }
        
        if (result.categoryId) {
          setPredictedCategoryId(result.categoryId);
        }
      } catch (error) {
        console.error('Erro na hook de previsão AI:', error);
      } finally {
        setIsPredicting(false);
      }
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [description, enabled, transactions, categories]);

  return { suggestion, predictedCategoryId, isPredicting };
}
