import { CategoryPrediction } from "@/types/categoryPrediction";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

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
    if (!GROQ_API_KEY) {
      throw new Error("Chave da API da Groq não configurada. Configure VITE_GROQ_API_KEY no arquivo .env.");
    }

    const prompt = `
Você é um consultor financeiro de elite de um sistema chamado "Seu Bolso Inteligente". 
Sua função é analisar o resumo financeiro do usuário e fornecer um parecer analítico em português do Brasil, sendo didático, respeitoso e focado em melhorar a saúde financeira do cliente.
Não invente números, use APENAS os números fornecidos. Não faça cálculos complexos. Mantenha o design do texto limpo.

DADOS FINANCEIROS (${data.viewType === 'MONTH' ? 'Mês' : 'Ano'}: ${data.periodLabel}):
- Moeda: ${data.currency}
- Total Receitas: ${data.totalIncome.toFixed(2)}
- Total Despesas: ${data.totalExpense.toFixed(2)}
- Saldo Líquido: ${data.balance.toFixed(2)}
- Taxa de Poupança (Economia): ${data.savingsRate.toFixed(2)}%
- Maior Despesa: ${data.largestExpense ? `${data.largestExpense.description} (${data.largestExpense.amount.toFixed(2)})` : 'Nenhuma'}
- Top 3 Categorias de Gastos:
${data.topCategories.slice(0, 3).map(c => `  * ${c.category}: ${c.value.toFixed(2)}`).join('\n')}

ESTRUTURA DA SUA RESPOSTA (obrigatória, use formato Markdown simples sem muitas tabelas):
### 📊 Resumo Executivo
(Parágrafo curto sobre o estado geral)

### ✨ Pontos Fortes
(Liste 2 coisas boas, exemplo: taxa de poupança alta, ou despesas sob controle)

### ⚠️ Pontos de Atenção
(Liste os gargalos, onde está gastando muito, focado nas top categorias ou na maior despesa)

### 🎯 Plano de Ação
(Dê 2 dicas práticas baseadas exclusivamente nos gastos reais descritos acima para o próximo ciclo)
`;

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // Modelo atualizado e mais inteligente da Groq
        messages: [{ role: "system", content: prompt }],
        temperature: 0.5, // Respostas lógicas e controladas
        max_tokens: 1024,
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
    if (!GROQ_API_KEY || partialDescription.length < 2) {
      return { suggestion: "", categoryId: null };
    }

    // Para evitar tokens excessivos, pegamos apenas até 30 descrições únicas do histórico do usuário
    const uniqueHistory = Array.from(new Set(historicalDescriptions)).slice(0, 30);
    const categoryList = userCategories.map(c => `ID:${c.id} - ${c.name}`).join('\n');

    const prompt = `
Você é uma inteligência artificial embutida no teclado e classificador financeiro do app "Seu Bolso Inteligente".
O usuário começou a digitar a descrição de uma despesa: "${partialDescription}"

Seu trabalho é:
1. Tentar advinhar qual é a palavra/frase COMPLETA que ele quer escrever baseando-se no histórico dele ou no uso comum de finanças (ex: "Pã" -> "Padaria" ou "Pão de Queijo").
2. Prever qual o ID da categoria correta da despesa na lista de categorias do usuário.

Histórico recente do usuário:
[${uniqueHistory.join(', ')}]

Categorias disponíveis:
${categoryList}

REGRA ESTILOSA OBRIGATÓRIA:
Retorne APENAS um JSON válido, sem NADA a mais, nenhum "markdown", no seguinte formato exato:
{
  "suggestion": "Frase completa adivinhada",
  "categoryId": "id_da_categoria_ou_null"
}
`;

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant", // Modelo atualizado oficial para respostas curtas
          messages: [{ role: "system", content: prompt }],
          temperature: 0.1, // Quase determinístico
          max_tokens: 150,
        })
      });

      if (!response.ok) return { suggestion: "", categoryId: null };

      const result = await response.json();
      const content = result.choices[0].message.content;
      
      // Limpeza pra garantir que pegamos o JSON
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}') + 1;
      const cleanJson = content.substring(jsonStart, jsonEnd);
      
      const parsed = JSON.parse(cleanJson);
      
      return {
        suggestion: parsed.suggestion || "",
        categoryId: parsed.categoryId || null
      };
    } catch (error) {
      console.error("Erro na predição AI:", error);
      return { suggestion: "", categoryId: null };
    }
  }
}
