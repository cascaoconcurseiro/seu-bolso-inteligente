// Dicionário de palavras-chave para categorização automática
// Estrutura: Conceito da Categoria → Array de { keywords, weight }

export interface KeywordGroup {
  keywords: string[];
  weight: number; // 1-10, maior = mais relevante
}

export const DEFAULT_KEYWORDS: Record<string, KeywordGroup[]> = {
  // ========== ALIMENTAÇÃO ==========
  'Supermercado': [
    { keywords: ['supermercado', 'mercado', 'extra', 'carrefour', 'pão de açúcar', 'paodeacucar', 'pao de acucar', 'sams club', 'samsclub', 'muffato', 'angeloni', 'zonaleste', 'zona sul', 'mundial', 'guanabara', 'giga', 'tenda', 'assai', 'assaí', 'atacadao', 'atacadão', 'makro', 'swift', 'obahortifruti', 'oba hortifruti', 'hortifruti', 'st marche', 'stmarche', 'dia%', 'supermercados'], weight: 10 },
    { keywords: ['compras', 'feira', 'sacolão', 'sacolao', 'minimercado', 'mercearia', 'açougue', 'acougue', 'peixaria', 'laticínios', 'rancho'], weight: 7 },
  ],
  'Restaurante': [
    { keywords: ['restaurante', 'lanchonete', 'pizzaria', 'churrascaria', 'hamburgueria', 'sushi', 'temakeria', 'trattoria', 'bistrô', 'bistro', 'gregrando', 'outback', 'madero', 'coco bambu', 'cocobambu', 'pobre juan', 'frango assado', 'parme', 'spoleto', 'gula gula'], weight: 10 },
    { keywords: ['almoço', 'jantar', 'refeição', 'comida', 'prato feito', 'marmita', 'marmitex', 'gastronomia', 'rodízio', 'rodizio'], weight: 8 },
  ],
  'Delivery': [
    { keywords: ['ifood', 'rappi', 'uber eats', 'ubereats', 'delivery', 'entrega', 'zé delivery', 'zedelivery', 'pedidosja', 'aki entrega', 'daki'], weight: 10 },
    { keywords: ['pedido', 'app de comida'], weight: 5 },
  ],
  'Café': [
    { keywords: ['starbucks', 'café', 'cafeteria', 'coffee', 'espresso', 'cappuccino', 'nespresso', 'chocolateria', 'cacau show', 'cacaushow', 'kopenhagen', 'ofner', 'dengo'], weight: 10 },
    { keywords: ['chá', 'cha', 'doceria', 'sorveteria', 'gelateria', 'bacio di latte', 'baciodilatte'], weight: 8 },
  ],
  'Padaria': [
    { keywords: ['padaria', 'panificadora', 'pão', 'confeitaria', 'panini', 'croissant', 'biscoito'], weight: 10 },
  ],
  'Bar': [
    { keywords: ['bar', 'boteco', 'pub', 'cervejaria', 'choperia', 'adega', 'empório', 'emporio', 'distribuidora de bebidas', 'whisky', 'gin', 'vodka'], weight: 10 },
    { keywords: ['cerveja', 'bebida', 'drinks', 'petiscos', 'balada', 'nightclub'], weight: 7 },
  ],
  'Fast Food': [
    { keywords: ['mcdonald', 'mc donald', 'mcdonalds', 'burger king', 'burgerking', 'subway', 'bobs', 'giraffas', 'habibs', 'habib\'s', 'kfc', 'popeyes', 'pizza hut', 'pizzahut', 'dominos', 'domino\'s'], weight: 10 },
    { keywords: ['fast food', 'fastfood', 'lanche rápido', 'batata frita', 'milkshake', 'nuggets'], weight: 8 },
  ],
  
  // ========== TRANSPORTE ==========
  'Combustível': [
    { keywords: ['posto', 'gasolina', 'etanol', 'diesel', 'combustível', 'combustivel', 'alcool', 'gnv'], weight: 10 },
    { keywords: ['shell', 'ipiranga', 'petrobras', 'br', 'ale', 'rodoil', 'sabbá'], weight: 9 },
  ],
  'Uber/Taxi': [
    { keywords: ['uber', 'taxi', 'táxi', '99', 'cabify', '99pop', '99taxi', 'indrive', 'indriver', 'easy taxi', 'easytaxi', 'driver'], weight: 10 },
    { keywords: ['corrida', 'transporte', 'app de transporte', 'carona'], weight: 6 },
  ],
  'Ônibus': [
    { keywords: ['ônibus', 'onibus', 'rodoviária', 'rodoviaria', 'passagem de ônibus', 'passagem onibus', 'buser', 'clickbus', 'quatrum', 'viacao', 'viação', 'cometa', '1001', 'sampaio'], weight: 10 },
    { keywords: ['bilhete único', 'bilhete', 'passagem', 'valetransporte', 'vale transporte'], weight: 7 },
  ],
  'Metrô': [
    { keywords: ['metrô', 'metro', 'metropolitano', 'cptm', 'supervia', 'estação metrô', 'estacao metro', 'bilhete metro'], weight: 10 },
  ],
  'Estacionamento': [
    { keywords: ['estacionamento', 'parking', 'zona azul', 'zonaazul', 'vaga', 'rotativo', 'estapar', 'multipark', 'indigo'], weight: 10 },
  ],
  'Pedágio': [
    { keywords: ['pedágio', 'pedagio', 'sem parar', 'semparar', 'veloe', 'conectcar', 'taggy', 'move mais', 'movemais', 'pedagios', 'tarifa pedagio'], weight: 10 },
  ],
  'Manutenção Veículo': [
    { keywords: ['oficina', 'mecânico', 'mecanico', 'manutenção', 'manutencao', 'conserto', 'reparo', 'autopeças', 'autopecas', 'auto center', 'autocenter', 'borracharia', 'pneu', 'funilaria', 'pintura auto'], weight: 10 },
    { keywords: ['troca de óleo', 'troca oleo', 'revisão car', 'revisao car', 'alinhamento', 'balanceamento', 'amortecedor', 'freio', 'bateria carro'], weight: 9 },
  ],
  'Lavagem': [
    { keywords: ['lava rápido', 'lava rapido', 'lavagem', 'lava jato', 'lavarapido', 'estética automotiva', 'ducha carro', 'higienização auto'], weight: 10 },
  ],
  'Seguro Veículo': [
    { keywords: ['seguro auto', 'seguro carro', 'seguro veículo', 'seguro veiculo', 'tokio marine', 'azul seguros', 'porto seguro auto', 'allianz auto'], weight: 10 },
  ],
  
  // ========== MORADIA ==========
  'Aluguel': [
    { keywords: ['aluguel', 'rent', 'locação', 'quinto andar', 'quintoandar', 'loft', 'imobiliária', 'imobiliaria', 'mensalidade aluguel'], weight: 10 },
  ],
  'Condomínio': [
    { keywords: ['condomínio', 'condominio', 'taxa condominial', 'boleto condominio', 'administradora condominio'], weight: 10 },
  ],
  'Água': [
    { keywords: ['água', 'agua', 'sabesp', 'saneamento', 'caesb', 'copasa', 'sanepar', 'cedae', 'embasa', 'corsan', 'cagece', 'saneago'], weight: 10 },
  ],
  'Luz': [
    { keywords: ['luz', 'energia', 'enel', 'cemig', 'copel', 'eletricidade', 'light', 'neoenergia', 'cpfl', 'celg', 'edp', 'equatorial', 'elektro'], weight: 10 },
  ],
  'Gás': [
    { keywords: ['gás', 'gas', 'comgas', 'comgás', 'botijão', 'botijao', 'supergasbras', 'ultragaz', 'liquigas', 'consigaz'], weight: 10 },
  ],
  'Internet': [
    { keywords: ['internet', 'vivo fibra', 'vivofibra', 'claro fibra', 'clarofibra', 'tim ultra', 'net virtua', 'virtua', 'banda larga', 'provedor internet', 'starlink', 'desktop internet'], weight: 10 },
  ],
  'Telefone': [
    { keywords: ['telefone', 'celular', 'móvel', 'movel', 'plano controle', 'recarga celular', 'tim controle', 'vivo controle', 'claro controle', 'oi movel'], weight: 10 },
  ],
  'TV a Cabo': [
    { keywords: ['tv a cabo', 'tv por assinatura', 'sky', 'claro tv', 'clarotv', 'oi tv', 'oitv', 'vivo tv'], weight: 10 },
  ],
  
  // ========== SAÚDE ==========
  'Farmácia': [
    { keywords: ['farmácia', 'farmacia', 'drogaria', 'droga raia', 'drogaraia', 'pacheco', 'drogasil', 'pague menos', 'paguemenos', 'são paulo', 'drogaria sao paulo', 'panvel', 'ultrafarma', 'bula', 'medicamentos'], weight: 10 },
    { keywords: ['remédio', 'remedio', 'medicamento', 'comprimido', 'xarope', 'pomada'], weight: 8 },
  ],
  'Médico': [
    { keywords: ['médico', 'medico', 'consulta', 'clínica', 'clinica', 'doutor', 'dr.', 'dra.', 'hospital', 'pronto socorro', 'ps', 'pediatra', 'cardiologista', 'ginecologista', 'dermatologista'], weight: 10 },
  ],
  'Dentista': [
    { keywords: ['dentista', 'odonto', 'ortodontia', 'canal dente', 'obturação', 'limpeza dente', 'extracao dente', 'aparelho dente', 'odontoprev', 'amil dental'], weight: 10 },
  ],
  'Plano de Saúde': [
    { keywords: ['plano de saúde', 'plano saude', 'convenio medico', 'convênio médico', 'unimed', 'amil', 'sulamerica', 'sulamérica', 'bradesco saude', 'bradesco saúde', 'notredame', 'intermedica', 'prevent senior', 'preventsenior', 'hapvida', 'golden cross'], weight: 10 },
  ],
  'Exames': [
    { keywords: ['exame', 'laboratório', 'laboratorio', 'análise', 'analise clinica', 'ultrassom', 'ressonância', 'tomografia', 'sangue', 'fleury', 'delboni', 'lavoisier', 'a+ medicina', 'sabin'], weight: 10 },
  ],
  
  // ========== LAZER ==========
  'Cinema': [
    { keywords: ['cinema', 'cinemark', 'cinepolis', 'cinepolis', 'uci', 'playarte', 'ingresso cinema', 'filme', 'ingresso.com'], weight: 10 },
  ],
  'Academia': [
    { keywords: ['academia', 'smartfit', 'smart fit', 'bodytech', 'fitness', 'musculação', 'crossfit', 'pilates', 'ioga', 'yoga', 'bluefit', 'blue fit', 'selfit', 'gympass', 'gym pass', 'totalpass', 'total pass'], weight: 10 },
  ],
  'Shows': [
    { keywords: ['show', 'concert', 'festival', 'ingressos show', 'tickets show', 'lollapalooza', 'rock in rio', 'rockinrio', 'eventim', 'sympla', 'ticketmaster', 'blueticket'], weight: 10 },
  ],
  'Teatro': [
    { keywords: ['teatro', 'peça', 'espetáculo', 'stand up', 'comédia standup'], weight: 10 },
  ],
  
  // ========== STREAMING ==========
  'Netflix': [
    { keywords: ['netflix', 'netflix.com'], weight: 10 },
  ],
  'Spotify': [
    { keywords: ['spotify', 'spotify.com', 'spotify premium'], weight: 10 },
  ],
  'Amazon Prime': [
    { keywords: ['amazon prime', 'prime video', 'amazonprime', 'primevideo'], weight: 10 },
  ],
  'Disney+': [
    { keywords: ['disney', 'disney+', 'disney plus', 'disneyplus', 'star+', 'starplus', 'star plus'], weight: 10 },
  ],
  'HBO Max': [
    { keywords: ['hbo', 'hbo max', 'hbomax', 'max.com', 'hbo assinatura'], weight: 10 },
  ],
  'YouTube Premium': [
    { keywords: ['youtube premium', 'youtube.com/premium', 'yt premium', 'google youtube'], weight: 10 },
  ],
  'Apple Music': [
    { keywords: ['apple music', 'apple.com/bill', 'itunes', 'icloud', 'apple cloud'], weight: 10 },
  ],
  
  // ========== COMPRAS ==========
  'Roupas': [
    { keywords: ['roupa', 'vestuário', 'vestuario', 'loja de roupas', 'renner', 'c&a', 'cea', 'riachuelo', 'zara', 'hering', 'shein', 'reserva', 'marisa', 'amaro', 'hope', 'john john', 'lelis blanc'], weight: 10 },
  ],
  'Calçados': [
    { keywords: ['sapato', 'tênis', 'tenis', 'calçado', 'calcado', 'bota', 'sandália', 'chinelo', 'havaianas', 'centauro', 'decathlon', 'netshoes', 'world tennis', 'authentic feet', 'anacapri', 'arezzo', 'schutz'], weight: 10 },
  ],
  'Eletrônicos': [
    { keywords: ['eletrônico', 'eletronico', 'magazine luiza', 'magalu', 'casas bahia', 'fast shop', 'fastshop', 'ponto frio', 'pontofrio', 'americanas', 'shoptime', 'submarino', 'polishop', 'xiaomi'], weight: 10 },
  ],
  'Informática': [
    { keywords: ['computador', 'notebook', 'mouse', 'teclado', 'monitor', 'kabum', 'pichau', 'terabyte', 'terabyteshop', 'dell', 'lenovo', 'gamer', 'placa de video', 'processador', 'hardware'], weight: 10 },
  ],
  
  // ========== PETS ==========
  'Veterinário': [
    { keywords: ['veterinário', 'veterinario', 'vet', 'clínica veterinária', 'hospital pet', 'consulta vet'], weight: 10 },
  ],
  'Ração': [
    { keywords: ['ração', 'racao', 'comida pet', 'petisco cão', 'alimentacao gato', 'royal canin', 'premier pet', 'golden ração'], weight: 10 },
  ],
  'Pet Shop': [
    { keywords: ['pet shop', 'petshop', 'cobasi', 'petz', 'petlove', 'banho e tosa', 'brinquedo pet', 'coleira', 'antipulgas', 'bravecto'], weight: 10 },
  ],
  
  // ========== EDUCAÇÃO ==========
  'Mensalidade Escolar': [
    { keywords: ['escola', 'colégio', 'colegio', 'mensalidade escolar', 'matricula escola', 'berçario', 'creche'], weight: 10 },
  ],
  'Mensalidade Faculdade': [
    { keywords: ['faculdade', 'universidade', 'pós-graduação', 'pos graduacao', 'mba', 'vestibular', 'mensalidade faculdade', 'estácio', 'puc', 'fgv', 'mackenzie', 'anhanguera', 'unip'], weight: 10 },
  ],
  'Curso Online': [
    { keywords: ['curso online', 'udemy', 'coursera', 'alura', 'hotmart', 'monetizze', 'eduzz', 'domestika', 'ebac', 'dio.me', 'balta.io', 'rocketseat'], weight: 10 },
  ],
  'Livros': [
    { keywords: ['livro', 'livraria', 'saraiva', 'cultura', 'amazon books', 'kindle', 'leitura', 'didático', 'apostila'], weight: 10 },
  ],
  
  // ========== RECEITAS ==========
  'Salário': [
    { keywords: ['salário', 'salario', 'pagamento', 'vencimento', 'folha', 'pro-labore', 'remuneração', 'remuneracao', 'transferência recebida salario', 'ted recebida', 'pix recebido salario', 'contra cheque', 'contracheque'], weight: 10 },
  ],
  'Freelance': [
    { keywords: ['freelance', 'freela', 'bico', 'prestação de serviços', 'mei', 'faturamento', 'honorários', 'workana', 'fiverr', '99freelas'], weight: 10 },
  ],
  'Bônus': [
    { keywords: ['bônus', 'bonus', 'gratificação', 'gratificacao', 'plr', 'participação nos lucros', 'premio desempenho', 'prêmio'], weight: 10 },
  ],
  '13º Salário': [
    { keywords: ['13º', '13 salario', '13º salário', 'décimo terceiro', 'decimo terceiro'], weight: 10 },
  ],
  'Dividendos': [
    { keywords: ['dividendo', 'ação', 'acao', 'bolsa de valores', 'rendimento fii', 'jcp', 'juros sobre capital', 'xp investimentos', 'btg pactual', 'clear corretora', 'rico corretora', 'nuinvest', 'inter investimentos'], weight: 10 },
  ],
  'Aluguel Recebido': [
    { keywords: ['aluguel recebido', 'locação recebida', 'rent recebido', 'quinto andar recebido'], weight: 10 },
  ],
  'Reembolso': [
    { keywords: ['reembolso', 'devolução', 'devolucao', 'estorno', 'retorno de pagamento', 'chargeback', 'reembolso despesa'], weight: 10 },
  ],
  'Cashback': [
    { keywords: ['cashback', 'cash back', 'ame digital', 'meliuz', 'méliuz', 'cashback nubank'], weight: 10 },
  ],
};

