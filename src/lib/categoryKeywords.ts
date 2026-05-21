// Dicionário de palavras-chave para categorização automática
// Estrutura: Nome da Categoria → Array de { keywords, weight }

export interface KeywordGroup {
  keywords: string[];
  weight: number; // 1-10, maior = mais relevante
}

export const DEFAULT_KEYWORDS: Record<string, KeywordGroup[]> = {
  // ========== ALIMENTAÇÃO ==========
  'Supermercado': [
    { keywords: ['supermercado', 'mercado', 'extra', 'carrefour', 'pão de açúcar', 'paodeacucar'], weight: 10 },
    { keywords: ['walmart', 'big', 'atacadão', 'assaí', 'makro'], weight: 10 },
    { keywords: ['compras', 'feira'], weight: 5 },
  ],
  'Restaurante': [
    { keywords: ['restaurante', 'lanchonete', 'pizzaria', 'churrascaria', 'hamburgueria'], weight: 10 },
    { keywords: ['almoço', 'jantar', 'refeição', 'comida'], weight: 7 },
    { keywords: ['mcdonald', 'burger king', 'subway', 'bobs'], weight: 9 },
  ],
  'Delivery': [
    { keywords: ['ifood', 'rappi', 'uber eats', 'delivery', 'entrega'], weight: 10 },
    { keywords: ['pedido', 'app'], weight: 5 },
  ],
  'Café': [
    { keywords: ['starbucks', 'café', 'cafeteria', 'coffee'], weight: 10 },
  ],
  'Padaria': [
    { keywords: ['padaria', 'panificadora', 'pão'], weight: 10 },
  ],
  'Bar': [
    { keywords: ['bar', 'boteco', 'pub', 'cervejaria'], weight: 10 },
    { keywords: ['cerveja', 'bebida'], weight: 6 },
  ],
  'Fast Food': [
    { keywords: ['fast food', 'lanche rápido'], weight: 10 },
  ],
  
  // ========== TRANSPORTE ==========
  'Combustível': [
    { keywords: ['posto', 'gasolina', 'etanol', 'diesel', 'combustível', 'alcool'], weight: 10 },
    { keywords: ['shell', 'ipiranga', 'petrobras', 'br', 'ale'], weight: 9 },
  ],
  'Uber/Taxi': [
    { keywords: ['uber', 'taxi', '99', 'cabify', '99pop'], weight: 10 },
    { keywords: ['corrida', 'transporte'], weight: 5 },
  ],
  'Ônibus': [
    { keywords: ['ônibus', 'onibus', 'bilhete único', 'bilhete', 'passagem'], weight: 10 },
  ],
  'Metrô': [
    { keywords: ['metrô', 'metro', 'metropolitano'], weight: 10 },
  ],
  'Estacionamento': [
    { keywords: ['estacionamento', 'parking', 'zona azul', 'vaga'], weight: 10 },
  ],
  'Pedágio': [
    { keywords: ['pedágio', 'pedagio', 'sem parar', 'veloe'], weight: 10 },
  ],
  'Manutenção Veículo': [
    { keywords: ['oficina', 'mecânico', 'manutenção', 'conserto', 'reparo'], weight: 10 },
    { keywords: ['troca de óleo', 'revisão', 'alinhamento', 'balanceamento'], weight: 9 },
  ],
  'Lavagem': [
    { keywords: ['lava rápido', 'lavagem', 'lava jato'], weight: 10 },
  ],
  'Seguro Veículo': [
    { keywords: ['seguro auto', 'seguro carro', 'seguro veículo'], weight: 10 },
  ],
  
  // ========== MORADIA ==========
  'Aluguel': [
    { keywords: ['aluguel', 'rent', 'locação'], weight: 10 },
  ],
  'Condomínio': [
    { keywords: ['condomínio', 'condominio', 'taxa condominial'], weight: 10 },
  ],
  'Água': [
    { keywords: ['água', 'agua', 'sabesp', 'saneamento', 'caesb', 'copasa'], weight: 10 },
  ],
  'Luz': [
    { keywords: ['luz', 'energia', 'enel', 'cemig', 'copel', 'eletricidade', 'light'], weight: 10 },
  ],
  'Gás': [
    { keywords: ['gás', 'gas', 'comgas', 'botijão'], weight: 10 },
  ],
  'Internet': [
    { keywords: ['internet', 'vivo fibra', 'claro', 'oi', 'tim', 'net', 'banda larga'], weight: 10 },
  ],
  'Telefone': [
    { keywords: ['telefone', 'celular', 'móvel', 'plano'], weight: 10 },
  ],
  'TV a Cabo': [
    { keywords: ['tv', 'sky', 'claro tv', 'oi tv'], weight: 10 },
  ],
  
  // ========== SAÚDE ==========
  'Farmácia': [
    { keywords: ['farmácia', 'farmacia', 'drogaria', 'droga raia', 'pacheco', 'drogasil'], weight: 10 },
    { keywords: ['remédio', 'remedio', 'medicamento'], weight: 8 },
  ],
  'Médico': [
    { keywords: ['médico', 'medico', 'consulta', 'clínica', 'clinica', 'doutor'], weight: 10 },
  ],
  'Dentista': [
    { keywords: ['dentista', 'odonto', 'ortodontia'], weight: 10 },
  ],
  'Plano de Saúde': [
    { keywords: ['plano de saúde', 'plano saude', 'unimed', 'amil', 'sulamerica'], weight: 10 },
  ],
  'Exames': [
    { keywords: ['exame', 'laboratório', 'laboratorio', 'análise'], weight: 10 },
  ],
  
  // ========== LAZER ==========
  'Cinema': [
    { keywords: ['cinema', 'cinemark', 'ingresso', 'filme'], weight: 10 },
  ],
  'Academia': [
    { keywords: ['academia', 'smartfit', 'bodytech', 'fitness', 'musculação'], weight: 10 },
  ],
  'Shows': [
    { keywords: ['show', 'concert', 'ingresso'], weight: 10 },
  ],
  'Teatro': [
    { keywords: ['teatro', 'peça'], weight: 10 },
  ],
  
  // ========== STREAMING ==========
  'Netflix': [
    { keywords: ['netflix'], weight: 10 },
  ],
  'Spotify': [
    { keywords: ['spotify'], weight: 10 },
  ],
  'Amazon Prime': [
    { keywords: ['amazon prime', 'prime video'], weight: 10 },
  ],
  'Disney+': [
    { keywords: ['disney', 'disney+', 'disney plus'], weight: 10 },
  ],
  'HBO Max': [
    { keywords: ['hbo', 'hbo max'], weight: 10 },
  ],
  'YouTube Premium': [
    { keywords: ['youtube premium', 'youtube'], weight: 10 },
  ],
  'Apple Music': [
    { keywords: ['apple music'], weight: 10 },
  ],
  
  // ========== COMPRAS ==========
  'Roupas': [
    { keywords: ['roupa', 'vestuário', 'loja', 'renner', 'c&a', 'riachuelo', 'zara', 'hering'], weight: 10 },
  ],
  'Calçados': [
    { keywords: ['sapato', 'tênis', 'tenis', 'calçado', 'centauro'], weight: 10 },
  ],
  'Eletrônicos': [
    { keywords: ['eletrônico', 'eletronico', 'magazine luiza', 'casas bahia', 'fast shop'], weight: 10 },
  ],
  'Informática': [
    { keywords: ['computador', 'notebook', 'mouse', 'teclado', 'kabum'], weight: 10 },
  ],
  
  // ========== PETS ==========
  'Veterinário': [
    { keywords: ['veterinário', 'veterinario', 'vet', 'pet shop'], weight: 10 },
  ],
  'Ração': [
    { keywords: ['ração', 'racao', 'comida pet'], weight: 10 },
  ],
  
  // ========== EDUCAÇÃO ==========
  'Mensalidade Escolar': [
    { keywords: ['escola', 'colégio', 'colegio', 'mensalidade'], weight: 10 },
  ],
  'Mensalidade Faculdade': [
    { keywords: ['faculdade', 'universidade', 'curso superior'], weight: 10 },
  ],
  'Curso Online': [
    { keywords: ['curso online', 'udemy', 'coursera', 'alura'], weight: 10 },
  ],
  'Livros': [
    { keywords: ['livro', 'livraria', 'amazon books'], weight: 10 },
  ],
  
  // ========== RECEITAS ==========
  'Salário': [
    { keywords: ['salário', 'salario', 'pagamento', 'vencimento'], weight: 10 },
  ],
  'Freelance': [
    { keywords: ['freelance', 'freela', 'bico'], weight: 10 },
  ],
  'Bônus': [
    { keywords: ['bônus', 'bonus', 'gratificação'], weight: 10 },
  ],
  '13º Salário': [
    { keywords: ['13º', '13 salário', 'décimo terceiro'], weight: 10 },
  ],
  'Dividendos': [
    { keywords: ['dividendo', 'ação', 'acao', 'bolsa'], weight: 10 },
  ],
  'Aluguel Recebido': [
    { keywords: ['aluguel recebido', 'locação recebida'], weight: 10 },
  ],
  'Reembolso': [
    { keywords: ['reembolso', 'devolução', 'estorno'], weight: 10 },
  ],
  'Cashback': [
    { keywords: ['cashback', 'cash back'], weight: 10 },
  ],
};
