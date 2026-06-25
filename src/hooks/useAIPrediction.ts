import { useState, useEffect, useRef } from 'react';
import { AIAdvisorService } from '@/services/aiAdvisorService';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useUserProfile } from '@/hooks/useUserProfile';
import { logger } from '@/utils/logger';

export function useAIPrediction(description: string, type: 'expense' | 'income' = 'expense', enabled: boolean = true) {
  const [suggestion, setSuggestion] = useState<string>('');
  const [predictedCategoryId, setPredictedCategoryId] = useState<string | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  
  // 🔥 OTIMIZAÇÃO CRÍTICA: Busca apenas as 50 transações mais recentes (usadas apenas p/ extrair últimas descrições)
  // Isso evita travar o sistema com um fetch massivo na primeira renderização ou em refetches pós-lançamento.
  const { data: transactions } = useTransactions({ limit: 100 });
  const { data: categories } = useCategories();
  const { data: profile } = useUserProfile();
  const useSubcategories = profile?.use_subcategories ?? false;
  
  const transactionsRef = useRef(transactions);
  const categoriesRef = useRef(categories);
  const debounceRef = useRef<NodeJS.Timeout>();
  
  // Controle absoluto de concorrência por ID incremental
  const requestCounterRef = useRef<number>(0);
  const lastPredictedDescRef = useRef<string>('');
  const lastHashRef = useRef<string>('');

  useEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);

  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);
  
  const categoriesHash = (categories || []).map(c => c.id).join(',');

  useEffect(() => {
    // Se a descrição for menor que 2 caracteres, limpa e retorna
    if (!enabled || description.trim().length < 2) {
      setSuggestion('');
      setPredictedCategoryId(null);
      setIsPredicting(false);
      lastPredictedDescRef.current = '';
      lastHashRef.current = '';
      // Cancela timers ativos
      if (debounceRef.current) clearTimeout(debounceRef.current);
      // Incrementa para anular qualquer requisição assíncrona anterior que ainda esteja em trânsito
      requestCounterRef.current++;
      return;
    }

    // Evita chamadas repetidas desnecessárias com o mesmo texto
    if (description.trim() === lastPredictedDescRef.current && categoriesHash === lastHashRef.current) {
      return;
    }

    // Limpa sugestão imediata da tela para resposta responsiva ao digitar, mas mantém a categoria
    setSuggestion('');
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Dispara o debounce
    debounceRef.current = setTimeout(async () => {
      // 1. Incrementa o contador de requisição para esta chamada
      const currentRequestId = ++requestCounterRef.current;
      setIsPredicting(true);
      
      try {
        const targetType = type === 'expense' ? 'EXPENSE' : 'INCOME';
        const allCatsForHistory = categoriesRef.current || [];
        const historyTransactions = (transactionsRef.current || []).filter(t =>
          t.type === targetType &&
          t.description &&
          typeof t.description === 'string' &&
          t.description.length < 150 &&
          !t.description.startsWith('data:') &&
          !t.description.includes(';base64')
        );

        // Pares descrição→categoria para o modelo aprender com classificações passadas do usuário
        const seenDescriptions = new Set<string>();
        const historyPairs: { description: string; categoryName: string }[] = [];
        for (const t of historyTransactions) {
          const desc = t.description.substring(0, 50).trim();
          if (seenDescriptions.has(desc.toLowerCase()) || desc.length < 2) continue;
          seenDescriptions.add(desc.toLowerCase());
          const cat = allCatsForHistory.find(c => c.id === t.category_id);
          if (cat) {
            const parentCat = cat.parent_category_id ? allCatsForHistory.find(c => c.id === cat.parent_category_id) : null;
            historyPairs.push({ description: desc, categoryName: parentCat?.name ?? cat.name });
          }
          if (historyPairs.length >= 30) break;
        }

        const historyDescriptions = historyPairs.map(p => p.description).slice(0, 20);
        
        // Filtrar estritamente as categorias legítimas baseadas no tipo de transação
        const ALLOWED_EXPENSE_PARENTS = [
          "Supermercado",
          "Restaurantes e Lanches",
          "Delivery",
          "Gasolina",
          "Transporte",
          "Moradia",
          "Contas e Assinaturas",
          "Saúde",
          "Educação",
          "Compras",
          "Lazer",
          "Viagens",
          "Família e Pets",
          "Financeiro",
          "Impostos",
          "Outros"
        ];

        const ALLOWED_INCOME_PARENTS = [
          "Salário",
          "Freelance",
          "Vendas",
          "Investimentos",
          "Reembolso",
          "Cashback",
          "Benefícios",
          "Presente",
          "Transferência Recebida",
          "Outros"
        ];

        const allCats = categoriesRef.current || [];
        const filteredCats = allCats.filter(c => {
          if (c.type !== type) return false;
          const allowedParents = type === 'expense' ? ALLOWED_EXPENSE_PARENTS : ALLOWED_INCOME_PARENTS;
          if (!c.parent_category_id) {
            return allowedParents.includes(c.name);
          }
          const parent = allCats.find(p => p.id === c.parent_category_id);
          return parent ? allowedParents.includes(parent.name) : false;
        });

        // Se o usuário não usar subcategorias, envia apenas as categorias pai permitidas
        let finalCatsToSend = filteredCats;
        if (!useSubcategories) {
          finalCatsToSend = filteredCats.filter(c => !c.parent_category_id);
        }

        const formattedCategories = finalCatsToSend.map(c => ({ id: c.id, name: c.name }));
        
        logger.debug(`[useAIPrediction] [Req #${currentRequestId}] Disparando requisição`, {
          textoDigitado: description.trim(),
          tamanhoHistoricoEnviado: historyDescriptions.length,
          tamanhoCategoriasEnviadas: formattedCategories.length,
        });
        
        const result = await AIAdvisorService.predictAutocompleteAndCategory(
          description.trim(),
          historyDescriptions,
          formattedCategories,
          type,
          historyPairs
        );
        
        // 2. BLINDAGEM DE CONCORRÊNCIA: Se uma requisição mais nova foi disparada após esta, descarta o resultado!
        if (currentRequestId !== requestCounterRef.current) {
          logger.debug(`[useAIPrediction] [Req #${currentRequestId}] Descartando resultado obsoleto — req #${requestCounterRef.current} mais recente`);
          return;
        }

        lastPredictedDescRef.current = description.trim();
        lastHashRef.current = categoriesHash;

        logger.debug(`[useAIPrediction] [Req #${currentRequestId}] Resposta aceita`, result);

        if (result.suggestion) {
          setSuggestion(result.suggestion);
        } else {
          setSuggestion('');
        }
        
        // Mapeia subcategoria para pai se a hierarquia estiver desativada
        let catId = result.categoryId || null;
        if (catId && !useSubcategories && categoriesRef.current) {
          const found = categoriesRef.current.find(c => c.id === catId);
          if (found && found.parent_category_id) {
            logger.debug(`[useAIPrediction] Mapeando subcategoria "${found.name}" para categoria pai`);
            catId = found.parent_category_id;
          }
        }
        
        setPredictedCategoryId(catId);
        
      } catch (error: unknown) {
        if (currentRequestId === requestCounterRef.current) {
          logger.error(`[useAIPrediction] [Req #${currentRequestId}] Erro na chamada de IA`, error instanceof Error ? error : undefined);
          setPredictedCategoryId(null);
          setSuggestion('');
        }
      } finally {
        if (currentRequestId === requestCounterRef.current) {
          setIsPredicting(false);
        }
      }
    }, 800); // 800ms de debounce (Aumentado para mitigar rate limits da IA em digitação sequencial rápida)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [description, type, enabled, categoriesHash, useSubcategories]);

  return { suggestion, predictedCategoryId, isPredicting };
}
