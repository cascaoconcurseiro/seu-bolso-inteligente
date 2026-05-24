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
Exemplos de correção: "ifod" -> "iFood", "craro" -> "Carro", "gasola" -> "Gasolina", "mc donals" -> "McDonald's", "pgto" -> "Pagamento", "luz" -> "Conta de Luz".
2. SELECIONAR A MELHOR CATEGORIA OBRIGATORIAMENTE. Você deve classificar qualquer gasto comum do brasileiro na melhor categoria disponível.
Exemplos lógicos:
- Gasolina, Uber, 99, Ônibus, Mecânico -> Transporte / Carro
- Mercado, iFood, Padaria, Açougue, Sorvete -> Alimentação / Comida
- Luz, Água, Internet, Aluguel, Condomínio -> Moradia / Casa
- Farmácia, Médico, Unimed, Dentista -> Saúde
- Netflix, Spotify, Cinema, Barzinho -> Lazer / Entretenimento
- Roupas, Tênis, Cabelereiro, Unha -> Pessoal / Cuidados

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
          model: "llama-3.3-70b-versatile", // Mudando para o modelo melhor para evitar que ele seja 'burro'
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
}
