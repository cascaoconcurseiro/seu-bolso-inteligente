

import { LOCAL_BRAZILIAN_MAPPINGS, LocalMapping } from "./ai/localMappings";
import { normalizeBrazilianText } from "@/utils/formatting";
import {
  getFinancialAnalysisPrompt,
  getAutocompletePrompt,
  getTripItineraryPrompt
} from "./ai/aiPrompts";

const GROQ_API_URL = import.meta.env.DEV ? "/api/ai" : "https://api.groq.com/openai/v1/chat/completions";

export interface FinancialReportData {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  savingsRate: number;
  currency: string;
  topCategories: { category: string; value: number }[];
  largestExpense: { description: string; amount: number } | null;
  periodLabel: string;
  viewType: 'MONTH' | 'YEAR';
}

export class AIAdvisorService {

  private static async fetchGroq(payload: any): Promise<any> {
    const isDev = import.meta.env.DEV;
    const clientApiKey = import.meta.env.VITE_GROQ_API_KEY;

    if (!isDev && !clientApiKey) {
      console.warn("[AIAdvisorService] Chave VITE_GROQ_API_KEY ausente em produção. IA desativada silenciosamente.");
      return null; // Falha silenciosa permitida para evitar quebrar a UI
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (!isDev && clientApiKey) {
      headers['Authorization'] = `Bearer ${clientApiKey}`;
    }

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        return await response.json();
      } else {
        throw new Error(`Status ${response.status}`);
      }
    } catch (error) {
      console.warn(`[AIAdvisorService] Erro no fluxo principal para ${GROQ_API_URL}`, error);
      
      // Fallback para DEV
      if (isDev && clientApiKey) {
        try {
          console.warn("[AIAdvisorService] Tentando fallback direto na API da Groq...");
          const fallbackResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${clientApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
          });
          if (fallbackResponse.ok) {
            return await fallbackResponse.json();
          }
        } catch (fallbackError) {
          console.error("[AIAdvisorService] Erro no fallback:", fallbackError);
        }
      }
      return null;
    }
  }

  /**
   * Pede para a IA gerar uma análise financeira baseada no histórico mensal ou anual.
   */
  static async analyzeFinancialPeriod(data: FinancialReportData): Promise<string> {
    const prompt = getFinancialAnalysisPrompt(data);

    const result = await this.fetchGroq({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "system", content: prompt }],
      temperature: 0.5,
      max_tokens: 600,
    });

    if (result && result.choices && result.choices[0]) {
      return result.choices[0].message.content || "Desculpe, não consegui formular um conselho agora.";
    }

    throw new Error("Falha ao se comunicar com a Inteligência Artificial.");
  }

  /**
   * Pede para a IA prever o resto da palavra que o usuário está digitando e categorizá-la.
   */
  static async predictAutocompleteAndCategory(
    partialDescription: string,
    historicalDescriptions: string[],
    userCategories: { id: string; name: string }[],
    transactionType?: 'expense' | 'income'
  ): Promise<{ suggestion: string; categoryId: string | null }> {
    const sanitizedPartial = (partialDescription || "").trim().substring(0, 80);
    if (sanitizedPartial.length < 2) {
      return { suggestion: "", categoryId: null };
    }

    // --- ⚡ MOTOR HÍBRIDO DETERMINÍSTICO BRASILEIRO ---
    const normalizedInput = normalizeBrazilianText(sanitizedPartial);

    // 1. Identifica se a lista de categorias fornecida é de receita ou despesa
    let targetType: 'receita' | 'despesa';
    if (transactionType) {
      targetType = transactionType === 'income' ? 'receita' : 'despesa';
    } else {
      const isReceitaList = userCategories.some(uc => {
        const name = normalizeBrazilianText(uc.name);
        return name.includes("salario") || name.includes("freelance") || name.includes("investimento") || name.includes("renda") || name.includes("receita") || name.includes("transferencia recebida");
      });
      targetType = isReceitaList ? 'receita' : 'despesa';
    }

    // 2. Motor de busca local em 3 Fases
    let bestMatch: LocalMapping | null = null;

    // --- FASE 1: MATCH 100% EXATO ---
    // Se o usuário digitou exatamente uma keyword conhecida (evita concorrência e falsos positivos de substrings)
    for (const mapping of LOCAL_BRAZILIAN_MAPPINGS) {
      if (mapping.type !== targetType) continue;

      for (const keyword of mapping.keywords) {
        const normalizedKeyword = normalizeBrazilianText(keyword);
        if (normalizedInput === normalizedKeyword) {
          bestMatch = mapping;
          break;
        }
      }
      if (bestMatch) break;
    }

    // --- FASE 2: CASAMENTO DE PALAVRA COMPLETA (EXATA) ---
    // Se não achou match exato, verifica se a entrada é uma palavra inteira contida na keyword ou vice-versa (limite de palavra exato)
    if (!bestMatch) {
      for (const mapping of LOCAL_BRAZILIAN_MAPPINGS) {
        if (mapping.type !== targetType) continue;

        for (const keyword of mapping.keywords) {
          const normalizedKeyword = normalizeBrazilianText(keyword);

          const inputContainsKeyword = new RegExp(`\\b${normalizedKeyword}\\b`).test(normalizedInput);
          const keywordContainsInput = new RegExp(`\\b${normalizedInput}\\b`).test(normalizedKeyword);

          if (inputContainsKeyword || keywordContainsInput) {
            // Em caso de matches parciais por palavra, preferimos o termo mais curto para evitar alucinações
            if (!bestMatch || normalizedKeyword.length < normalizeBrazilianText(bestMatch.keywords[0]).length) {
              bestMatch = mapping;
            }
          }
        }
      }
    }

    // --- FASE 3: AUTOCOMPLETE PARCIAL (PREFIXO) ---
    // Se o usuário está no início da digitação (ex: "pa" ou "ub")
    if (!bestMatch && normalizedInput.length >= 2) {
      let shortestKeywordLength = Infinity;

      for (const mapping of LOCAL_BRAZILIAN_MAPPINGS) {
        if (mapping.type !== targetType) continue;

        for (const keyword of mapping.keywords) {
          const normalizedKeyword = normalizeBrazilianText(keyword);

          if (normalizedKeyword.startsWith(normalizedInput)) {
            // Damos preferência para a palavra mais curta (evita sugerir pao de queijo ao digitar apenas pao)
            if (normalizedKeyword.length < shortestKeywordLength) {
              shortestKeywordLength = normalizedKeyword.length;
              bestMatch = mapping;
            }
          }
        }
      }
    }

    if (bestMatch) {
      // Cruzamento local com o ID real da categoria cadastrada no banco do usuário
      const searchCat = bestMatch.categoryMatch;
      const matchedUserCategory = userCategories.find(uc => {
        const normUserCatName = normalizeBrazilianText(uc.name);
        return normUserCatName === searchCat || normUserCatName.includes(searchCat) || searchCat.includes(normUserCatName);
      });

      if (matchedUserCategory) {
        console.log(`[AIAdvisorService] ⚡ Match determinístico local brasileiro encontrado para "${sanitizedPartial}":`, {
          suggestion: bestMatch.suggestion,
          categoryId: matchedUserCategory.id,
          categoryName: matchedUserCategory.name
        });
        return {
          suggestion: bestMatch.suggestion,
          categoryId: matchedUserCategory.id
        };
      }
    }
    // --- ⚡ FIM DO MOTOR HÍBRIDO ---

    // 1. Truncamento rigoroso contra payloads abusivos ou anomalias (ex: base64, anexos)
    const uniqueHistory = Array.from(
      new Set(
        (historicalDescriptions || [])
          .map(d => (d || "").trim().substring(0, 50))
          .filter(d => d.length >= 2 && !d.startsWith("data:") && !d.includes(";base64"))
      )
    ).slice(0, 25); // Reduzimos para 25 itens para garantir segurança máxima de token e payload

    const sanitizedCategories = (userCategories || []).map(c => ({
      id: c.id,
      name: (c.name || "").trim().substring(0, 40)
    }));

    const categoryList = sanitizedCategories.map(c => `- Categoria: "${c.name}", ID: "${c.id}"`).join('\n');

    const prompt = getAutocompletePrompt(sanitizedPartial, uniqueHistory, categoryList);
    const result = await this.fetchGroq({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "system", content: prompt }],
      temperature: 0.5,
      max_tokens: 300,
      response_format: { type: "json_object" }
    });

    if (result && result.choices && result.choices[0]) {
      try {
        const parsed = JSON.parse(result.choices[0].message.content);
        return parsed.suggestions || [];
      } catch (e) {
        return [];
      }
    }
    
    return [];
  }

  static async suggestTripItinerary(destination: string): Promise<Array<{ title: string; location: string; description: string; durationHours: number }>> {
    if (!destination) return [];

    const prompt = getTripItineraryPrompt(destination);
    const result = await this.fetchGroq({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "system", content: prompt }],
      temperature: 0.4,
      max_tokens: 600,
      response_format: { type: "json_object" }
    });

    if (result && result.choices && result.choices[0]) {
      try {
        const parsed = JSON.parse(result.choices[0].message.content);
        return parsed.suggestions || [];
      } catch (e) {
        return [];
      }
    }

    return [];
  }

  static async suggestTripChecklist(destination: string): Promise<Array<{ item: string; category: string }>> {
    if (!destination) return [];

    const prompt = `
Você é a inteligência artificial "Arquiteto Financeiro" especializada em organização de viagens.
O usuário vai viajar para: "${destination}".
Crie um checklist de até 10 itens fundamentais para esta viagem específica.
Lembre-se das necessidades climáticas e burocráticas do destino (ex: Passaporte e Visto se for internacional, casaco pesado se for neve, protetor solar se for praia).
Categorias permitidas: documentos, roupas, higiene, eletronicos, remedios, outros.

RETORNE APENAS UM JSON no seguinte formato, e nada mais:
{
  "suggestions": [
    { "item": "Nome do Item", "category": "documentos" }
  ]
}`;

    const result = await this.fetchGroq({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "system", content: prompt }],
      temperature: 0.3,
      max_tokens: 400,
      response_format: { type: "json_object" }
    });

    if (result && result.choices && result.choices[0]) {
      try {
        const parsed = JSON.parse(result.choices[0].message.content);
        return parsed.suggestions || [];
      } catch (e) {
        return [];
      }
    }

    return [];
  }
}
