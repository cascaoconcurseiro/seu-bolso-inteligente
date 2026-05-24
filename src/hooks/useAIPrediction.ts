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

    // Ao começar a digitar, já limpa a sugestão antiga para mostrar que está buscando nova
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
          description,
          historyDescriptions,
          formattedCategories
        );
        
        if (!isActive) return;

        if (result.suggestion) {
          setSuggestion(result.suggestion);
        } else {
          setSuggestion('');
        }
        
        if (result.categoryId) {
          setPredictedCategoryId(result.categoryId);
        }
      } catch (error: any) {
        if (!isActive) return;
        // Não mostrar toast aqui para evitar spam na tela do usuário, apenas logar no console
        console.error('Erro na hook de previsão AI:', error);
      } finally {
        if (isActive) {
          setIsPredicting(false);
        }
      }
    }, 400);

    return () => {
      isActive = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [description, enabled, transactions, categories]);

  return { suggestion, predictedCategoryId, isPredicting };
}
