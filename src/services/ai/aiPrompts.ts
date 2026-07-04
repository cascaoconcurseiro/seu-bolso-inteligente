import { FinancialReportData } from "../aiAdvisorService";

export const getFinancialAnalysisPrompt = (data: FinancialReportData) => `
Você é o consultor financeiro IA oficial do aplicativo.
O usuário do sistema precisa de análises, dicas e um raio-x do comportamento financeiro.
O usuário está visualizando os relatórios do período: ${data.periodLabel} (${data.viewType === "MONTH" ? "Mensal" : "Anual"}).

DADOS DO PERÍODO:
- Receitas Totais: ${data.currency} ${data.totalIncome.toFixed(2)}
- Despesas Totais: ${data.currency} ${data.totalExpense.toFixed(2)}
- Saldo Líquido: ${data.currency} ${data.balance.toFixed(2)}
- Taxa de Poupança (economia): ${data.savingsRate.toFixed(1)}%

Top Categorias de Gasto:
${data.topCategories.map((c) => `- ${c.category}: ${data.currency} ${c.value.toFixed(2)}`).join("\n")}

${data.largestExpense ? `Maior Despesa Única: ${data.largestExpense.description} (${data.currency} ${data.largestExpense.amount.toFixed(2)})` : ""}

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

export const getAutocompletePrompt = (
  sanitizedPartial: string,
  uniqueHistory: string[],
  categoryList: string,
  userExamples: string = ""
) => `
Você é a inteligência artificial "Arquiteto Financeiro", especialista em finanças pessoais do Brasil, embutida no teclado do aplicativo.
Sua missão é ajudar o usuário a preencher campos difíceis (como descrições e títulos) ou responder perguntas rápidas de forma direta.
O usuário começou a digitar uma transação (despesa ou receita): "${sanitizedPartial}"

Seu trabalho é:
1. ADIVINHAR A PALAVRA COMPLETA e CORRIGIR ERROS ORTOGRÁFICOS.
Exemplos de correção: "ifod" -> "iFood", "craro" -> "Carro", "gasola" -> "Gasolina", "mc donals" -> "McDonald's", "pgto" -> "Pagamento", "pao" -> "Pão", "sal" -> "Salário", "div" -> "Dividendos".
2. REGIONALISMOS E GÍRIAS BRASILEIRAS SÃO VÁLIDOS!
Abrace os regionalismos de todo o Brasil (especialmente Rio Grande do Sul, Nordeste, etc). Exemplos:
- "Cacetinho" (Pão), "Pão de sal", "Bergamota", "Churras", "Guri", "Pila" (Dinheiro).
3. SELECIONAR A MELHOR CATEGORIA COM MÁXIMA INTELIGÊNCIA E PRECISÃO FINANCEIRA:
Você DEVE escolher OBRIGATORIAMENTE uma categoria que conste na lista de categorias disponíveis abaixo!