// Dicionário de Sinônimos e Conceitos (para traduzir conceitos globais às categorias dinâmicas dos usuários)
export const CONCEPT_SYNONYMS: Record<string, string[]> = {
  'Supermercado': ['supermercado', 'mercado', 'rancho', 'compras', 'feira', 'hortifruti', 'mercearia', 'alimentação', 'alimentacao', 'alimentos', 'comida', 'açougue', 'acougue'],
  'Restaurante': ['restaurante', 'lanchonete', 'pizzaria', 'churrascaria', 'hamburgueria', 'sushi', 'temakeria', 'alimentação', 'alimentacao', 'comida', 'rango', 'jantar', 'almoço'],
  'Delivery': ['delivery', 'ifood', 'rappi', 'entrega', 'alimentação', 'alimentacao', 'comida', 'rango', 'lanche'],
  'Café': ['café', 'cafe', 'cafeteria', 'coffee', 'doceria', 'sobremesa', 'sorveteria', 'chá', 'cha', 'alimentação', 'alimentacao'],
  'Padaria': ['padaria', 'panificadora', 'pão', 'pao', 'alimentação', 'alimentacao'],
  'Bar': ['bar', 'boteco', 'pub', 'cervejaria', 'adega', 'bebidas', 'lazer', 'diversão', 'diversao', 'balada'],
  'Fast Food': ['fast food', 'fastfood', 'lanche', 'hambúrguer', 'hamburguer', 'alimentação', 'alimentacao', 'comida'],
  
  'Combustível': ['combustível', 'combustivel', 'posto', 'gasolina', 'etanol', 'diesel', 'álcool', 'alcool', 'transporte', 'carro', 'veículo', 'veiculo'],
  'Uber/Taxi': ['uber', 'taxi', 'táxi', 'transporte', 'aplicativo', 'app', '99', 'locomoção', 'locomocao', 'corrida', 'viagem'],
  'Ônibus': ['ônibus', 'onibus', 'transporte', 'passagem', 'viagem', 'coletivo', 'buser'],
  'Metrô': ['metrô', 'metro', 'cptm', 'trem', 'transporte', 'passagem'],
  'Estacionamento': ['estacionamento', 'parking', 'vaga', 'zona azul', 'zonaazul', 'transporte', 'carro'],
  'Pedágio': ['pedágio', 'pedagio', 'sem parar', 'semparar', 'veloe', 'conectcar', 'transporte', 'carro', 'viagem'],
  'Manutenção Veículo': ['manutenção', 'manutencao', 'oficina', 'mecânico', 'mecanico', 'conserto', 'reparo', 'carro', 'veículo', 'veiculo', 'transporte', 'pneus'],
  'Lavagem': ['lavagem', 'lava', 'limpeza', 'carro', 'veículo', 'veiculo', 'transporte'],
  'Seguro Veículo': ['seguro', 'carro', 'veículo', 'veiculo', 'proteção', 'protecao', 'transporte'],
  
  'Aluguel': ['aluguel', 'rent', 'locação', 'locacao', 'moradia', 'habitação', 'habitacao', 'casa', 'apartamento'],
  'Condomínio': ['condomínio', 'condominio', 'taxa', 'moradia', 'casa', 'apartamento'],
  'Água': ['água', 'agua', 'saneamento', 'sabesp', 'moradia', 'utilidades', 'contas', 'fixas'],
  'Luz': ['luz', 'energia', 'eletricidade', 'enel', 'moradia', 'utilidades', 'contas', 'fixas'],
  'Gás': ['gás', 'gas', 'comgas', 'botijão', 'botijao', 'moradia', 'utilidades', 'contas', 'fixas'],
  'Internet': ['internet', 'banda larga', 'fibra', 'wifi', 'moradia', 'utilidades', 'contas', 'fixas', 'assinaturas', 'streaming'],
  'Telefone': ['telefone', 'celular', 'móvel', 'movel', 'plano', 'moradia', 'utilidades', 'contas'],
  'TV a Cabo': ['tv', 'cabo', 'assinatura', 'moradia', 'utilidades', 'contas', 'lazer', 'entretenimento'],
  
  'Farmácia': ['farmácia', 'farmacia', 'drogaria', 'remédios', 'remedios', 'medicamentos', 'saúde', 'saude', 'higiene'],
  'Médico': ['médico', 'medico', 'consulta', 'doutor', 'hospital', 'saúde', 'saude', 'clínica', 'clinica'],
  'Dentista': ['dentista', 'odonto', 'dente', 'saúde', 'saude'],
  'Plano de Saúde': ['plano', 'saúde', 'saude', 'convênio', 'convenio', 'seguro'],
  'Exames': ['exames', 'laboratório', 'laboratorio', 'saúde', 'saude', 'análise', 'analise'],
  
  'Cinema': ['cinema', 'filme', 'lazer', 'entretenimento', 'diversão', 'diversao'],
  'Academia': ['academia', 'fitness', 'exercício', 'exercicio', 'esporte', 'lazer', 'saúde', 'saude', 'crossfit'],
  'Shows': ['shows', 'show', 'festival', 'concert', 'ingressos', 'lazer', 'entretenimento', 'diversão', 'diversao', 'música', 'musica'],
  'Teatro': ['teatro', 'peça', 'peca', 'lazer', 'entretenimento', 'diversão', 'diversao'],
  
  'Netflix': ['netflix', 'streaming', 'assinatura', 'assinaturas', 'lazer', 'entretenimento', 'tv', 'vídeo', 'video'],
  'Spotify': ['spotify', 'streaming', 'assinatura', 'assinaturas', 'lazer', 'entretenimento', 'música', 'musica'],
  'Amazon Prime': ['amazon', 'prime', 'streaming', 'assinatura', 'assinaturas', 'lazer', 'entretenimento', 'compras'],
  'Disney+': ['disney', 'streaming', 'assinatura', 'assinaturas', 'lazer', 'entretenimento', 'tv'],
  'HBO Max': ['hbo', 'max', 'streaming', 'assinatura', 'assinaturas', 'lazer', 'entretenimento', 'tv'],
  'YouTube Premium': ['youtube', 'yt', 'streaming', 'assinatura', 'assinaturas', 'lazer', 'entretenimento'],
  'Apple Music': ['apple', 'itunes', 'icloud', 'streaming', 'assinatura', 'assinaturas', 'lazer', 'tecnologia'],
  
  'Roupas': ['roupas', 'roupa', 'vestuário', 'vestuario', 'moda', 'loja', 'compras', 'shopping'],
  'Calçados': ['calçados', 'calcados', 'sapatos', 'tenis', 'tênis', 'compras', 'shopping', 'esporte'],
  'Eletrônicos': ['eletrônicos', 'eletronicos', 'tecnologia', 'eletro', 'eletrodomésticos', 'compras', 'shopping'],
  'Informática': ['informática', 'informatica', 'computador', 'tecnologia', 'hardware', 'compras', 'gamer'],
  
  'Veterinário': ['veterinário', 'veterinario', 'vet', 'pets', 'animais', 'saúde pet', 'saude pet'],
  'Ração': ['ração', 'racao', 'comida', 'pets', 'animais', 'cão', 'gato'],
  'Pet Shop': ['pet shop', 'petshop', 'pets', 'animais', 'cão', 'gato', 'banho', 'tosa'],
  
  'Mensalidade Escolar': ['escola', 'colégio', 'colegio', 'educação', 'educacao', 'filhos'],
  'Mensalidade Faculdade': ['faculdade', 'universidade', 'pós', 'pos', 'graduação', 'graduacao', 'educação', 'educacao', 'estudos'],
  'Curso Online': ['curso', 'cursos', 'online', 'udemy', 'alura', 'educação', 'educacao', 'estudos', 'internet'],
  'Livros': ['livros', 'livro', 'leitura', 'educação', 'educacao', 'estudos', 'livraria'],
  
  'Salário': ['salário', 'salario', 'pagamento', 'trabalho', 'vencimento', 'remuneração', 'remuneracao', 'receita', 'rendimentos'],
  'Freelance': ['freelance', 'freela', 'bico', 'trabalho', 'receita', 'rendimentos', 'serviços', 'servicos'],
  'Bônus': ['bônus', 'bonus', 'plr', 'participação', 'receita', 'rendimentos', 'trabalho', 'prêmio', 'premio'],
  '13º Salário': ['13º', 'décimo', 'decimo', 'receita', 'rendimentos', 'trabalho'],
  'Dividendos': ['dividendos', 'rendimentos', 'investimentos', 'bolsa', 'ações', 'acoes', 'fii', 'juros', 'receita'],
  'Aluguel Recebido': ['aluguel', 'recebido', 'renda', 'receita', 'rendimentos', 'moradia'],
  'Reembolso': ['reembolso', 'devolução', 'devolucao', 'estorno', 'receita', 'ajuste'],
  'Cashback': ['cashback', 'receita', 'renda', 'bônus', 'bonus', 'ajuste'],
};

