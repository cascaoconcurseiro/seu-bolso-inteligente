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

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // Modelo de alta capacidade para análises complexas
        messages: [{ role: "system", content: prompt }],
        temperature: 0.5,
        max_tokens: 600,
      })
    });

    if (!response.ok) {
      console.error("Erro na Groq API:", await response.text());
      throw new Error("Falha ao se comunicar com a Inteligência Artificial.");
    }

    const result = await response.json();
    return result.choices[0].message.content || "Desculpe, não consegui formular um conselho agora.";
  }

  /**
   * Pede para a IA prever o resto da palavra que o usuário está digitando e categorizá-la.
   */
  static async predictAutocompleteAndCategory(
    partialDescription: string,
    historicalDescriptions: string[],
    userCategories: { id: string; name: string }[]
  ): Promise<{ suggestion: string; categoryId: string | null }> {
    if (partialDescription.length < 2) {
      return { suggestion: "", categoryId: null };
    }

    // Para evitar tokens excessivos, pegamos apenas até 30 descrições únicas do histórico do usuário
    const uniqueHistory = Array.from(new Set(historicalDescriptions)).slice(0, 30);
    const categoryList = userCategories.map(c => `ID:${c.id} - ${c.name}`).join('\n');

    const prompt = `
Você é a inteligência artificial "Arquiteto Financeiro", especialista em finanças pessoais do Brasil, embutida no teclado do app "Seu Bolso Inteligente".
O usuário começou a digitar uma despesa: "${partialDescription}"

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
Retorne APENAS um JSON válido. É PROIBIDO retornar null para categoryId se houver qualquer categoria minimamente relacionada na lista.
{
  "suggestion": "Nome Formatado Corretamente",
  "categoryId": "id_da_categoria_mais_apropriada"
}
`;

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant", // Modelo ultra-rápido de 8B para autocomplete, economizando cota e respondendo instantaneamente
          messages: [{ role: "system", content: prompt }],
          temperature: 0.1,
          max_tokens: 100,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro na API: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      const parsed = JSON.parse(result.choices[0].message.content);
      
      return {
        suggestion: parsed.suggestion || "",
        categoryId: parsed.categoryId || null
      };
    } catch (error) {
      console.error("Erro na predição AI:", error);
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
          model: "llama-3.3-70b-versatile",
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
          model: "llama-3.3-70b-versatile",
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
          model: "llama-3.3-70b-versatile",
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
