import { CategoryPrediction } from "@/types/categoryPrediction";

const GROQ_API_URL = "/api/ai";

// Interfaces para os relatórios
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
  /**
   * Pede para a IA gerar uma análise financeira baseada no histórico mensal ou anual.
   */
  static async analyzeFinancialPeriod(data: FinancialReportData): Promise<string> {
    const prompt = `
Você é o consultor financeiro IA oficial do app "Seu Bolso Inteligente".
O usuário está visualizando os relatórios do período: ${data.periodLabel} (${data.viewType === 'MONTH' ? 'Mensal' : 'Anual'}).

DADOS DO PERÍODO:
- Receitas Totais: ${data.currency} ${data.totalIncome.toFixed(2)}
- Despesas Totais: ${data.currency} ${data.totalExpense.toFixed(2)}
- Saldo Líquido: ${data.currency} ${data.balance.toFixed(2)}
- Taxa de Poupança (economia): ${data.savingsRate.toFixed(1)}%

Top Categorias de Gasto:
${data.topCategories.map(c => `- ${c.category}: ${data.currency} ${c.value.toFixed(2)}`).join('\n')}

${data.largestExpense ? `Maior Despesa Única: ${data.largestExpense.description} (${data.currency} ${data.largestExpense.amount.toFixed(2)})` : ''}

SUA MISSÃO:
1. Analise a saúde financeira do usuário neste período.
2. Seja MUITO conciso, direto e didático (tom de especialista de negócios e coach financeiro motivador).
3. Escreva pequenos parágrafos, formatados em Markdown. Use negrito para enfatizar coisas importantes.
4. Siga ESTRITAMENTE esta estrutura de tópicos (não use outras hashtags):
### Resumo
### Pontos Fortes
### Pontos de Atenção
### Plano de Ação

Não invente números, use apenas os dados acima. Se os dados estiverem todos zerados, diga que precisa de mais movimentações para gerar uma análise.
`;

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant", // Modelo econômico de baixo custo-benefício
          messages: [{ role: "system", content: prompt }],
          temperature: 0.5,
          max_tokens: 600,
        })
      });

      if (response.ok) {
        const result = await response.json();
        return result.choices[0].message.content || "Desculpe, não consegui formular um conselho agora.";
      }
      throw new Error(`API servidora retornou status ${response.status}`);
    } catch (error) {
      console.warn("[AIAdvisorService] Falha na chamada da API servidora para análise financeira. Tentando fallback direto no cliente...", error);
      const clientApiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (clientApiKey) {
        try {
          const directResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${clientApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: "llama-3.1-8b-instant",
              messages: [{ role: "system", content: prompt }],
              temperature: 0.5,
              max_tokens: 600,
            })
          });

          if (directResponse.ok) {
            const result = await directResponse.json();
            return result.choices[0].message.content || "Desculpe, não consegui formular um conselho agora.";
          }
        } catch (fallbackError) {
          console.error("[AIAdvisorService] Erro no fallback direto de análise financeira:", fallbackError);
        }
      }
      throw new Error("Falha ao se comunicar com a Inteligência Artificial.");
    }
  }

  /**
   * Pede para a IA prever o resto da palavra que o usuário está digitando e categorizá-la.
   */
  /**
   * Pede para a IA prever o resto da palavra que o usuário está digitando e categorizá-la.
   */
  static async predictAutocompleteAndCategory(
    partialDescription: string,
    historicalDescriptions: string[],
    userCategories: { id: string; name: string }[]
  ): Promise<{ suggestion: string; categoryId: string | null }> {
    const sanitizedPartial = (partialDescription || "").trim().substring(0, 80);
    if (sanitizedPartial.length < 2) {
      return { suggestion: "", categoryId: null };
    }

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

    const prompt = `
Você é a inteligência artificial "Arquiteto Financeiro", especialista em finanças pessoais do Brasil, embutida no teclado do app "Seu Bolso Inteligente".
O usuário começou a digitar uma despesa: "${sanitizedPartial}"

Seu trabalho é:
1. ADIVINHAR A PALAVRA COMPLETA e CORRIGIR ERROS ORTOGRÁFICOS.
Exemplos de correção: "ifod" -> "iFood", "craro" -> "Carro", "gasola" -> "Gasolina", "mc donals" -> "McDonald's", "pgto" -> "Pagamento".
2. REGIONALISMOS E GÍRIAS BRASILEIRAS SÃO VÁLIDOS!
Abrace os regionalismos de todo o Brasil (especialmente Rio Grande do Sul, Nordeste, etc). Exemplos:
- "Xis", "Cacetinho" (Pão), "Bergamota", "Churras", "Dogão", "Hamburguer" -> Alimentação / Comida
- "Guri", "Pila" (Dinheiro), "Gás" -> Diversos / Despesas
3. SELECIONAR A MELHOR CATEGORIA OBRIGATORIAMENTE.
- Gasolina, Uber, 99, Ônibus, Mecânico -> Transporte / Carro
- Luz, Água, Internet, Aluguel, Condomínio -> Moradia / Casa
- Farmácia, Médico, Unimed, Dentista -> Saúde
- Netflix, Spotify, Cinema, Barzinho -> Lazer / Entretenimento
4. REGRA DE SOBREVIVÊNCIA: Se você NÃO FAZ IDEIA do que a palavra significa, APENAS formate a primeira letra como maiúscula e categorize como "Outros", "Alimentação" ou a categoria mais genérica disponível. NUNCA retorne vazio ou null!

Histórico recente do usuário (use como base, mas corrija erros absurdos):
[${uniqueHistory.join(', ')}]

Categorias disponíveis no banco de dados do usuário:
${categoryList}

REGRA ESTILOSA OBRIGATÓRIA:
Retorne APENAS um JSON válido. É PROIBIDO retornar null para categoryId se houver qualquer categoria minimamente relacionada na lista. O valor de "categoryId" deve ser EXATAMENTE o ID correspondente da lista de categorias, sem adicionar prefixos como "ID:" ou "id:" e sem alterar a string.
{
  "suggestion": "Nome Formatado Corretamente",
  "categoryId": "id_da_categoria_mais_apropriada"
}
`;

    const requestBody = {
      model: "llama-3.1-8b-instant",
      messages: [{ role: "system", content: prompt }],
      temperature: 0.1,
      max_tokens: 100,
      response_format: { type: "json_object" }
    };

    const bodyString = JSON.stringify(requestBody);
    const bodySizeBytes = new Blob([bodyString]).size;

    console.log(`[AIAdvisorService] 🔌 RASTREAMENTO DE REQUISIÇÃO (Tamanho: ${bodySizeBytes} bytes / ${bodyString.length} chars):`, {
      partialDescription: sanitizedPartial,
      historyCount: uniqueHistory.length,
      categoriesCount: sanitizedCategories.length,
      first3History: uniqueHistory.slice(0, 3),
      categories: sanitizedCategories.map(c => c.name)
    });

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: bodyString
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[AIAdvisorService] ❌ Erro na API Servidora (Status ${response.status}):`, {
          errorText,
          payloadSizeBytes: bodySizeBytes
        });
        throw new Error(`API servidora retornou status ${response.status} - ${errorText.substring(0, 200)}`);
      }

      const result = await response.json();
      const parsed = JSON.parse(result.choices[0].message.content);
      
      let finalCategoryId = parsed.categoryId || null;
      if (finalCategoryId && typeof finalCategoryId === 'string') {
        finalCategoryId = finalCategoryId.trim().replace(/['"{}[:\]]/g, '').trim();
        if (finalCategoryId.toLowerCase().startsWith('id:')) finalCategoryId = finalCategoryId.slice(3).trim();
        else if (finalCategoryId.toLowerCase().startsWith('id-')) finalCategoryId = finalCategoryId.slice(3).trim();
        else if (finalCategoryId.toLowerCase().startsWith('id_')) finalCategoryId = finalCategoryId.slice(3).trim();
      }

      console.log(`[AIAdvisorService] ✅ Resposta da API Servidora decodificada com sucesso:`, {
        suggestion: parsed.suggestion,
        categoryId: finalCategoryId
      });

      return {
        suggestion: parsed.suggestion || "",
        categoryId: finalCategoryId
      };
    } catch (error: any) {
      console.warn(`[AIAdvisorService] ⚠️ Falha na chamada da API servidora para autocomplete (Tamanho do payload: ${bodySizeBytes} bytes). Iniciando fallback direto no cliente...`, error);
      
      const clientApiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (!clientApiKey) {
        console.error("[AIAdvisorService] ❌ Fallback no cliente impossível: VITE_GROQ_API_KEY não está definida no ambiente do cliente!");
        return { suggestion: "", categoryId: null };
      }

      try {
        console.log(`[AIAdvisorService] 🔌 Iniciando requisição direta para a Groq (Fallback Cliente - Tamanho: ${bodySizeBytes} bytes)...`);
        const directResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${clientApiKey}`,
            'Content-Type': 'application/json',
          },
          body: bodyString
        });

        if (!directResponse.ok) {
          const errorText = await directResponse.text();
          console.error(`[AIAdvisorService] ❌ Erro no Fallback Direto da Groq (Status ${directResponse.status}):`, {
            errorText,
            payloadSizeBytes: bodySizeBytes
          });
          throw new Error(`Groq direto retornou status ${directResponse.status} - ${errorText.substring(0, 200)}`);
        }

        const result = await directResponse.json();
        const parsed = JSON.parse(result.choices[0].message.content);
        
        let finalCategoryId = parsed.categoryId || null;
        if (finalCategoryId && typeof finalCategoryId === 'string') {
          finalCategoryId = finalCategoryId.trim().replace(/['"{}[:\]]/g, '').trim();
          if (finalCategoryId.toLowerCase().startsWith('id:')) finalCategoryId = finalCategoryId.slice(3).trim();
          else if (finalCategoryId.toLowerCase().startsWith('id-')) finalCategoryId = finalCategoryId.slice(3).trim();
          else if (finalCategoryId.toLowerCase().startsWith('id_')) finalCategoryId = finalCategoryId.slice(3).trim();
        }

        console.log("[AIAdvisorService] ✅ Autocomplete via fallback direto na Groq concluído com sucesso!", {
          suggestion: parsed.suggestion,
          categoryId: finalCategoryId
        });
        
        return {
          suggestion: parsed.suggestion || "",
          categoryId: finalCategoryId
        };
      } catch (fallbackError: any) {
        console.error("[AIAdvisorService] ❌ Erro crítico no fallback direto de autocomplete:", fallbackError);
      }
      return { suggestion: "", categoryId: null };
    }
  }

  // --- MÉTODOS PARA VIAGENS (TRIP PLANNING) ---

  static async suggestTripShopping(destination: string, currency: string): Promise<Array<{ item: string; estimatedCost: number }>> {
    if (!destination) return [];

    const prompt = `
Você é a inteligência artificial "Arquiteto Financeiro" especializada em viagens.
O usuário vai viajar para: "${destination}" e a moeda local da viagem é: "${currency}".
Sugira até 8 itens comuns que viajantes costumam COMPRAR (Shopping) nesse destino.
Pense no que as pessoas mais gastam nesse local (souvenirs típicos, comidas locais que levam pra casa, eletrônicos se for Miami/Orlando, vinhos se for Paris/Mendoza, etc).
A estimativa de custo (estimatedCost) deve estar na moeda informada: ${currency}.

RETORNE APENAS UM JSON no seguinte formato, e nada mais:
{
  "suggestions": [
    { "item": "Nome do Item", "estimatedCost": 0.00 }
  ]
}`;

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "system", content: prompt }],
          temperature: 0.5,
          max_tokens: 300,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) throw new Error("Falha ao comunicar com IA");
      const result = await response.json();
      const parsed = JSON.parse(result.choices[0].message.content);
      return parsed.suggestions || [];
    } catch (error) {
      console.error("Erro na sugestão de compras da viagem:", error);
      return [];
    }
  }

  static async suggestTripItinerary(destination: string): Promise<Array<{ title: string; location: string; description: string; durationHours: number }>> {
    if (!destination) return [];

    const prompt = `
Você é a inteligência artificial "Arquiteto Financeiro" especializada em roteiros turísticos.
O usuário vai viajar para: "${destination}".
Sugira até 6 passeios ou atividades imperdíveis nesse destino.

RETORNE APENAS UM JSON no seguinte formato, e nada mais:
{
  "suggestions": [
    { 
      "title": "Nome do Passeio", 
      "location": "Local exato/Endereço", 
      "description": "Breve descrição do que fazer lá",
      "durationHours": 2 // Estimativa de duração em horas
    }
  ]
}`;

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "system", content: prompt }],
          temperature: 0.4,
          max_tokens: 600,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) throw new Error("Falha ao comunicar com IA");
      const result = await response.json();
      const parsed = JSON.parse(result.choices[0].message.content);
      return parsed.suggestions || [];
    } catch (error) {
      console.error("Erro na sugestão de roteiro da viagem:", error);
      return [];
    }
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

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "system", content: prompt }],
          temperature: 0.3,
          max_tokens: 400,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) throw new Error("Falha ao comunicar com IA");
      const result = await response.json();
      const parsed = JSON.parse(result.choices[0].message.content);
      return parsed.suggestions || [];
    } catch (error) {
      console.error("Erro na sugestão de checklist da viagem:", error);
      return [];
    }
  }
}
