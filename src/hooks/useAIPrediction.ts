import { useState, useEffect, useRef } from 'react';
import { AIAdvisorService } from '@/services/aiAdvisorService';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';

export function useAIPrediction(description: string, enabled: boolean = true) {
  const [suggestion, setSuggestion] = useState<string>('');
  const [predictedCategoryId, setPredictedCategoryId] = useState<string | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  
  // Memoize parameters or avoid unnecessary re-fetches
  const { data: transactions } = useTransactions({ startDate: '2023-01-01', endDate: '2026-12-31' });
  const { data: categories } = useCategories();
  
  const debounceRef = useRef<NodeJS.Timeout>();
  const lastPredictedDescRef = useRef<string>('');

  useEffect(() => {
    if (!enabled || description.trim().length < 2) {
      setSuggestion('');
      setPredictedCategoryId(null);
      setIsPredicting(false);
      lastPredictedDescRef.current = '';
      return;
    }

    if (description.trim() === lastPredictedDescRef.current) {
      return; // Evitar re-pesquisar o que já foi pesquisado
    }

    // Ao começar a digitar, limpa sugestão antiga mas MANTÉM a categoria predita anterior 
    // até que a nova venha, para não ficar piscando a interface ou sobrescrevendo o usuário sem querer.
    setSuggestion('');
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    let isActive = true;

    debounceRef.current = setTimeout(async () => {
      if (!isActive) return;
      setIsPredicting(true);
      
      try {
        const expenseTransactions = (transactions || []).filter(t => t.type === 'EXPENSE' && t.description);
        const historyDescriptions = expenseTransactions.map(t => t.description);
        const formattedCategories = (categories || []).map(c => ({ id: c.id, name: c.name }));
        
        const result = await AIAdvisorService.predictAutocompleteAndCategory(
          description.trim(),
          historyDescriptions,
          formattedCategories
        );
        
        if (!isActive) return;

        lastPredictedDescRef.current = description.trim();

        if (result.suggestion) {
          setSuggestion(result.suggestion);
        } else {
          setSuggestion('');
        }
        
        // Sempre atualiza o predictedCategoryId, mesmo que seja null, para refletir o último texto
        setPredictedCategoryId(result.categoryId || null);
        
      } catch (error: any) {
        if (!isActive) return;
        console.error('Erro na hook de previsão AI:', error);
        setPredictedCategoryId(null);
        setSuggestion('');
      } finally {
        if (isActive) {
          setIsPredicting(false);
        }
      }
    }, 600); // Aumentei o debounce para 600ms para evitar rate limit de APIs e múltiplas chamadas rápidas

    return () => {
      isActive = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [description, enabled, transactions, categories]);

  return { suggestion, predictedCategoryId, isPredicting };
}
