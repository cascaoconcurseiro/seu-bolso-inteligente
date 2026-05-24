import { useState, useEffect, useRef } from 'react';
import { AIAdvisorService } from '@/services/aiAdvisorService';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { toast } from 'sonner';

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

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setIsPredicting(true);
      try {
        const expenseTransactions = (transactions || []).filter(t => t.type === 'EXPENSE' && t.description);
        
        // 1. BUSCA LOCAL INSTANTÂNEA (Muito mais rápido e à prova de falhas)
        const localMatch = expenseTransactions.find(t => 
          t.description.toLowerCase().startsWith(description.toLowerCase())
        );

        if (localMatch) {
          // Achou no histórico local! Responde na mesma hora sem chamar a internet
          setSuggestion(localMatch.description);
          setPredictedCategoryId(localMatch.category_id || null);
          setIsPredicting(false);
          return;
        }

        // 2. SE NÃO ACHOU LOCALMENTE, CHAMA A IA
        const historyDescriptions = expenseTransactions.map(t => t.description);
        const formattedCategories = (categories || []).map(c => ({ id: c.id, name: c.name }));
        
        const result = await AIAdvisorService.predictAutocompleteAndCategory(
          description,
          historyDescriptions,
          formattedCategories
        );
        
        if (result.suggestion) {
          setSuggestion(result.suggestion);
        } else {
          setSuggestion('');
        }
        
        if (result.categoryId) {
          setPredictedCategoryId(result.categoryId);
        }
      } catch (error: any) {
        toast.error(`Erro na IA: ${error.message}`);
        console.error('Erro na hook de previsão AI:', error);
      } finally {
        setIsPredicting(false);
      }
    }, 400); // Reduzido de 600ms para 400ms para ser mais responsivo

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [description, enabled, transactions, categories]);

  return { suggestion, predictedCategoryId, isPredicting };
}
