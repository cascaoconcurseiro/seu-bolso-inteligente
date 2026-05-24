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
  
  const transactionsRef = useRef(transactions);
  const categoriesRef = useRef(categories);

  useEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);

  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);
  
  const debounceRef = useRef<NodeJS.Timeout>();
  const lastPredictedDescRef = useRef<string>('');
  const lastHashRef = useRef<string>('');
  const categoriesHash = (categories || []).map(c => c.id).join(',');

  useEffect(() => {
    if (!enabled || description.trim().length < 2) {
      setSuggestion('');
      setPredictedCategoryId(null);
      setIsPredicting(false);
      lastPredictedDescRef.current = '';
      lastHashRef.current = '';
      return;
    }

    if (description.trim() === lastPredictedDescRef.current && categoriesHash === lastHashRef.current) {
      return; // Evitar re-pesquisar o que já foi pesquisado com as mesmas categorias
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
        const expenseTransactions = (transactionsRef.current || []).filter(t => t.type === 'EXPENSE' && t.description);
        const historyDescriptions = expenseTransactions.map(t => t.description);
        const formattedCategories = (categoriesRef.current || []).map(c => ({ id: c.id, name: c.name }));
        
        const result = await AIAdvisorService.predictAutocompleteAndCategory(
          description.trim(),
          historyDescriptions,
          formattedCategories
        );
        
        if (!isActive) return;

        lastPredictedDescRef.current = description.trim();
        lastHashRef.current = categoriesHash;

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
  }, [description, enabled, categoriesHash]);

  return { suggestion, predictedCategoryId, isPredicting };
}