Se a lista de categorias disponíveis abaixo contiver categorias de DESPESA (Supermercado, Transporte, Gasolina, etc), mapeie conforme as regras de DESPESA:
- "Supermercado": Compras do dia a dia, compras de mantimentos para casa, feira, hortifrúti, açougue, atacadões (Assaí, Sam's), mercados de bairro e compras básicas de PADARIA, como Pão, Cacetinho, Pão de Sal, Leite, Queijo e Margarina!
- "Restaurantes e Lanches": Comer fora, almoço de trabalho, jantares, barzinho, chopp, cafeterias (Starbucks), McDonald's, Burger King, lanchonetes, pastelarias, rodízios, sushis, xis, dogão, docerias, ou seja, lanches e refeições prontas para consumo local.
- "Delivery": Pedidos de comida pronta para entrega domiciliar exclusivamente através de aplicativos como iFood, Rappi, Uber Eats, Zé Delivery ou tele-entrega direta de pizzaria.
- "Gasolina": Abastecimento de veículo em postos de combustível (gasolina, álcool, diesel, GNV), Posto Ipiranga, Petrobras, Shell, etc.
- "Transporte": Qualquer gasto relacionado a locomoção urbana ou manutenção de veículos, como aplicativos de mobilidade (Uber, 99, táxi), transporte público (ônibus, metrô, trem), tarifas de pedágio, estacionamentos, lavagem, mecânico, pneu, seguro, IPVA, licenciamento, conserto e manutenção de carros/motos.
  * ATENÇÃO ABSOLUTA: A palavra isolada "Uber" é TRANSPORTE. A palavra "Uber Eats" (ou qualquer menção a comida no Uber) é DELIVERY. A palavra "Carro" isolada ou associada a peças e mecânica pertence obrigatoriamente a "Transporte"!
- "Moradia", "Contas e Assinaturas", "Saúde", "Educação", "Compras", "Lazer", "Viagens", "Família e Pets", "Financeiro", "Impostos", "Outros".

Se a lista de categorias disponíveis abaixo contiver apenas categorias de RECEITA (Trabalho, Investimentos, Renda Extra, Sistema, Outros), mapeie conforme as regras de RECEITA:
- "Trabalho": Ganhos vindos do emprego, salários, adiantamento salarial, pró-labore, horas extras, comissões, bônus corporativos, décimo terceiro (13º salário), férias e receitas de prestação de serviços como trabalhador autônomo, freelancers, "jobs" ou consultorias.
- "Investimentos": Receitas provenientes de aplicações financeiras, como dividendos de ações, juros sobre capital próprio (JCP), proventos de fundos imobiliários (FIIs), rendimentos de poupança, títulos de renda fixa (CDB, Tesouro Direto), resgate de investimentos e lucros com criptoativos.
- "Renda Extra": Ganhos esporádicos ou complementares, como aluguel recebido de imóveis, venda de bens usados (desapegos, brechós), prêmios, doações, heranças, pensão, aposentadoria, reembolsos de despesas, cashbacks de compras ou transferências recebidas (ex: PIX de amigos/familiares).
- "Sistema": Saldo inicial de contas, acertos contábeis ou ajustes manuais do sistema.
- "Outros": Receitas que de forma alguma se enquadrem nas opções anteriores.

EXEMPLOS EXPLICITOS DE MAPEAMENTO DIRETO (Mapeie sem hesitar):
[Para Despesas]
- "carro", "pneu", "mecanico", "oficina", "estacionamento", "pedagio", "lavagem", "seguro auto", "uber", "99pop" -> Categoria correspondente a "Transporte" (NUNCA supermercado!)
- "combustivel", "gasolina", "etanol", "diesel", "posto ipiranga", "shell" -> Categoria correspondente a "Gasolina"
- "pao", "cacetinho", "leite", "manteiga", "mercado", "supermercado", "sacolao", "feira" -> Categoria correspondente a "Supermercado"
- "mcdonalds", "burguer king", "starbucks", "almoço", "jantar", "rodizio", "churrascaria" -> Categoria correspondente a "Restaurantes e Lanches"
- "ifood", "rappi", "tele pizza", "delivery burguer", "uber eats" -> Categoria correspondente a "Delivery" (ATENÇÃO: Diferencie Uber de Uber Eats!)

[Para Receitas]
- "salario", "pagamento", "salário", "pro-labore", "quinzena", "freelance", "job", "prestacao de servicos" -> Categoria correspondente a "Trabalho"
- "dividendos", "juros cdb", "proventos", "rendimento poupança", "fii", "ações" -> Categoria correspondente a "Investimentos"
- "aluguel recebido", "venda desapego", "brechó", "pix amigo", "presente", "reembolso", "cashback" -> Categoria correspondente a "Renda Extra"

4. REGRA DE SOBREVIVÊNCIA E PROTEÇÃO DE FLUXO: É expressamente PROIBIDO sugerir uma categoria de despesa se a lista de categorias disponíveis só contiver categorias de receita, e vice-versa! Se você não tiver certeza de qual categoria escolher, escolha a categoria com nome "Outros" presente na lista de categorias disponíveis do usuário. NUNCA invente categorias fora da lista!

CLASSIFICAÇÕES JÁ FEITAS PELO USUÁRIO (MÁXIMA PRIORIDADE — aprenda com elas):
${userExamples || "(nenhum histórico classificado ainda)"}

Histórico de descrições recentes do usuário (use como base para sugestão de texto):
[${uniqueHistory.join(", ")}]

Categorias disponíveis no banco de dados do usuário:
${categoryList}

REGRA ESTILOSA OBRIGATÓRIA:
Retorne APENAS um JSON válido. É PROIBIDO retornar null para categoryId se houver qualquer categoria minimamente relacionada na lista. O valor de "categoryId" deve ser EXATAMENTE o ID correspondente da lista de categorias, sem adicionar prefixos como "ID:" ou "id:" e sem alterar a string.
{
  "suggestion": "Nome Formatado Corretamente",
  "categoryId": "id_da_categoria_mais_apropriada"
}
`;

export const getTripShoppingPrompt = (destination: string, currency: string) => `
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

export const getTripItineraryPrompt = (destination: string) => `
Você é um viajante experiente que conhece ${destination} de verdade — não um guia turístico genérico.
Crie um roteiro de 5 a 8 paradas para alguém que vai a ${destination}.
Misture atrações clássicas com lugares que moradores e frequentadores regulares realmente frequentam.
Seja específico: nomes reais de ruas, bairros, restaurantes, mirantes, feiras locais — nada de "explore o centro histórico" ou "visite museus locais".
Cada item deve ter um motivo concreto para ir (uma especialidade da casa, o melhor horário, um detalhe único).

- 'title': Nome real e específico do lugar ou atividade
- 'location': Endereço aproximado, bairro ou ponto de referência concreto
- 'description': Por que vale a pena — seja específico, não genérico
- 'durationHours': Tempo realista para curtir (ex: 1.5 para um almoço)

RETORNE APENAS UM JSON no seguinte formato, e nada mais:
{
  "suggestions": [
    { "title": "...", "location": "...", "description": "...", "durationHours": 2 }
  ]
}`;

// Destinations in northern hemisphere — season is opposite to Brazil
const NORTHERN_HEMISPHERE_KEYWORDS = [
  "europa",
  "europe",
  "paris",
  "london",
  "londres",
  "roma",
  "rome",
  "madrid",
  "barcelona",
  "amsterdam",
  "berlin",
  "berlim",
  "viena",
  "vienna",
  "praga",
  "prague",
  "lisboa",
  "lisbon",
  "porto",
  "budapest",
  "varsóvia",
  "warsaw",
  "estocolmo",
  "stockholm",
  "copenhague",
  "copenhagen",
  "oslo",
  "helsinki",
  "dublin",
  "edinburgh",
  "edimburgo",
  "zurique",
  "zurich",
  "genebra",
  "geneva",
  "bruxelas",
  "brussels",
  "milão",
  "milan",
  "florença",
  "florence",
  "veneza",
  "venice",
  "nápoles",
  "naples",
  "atenas",
  "athens",
  "istambul",
  "istanbul",
  "moscou",
  "moscow",
  "eua",
  "usa",
  "estados unidos",
  "united states",
  "new york",
  "nova york",
  "los angeles",
  "miami",
  "orlando",
  "chicago",
  "las vegas",
  "san francisco",
  "boston",
  "washington",
  "canada",
  "canadá",
  "toronto",
  "vancouver",
  "montreal",
  "méxico",
  "mexico",
  "cidade do méxico",
  "cancún",
  "cancun",
  "japão",
  "japan",
  "tóquio",
  "tokyo",
  "osaka",
  "kyoto",
  "beijing",
  "xangai",
  "shanghai",
  "china",
  "coreia",
  "korea",
  "seoul",
  "seul",
  "bangcoc",
  "bangkok",
  "tailândia",
  "thailand",
  "índia",
  "india",
  "dubai",
  "abu dhabi",
  "marrocos",
  "morocco",
  "egito",
  "egypt",
  "cairo",
];

const isNorthernHemisphere = (destination: string): boolean => {
  const lower = destination.toLowerCase();
  return NORTHERN_HEMISPHERE_KEYWORDS.some((kw) => lower.includes(kw));
};

export const getTripChecklistPrompt = (
  destination: string,
  startDate?: string,
  endDate?: string
) => {
  let seasonHint = "";
  let durationHint = "";

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const month = start.getMonth() + 1;
    const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const dateRange = `${start.toLocaleDateString("pt-BR")} a ${end.toLocaleDateString("pt-BR")}`;

    durationHint = `Duração da viagem: ${days} dia${days > 1 ? "s" : ""}.`;

    const northern = isNorthernHemisphere(destination);

    // Northern hemisphere: seasons are opposite to Brazil
    // Southern hemisphere (Brazil/Argentina/etc): standard seasons
    let isSummer: boolean;
    if (northern) {
      isSummer = month >= 6 && month <= 8;
    } else {
      isSummer = month >= 10 || month <= 3;
    }

    const isWinter = northern ? month === 12 || month <= 2 : month >= 6 && month <= 8;
    const isAutumn = northern ? month >= 9 && month <= 11 : month >= 3 && month <= 5;
    const isSpring = northern ? month >= 3 && month <= 5 : month >= 9 && month <= 11;

    if (isSummer) {
      seasonHint = `ESTAÇÃO: VERÃO (${dateRange}). Calor, sol forte, possível alta umidade. Roupas leves, protetor solar alto FPS, óculos de sol. NÃO sugira casacos, agasalhos ou roupas de frio.`;
    } else if (isWinter) {
      seasonHint = `ESTAÇÃO: INVERNO (${dateRange}). Frio${northern ? " intenso" : ", especialmente à noite"}. Casaco, agasalhos, meias grossas. NÃO sugira roupas de praia ou itens de calor.`;
    } else if (isAutumn) {
      seasonHint = `ESTAÇÃO: OUTONO (${dateRange}). Temperaturas amenas a frescas, pode chover. Jaqueta leve, camadas de roupa.`;
    } else if (isSpring) {
      seasonHint = `ESTAÇÃO: PRIMAVERA (${dateRange}). Temperaturas agradáveis, clima variável. Jaqueta leve para manhãs e noites.`;
    }
  }

  return `Você é um viajante experiente que já foi para ${destination} diversas vezes.
Crie um checklist de mala/preparação com exatamente 10 itens PRÁTICOS e ESPECÍFICOS para quem vai viajar para ${destination}.
${durationHint ? `\n${durationHint}` : ""}
${seasonHint ? `\n⚠️ ESTAÇÃO/CLIMA — SIGA RIGOROSAMENTE:\n${seasonHint}\n` : ""}

REGRAS OBRIGATÓRIAS:
1. Pense no que um viajante REAL leva — não uma lista de hotel genérica.
2. Considere se é destino internacional (passaporte, visto, adaptador de tomada, câmbio, chip internacional) ou nacional.
3. Seja específico: não "roupas" mas "Camisetas leves de secagem rápida (${seasonHint.includes("VERÃO") ? "5-6 peças" : "3-4 peças"})".
4. Inclua 1-2 itens que viajantes frequentemente ESQUECEM mas fazem diferença real neste destino.
5. NUNCA sugira itens incompatíveis com a estação indicada acima.
6. Adapte à duração da viagem — não sugira 10 pares de sapato para 3 dias.
7. NÃO inclua itens óbvios como "escova de dentes" ou "roupas íntimas" — foque no que é específico para ESTE destino e ESTA época.

A 'category' deve ser uma destas: "Roupas", "Eletrônicos", "Documentos", "Higiene", "Acessórios", ou "Outros".

RETORNE APENAS UM JSON no seguinte formato, e nada mais:
{
  "suggestions": [
    { "item": "Passaporte válido por mais de 6 meses", "category": "Documentos" },
    { "item": "Adaptador de tomada tipo F (padrão europeu)", "category": "Eletrônicos" }
  ]
}`;
};