// Dicionário deEmojis Associados aos Conceitos (para busca visual)
export const CONCEPT_EMOJIS: Record<string, string[]> = {
  'Supermercado': ['🛒', '🥦', '🥬', '🍎', '🥩', '🥚'],
  'Restaurante': ['🍽️', '🍝', '🍕', '🍣', '🥩', '🍛'],
  'Delivery': ['🍕', '🍔', '🛵', '📦', '🥡'],
  'Café': ['☕', '🍵', '🍩', '🍰', '🍫'],
  'Padaria': ['🥖', '🍞', '🥐', '🥯'],
  'Bar': ['🍺', '🍻', '🍹', '🍷', '🥂'],
  'Fast Food': ['🍟', '🍔', '🌭', '🥤'],
  
  'Combustível': ['⛽', '🚗', '⚡'],
  'Uber/Taxi': ['🚕', '🚗', '🚙', '🚘'],
  'Ônibus': ['🚌', '🚍'],
  'Metrô': ['🚇', '🚊', '🚂'],
  'Estacionamento': ['🅿️', '🚗'],
  'Pedágio': ['🛣️', '🚧'],
  'Manutenção Veículo': ['🔧', '🔩', '🔨', '🚗'],
  'Lavagem': ['🚿', '🧼', '🧽', '🚗'],
  'Seguro Veículo': ['🛡️', '🚗'],
  
  'Aluguel': ['🏠', '🔑', '🏢'],
  'Condomínio': ['🏢', '🏘️'],
  'Água': ['💧', '🚰', '🚿'],
  'Luz': ['💡', '🔌', '⚡'],
  'Gás': ['🔥', '🍳'],
  'Internet': ['🌐', '💻', '📶'],
  'Telefone': ['📱', '📞', '☎️'],
  'TV a Cabo': ['📺', '🎬'],
  
  'Farmácia': ['💊', '🩹', '🧴', '🩺'],
  'Médico': ['👨‍⚕️', '👩‍⚕️', '🏥', '🩺'],
  'Dentista': ['🦷', '🪥', '🪞'],
  'Plano de Saúde': ['🏥', '🛡️', '📋'],
  'Exames': ['🔬', '🧪', '🩸'],
  
  'Cinema': ['🎬', '🍿', '🎥'],
  'Teatro': ['🎭', '🎟️'],
  'Shows': ['🎸', '🎤', '🎵', '🎟️', '🕺'],
  'Academia': ['💪', '🏋️‍♂️', '🏃‍♂️', '🧘', '👟'],
  
  'Netflix': ['🎬', '🍿', '📺'],
  'Spotify': ['🎵', '🎶', '🎧'],
  'Amazon Prime': ['📦', '🎬', '🚚'],
  
  'Roupas': ['👕', '👚', '👗', '👖', '🧥'],
  'Calçados': ['👟', '👠', '👞', '👢', '🩴'],
  'Eletrônicos': ['📱', '📺', '🔌', '🎮'],
  'Informática': ['💻', '🖥️', '⌨️', '🖱️'],
  
  'Veterinário': ['🐕', '🐈', '🩺', '🏥'],
  'Ração': ['🦴', '🐟', '🥣'],
  'Pet Shop': ['🐾', '🎾', '🧼'],
  
  'Mensalidade Escolar': ['🎓', '🎒', '✏️'],
  'Mensalidade Faculdade': ['🏫', '🎓', '📚'],
  'Curso Online': ['💻', '🎓', '🎥'],
  'Livros': ['📖', '📚', '📘'],
  
  'Salário': ['💰', '💵', '💼', '🏦'],
  'Freelance': ['💻', '💸', '🛠️'],
  'Bônus': ['🎯', '🏆', '💎'],
  '13º Salário': ['💵', '🎁'],
  'Dividendos': ['📈', '📊', '💸'],
  'Aluguel Recebido': ['🏠', '🔑', '📈'],
  'Reembolso': [' Estorno', '💳', '🔄'],
  'Cashback': ['💰', '🪙', '🔙'],
};
