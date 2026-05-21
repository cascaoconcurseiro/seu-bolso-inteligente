// ============================================================
// AÇÕES BRASILEIRAS - B3
// Top 100+ ações mais negociadas para autocomplete
// ============================================================

export interface BrazilianStock {
  ticker: string;
  name: string;
  sector: string;
  type: 'STOCK' | 'FII' | 'ETF';
}

export const BRAZILIAN_STOCKS: BrazilianStock[] = [
  // IBOVESPA - Ações
  { ticker: 'PETR4', name: 'Petrobras PN', sector: 'Petróleo e Gás', type: 'STOCK' },
  { ticker: 'PETR3', name: 'Petrobras ON', sector: 'Petróleo e Gás', type: 'STOCK' },
  { ticker: 'VALE3', name: 'Vale ON', sector: 'Mineração', type: 'STOCK' },
  { ticker: 'ITUB4', name: 'Itaú Unibanco PN', sector: 'Bancos', type: 'STOCK' },
  { ticker: 'BBDC4', name: 'Bradesco PN', sector: 'Bancos', type: 'STOCK' },
  { ticker: 'BBDC3', name: 'Bradesco ON', sector: 'Bancos', type: 'STOCK' },
  { ticker: 'BBAS3', name: 'Banco do Brasil ON', sector: 'Bancos', type: 'STOCK' },
  { ticker: 'ABEV3', name: 'Ambev ON', sector: 'Bebidas', type: 'STOCK' },
  { ticker: 'WEGE3', name: 'WEG ON', sector: 'Bens de Capital', type: 'STOCK' },
  { ticker: 'RENT3', name: 'Localiza ON', sector: 'Locação de Veículos', type: 'STOCK' },
  { ticker: 'LREN3', name: 'Lojas Renner ON', sector: 'Varejo', type: 'STOCK' },
  { ticker: 'MGLU3', name: 'Magazine Luiza ON', sector: 'Varejo', type: 'STOCK' },
  { ticker: 'VVAR3', name: 'Americanas ON', sector: 'Varejo', type: 'STOCK' },
  { ticker: 'JBSS3', name: 'JBS ON', sector: 'Alimentos e Bebidas', type: 'STOCK' },
  { ticker: 'BEEF3', name: 'Minerva Foods ON', sector: 'Alimentos e Bebidas', type: 'STOCK' },
  { ticker: 'MRFG3', name: 'Marfrig ON', sector: 'Alimentos e Bebidas', type: 'STOCK' },
  { ticker: 'BRFS3', name: 'BRF ON', sector: 'Alimentos e Bebidas', type: 'STOCK' },
  { ticker: 'SUZB3', name: 'Suzano ON', sector: 'Papel e Celulose', type: 'STOCK' },
  { ticker: 'KLBN11', name: 'Klabin UNT', sector: 'Papel e Celulose', type: 'STOCK' },
  { ticker: 'CSAN3', name: 'Cosan ON', sector: 'Combustíveis e Lubrificantes', type: 'STOCK' },
  { ticker: 'RAIL3', name: 'Rumo ON', sector: 'Transporte Ferroviário', type: 'STOCK' },
  { ticker: 'RADL3', name: 'Raia Drogasil ON', sector: 'Farmácias', type: 'STOCK' },
  { ticker: 'HAPV3', name: 'Hapvida ON', sector: 'Saúde', type: 'STOCK' },
  { ticker: 'GNDI3', name: 'Grupo NotreDame Intermédica ON', sector: 'Saúde', type: 'STOCK' },
  { ticker: 'RDOR3', name: 'Rede D\'Or ON', sector: 'Saúde', type: 'STOCK' },
  { ticker: 'FLRY3', name: 'Fleury ON', sector: 'Saúde', type: 'STOCK' },
  { ticker: 'QUAL3', name: 'Qualicorp ON', sector: 'Saúde', type: 'STOCK' },
  { ticker: 'SBSP3', name: 'Sabesp ON', sector: 'Saneamento', type: 'STOCK' },
  { ticker: 'CPFE3', name: 'CPFL Energia ON', sector: 'Energia Elétrica', type: 'STOCK' },
  { ticker: 'EGIE3', name: 'Engie Brasil ON', sector: 'Energia Elétrica', type: 'STOCK' },
  { ticker: 'ENEV3', name: 'Eneva ON', sector: 'Energia Elétrica', type: 'STOCK' },
  { ticker: 'CMIG4', name: 'Cemig PN', sector: 'Energia Elétrica', type: 'STOCK' },
  { ticker: 'ELET3', name: 'Eletrobras ON', sector: 'Energia Elétrica', type: 'STOCK' },
  { ticker: 'ELET6', name: 'Eletrobras PNB', sector: 'Energia Elétrica', type: 'STOCK' },
  { ticker: 'TAEE11', name: 'Taesa UNT', sector: 'Energia Elétrica', type: 'STOCK' },
  { ticker: 'TRPL4', name: 'Cteep PN', sector: 'Energia Elétrica', type: 'STOCK' },
  { ticker: 'EQTL3', name: 'Equatorial Energia ON', sector: 'Energia Elétrica', type: 'STOCK' },
  { ticker: 'GOAU4', name: 'Gerdau Met PN', sector: 'Siderurgia', type: 'STOCK' },
  { ticker: 'GGBR4', name: 'Gerdau PN', sector: 'Siderurgia', type: 'STOCK' },
  { ticker: 'CSNA3', name: 'CSN ON', sector: 'Siderurgia', type: 'STOCK' },
  { ticker: 'USIM5', name: 'Usiminas PNA', sector: 'Siderurgia', type: 'STOCK' },
  { ticker: 'PRIO3', name: 'PetroRio ON', sector: 'Petróleo e Gás', type: 'STOCK' },
  { ticker: 'RRRP3', name: '3R Petroleum ON', sector: 'Petróleo e Gás', type: 'STOCK' },
  { ticker: 'RECV3', name: 'PetroReconcavo ON', sector: 'Petróleo e Gás', type: 'STOCK' },
  { ticker: 'LWSA3', name: 'Locaweb ON', sector: 'Tecnologia', type: 'STOCK' },
  { ticker: 'TOTS3', name: 'Totvs ON', sector: 'Tecnologia', type: 'STOCK' },
  { ticker: 'INTB3', name: 'Intelbras ON', sector: 'Tecnologia', type: 'STOCK' },
  { ticker: 'BPAC11', name: 'BTG Pactual UNT', sector: 'Bancos', type: 'STOCK' },
  { ticker: 'SANB11', name: 'Santander UNT', sector: 'Bancos', type: 'STOCK' },
  { ticker: 'ITSA4', name: 'Itaúsa PN', sector: 'Holdings', type: 'STOCK' },
  { ticker: 'B3SA3', name: 'B3 ON', sector: 'Serviços Financeiros', type: 'STOCK' },
  { ticker: 'COGN3', name: 'Cogna ON', sector: 'Educação', type: 'STOCK' },
  { ticker: 'YDUQ3', name: 'Yduqs ON', sector: 'Educação', type: 'STOCK' },
  { ticker: 'ANIM3', name: 'Ânima Educação ON', sector: 'Educação', type: 'STOCK' },
  { ticker: 'POSI3', name: 'Positivo Tecnologia ON', sector: 'Tecnologia', type: 'STOCK' },
  { ticker: 'CASH3', name: 'Méliuz ON', sector: 'Tecnologia', type: 'STOCK' },
  { ticker: 'MELI34', name: 'MercadoLibre DR', sector: 'E-commerce', type: 'STOCK' },
  { ticker: 'ALZR11', name: 'Alianza Trust Renda Imobiliária FII', sector: 'Imobiliário', type: 'FII' },
  { ticker: 'BCFF11', name: 'BC FII', sector: 'Imobiliário', type: 'FII' },
  { ticker: 'BTLG11', name: 'BTG Pactual Logística FII', sector: 'Imobiliário', type: 'FII' },
  { ticker: 'CSHG11', name: 'CSHG Logística FII', sector: 'Imobiliário', type: 'FII' },
  { ticker: 'HGLG11', name: 'CSHG Logística FII', sector: 'Imobiliário', type: 'FII' },
  { ticker: 'HGRE11', name: 'CSHG Real Estate FII', sector: 'Imobiliário', type: 'FII' },
  { ticker: 'HSML11', name: 'HSI Malls FII', sector: 'Imobiliário', type: 'FII' },
  { ticker: 'KNRI11', name: 'Kinea Renda Imobiliária FII', sector: 'Imobiliário', type: 'FII' },
  { ticker: 'MXRF11', name: 'Maxi Renda FII', sector: 'Imobiliário', type: 'FII' },
  { ticker: 'RBRF11', name: 'RBR Alpha Fundo de Fundos FII', sector: 'Imobiliário', type: 'FII' },
  { ticker: 'VGIP11', name: 'Valora CRI Índice de Preços FII', sector: 'Imobiliário', type: 'FII' },
  { ticker: 'VISC11', name: 'Vinci Shopping Centers FII', sector: 'Imobiliário', type: 'FII' },
  { ticker: 'XPML11', name: 'XP Malls FII', sector: 'Imobiliário', type: 'FII' },
  { ticker: 'XPLG11', name: 'XP Log FII', sector: 'Imobiliário', type: 'FII' },
  // ETFs BR
  { ticker: 'BOVA11', name: 'iShares Ibovespa ETF', sector: 'Índice', type: 'ETF' },
  { ticker: 'IVVB11', name: 'iShares S&P 500 ETF (BRL)', sector: 'Índice EUA', type: 'ETF' },
  { ticker: 'SMAL11', name: 'iShares Small Cap ETF', sector: 'Índice', type: 'ETF' },
  { ticker: 'DIVO11', name: 'iShares Dividendos ETF', sector: 'Dividendos', type: 'ETF' },
  { ticker: 'ISUS11', name: 'iShares ESG ETF', sector: 'ESG', type: 'ETF' },
  { ticker: 'SPXI11', name: 'Trend S&P 500 ETF', sector: 'Índice EUA', type: 'ETF' },
  { ticker: 'XINA11', name: 'BNP China ETF', sector: 'Índice China', type: 'ETF' },
  { ticker: 'HASH11', name: 'Hashdex Cripto ETF', sector: 'Criptomoedas', type: 'ETF' },
  { ticker: 'GOLD11', name: 'Trend Ouro ETF', sector: 'Commodities', type: 'ETF' },
  { ticker: 'TRIG11', name: 'Trend ESG Global ETF', sector: 'ESG', type: 'ETF' },
  // Ações Adicionais
  { ticker: 'BBSE3', name: 'BB Seguridade ON', sector: 'Seguros', type: 'STOCK' },
  { ticker: 'IRBR3', name: 'IRB Brasil RE ON', sector: 'Seguros', type: 'STOCK' },
  { ticker: 'CIEL3', name: 'Cielo ON', sector: 'Serviços Financeiros', type: 'STOCK' },
  { ticker: 'GOLL4', name: 'Gol PN', sector: 'Aéreo', type: 'STOCK' },
  { ticker: 'AZUL4', name: 'Azul PN', sector: 'Aéreo', type: 'STOCK' },
  { ticker: 'CSMG3', name: 'Copasa ON', sector: 'Saneamento', type: 'STOCK' },
  { ticker: 'ENGI11', name: 'Energisa UNT', sector: 'Energia Elétrica', type: 'STOCK' },
  { ticker: 'VIVT3', name: 'Vivo ON', sector: 'Telecomunicações', type: 'STOCK' },
  { ticker: 'TIMS3', name: 'TIM ON', sector: 'Telecomunicações', type: 'STOCK' },
  { ticker: 'EMBR3', name: 'Embraer ON', sector: 'Bens de Capital', type: 'STOCK' },
  { ticker: 'TEND3', name: 'Tenda ON', sector: 'Construção Civil', type: 'STOCK' },
  { ticker: 'CYRE3', name: 'Cyrela ON', sector: 'Construção Civil', type: 'STOCK' },
  { ticker: 'EZTC3', name: 'EZTEC ON', sector: 'Construção Civil', type: 'STOCK' },
  { ticker: 'MRVE3', name: 'MRV ON', sector: 'Construção Civil', type: 'STOCK' },
  { ticker: 'JHSF3', name: 'JHSF ON', sector: 'Imobiliário', type: 'STOCK' },
  { ticker: 'STBP3', name: 'Santos Brasil ON', sector: 'Logística', type: 'STOCK' },
  { ticker: 'UGPA3', name: 'Ultrapar ON', sector: 'Combustíveis', type: 'STOCK' },
  { ticker: 'BRKM5', name: 'Braskem PNA', sector: 'Petroquímica', type: 'STOCK' },
  { ticker: 'AMER3', name: 'Americanas ON', sector: 'Varejo', type: 'STOCK' },
  { ticker: 'BHIA3', name: 'Casas Bahia ON', sector: 'Varejo', type: 'STOCK' },
  
  // FIIs Adicionais
  { ticker: 'KNIP11', name: 'Kinea Índices de Preços FII', sector: 'Imobiliário', type: 'FII' },
  { ticker: 'KNCR11', name: 'Kinea Rendimentos Imobiliários FII', sector: 'Imobiliário', type: 'FII' },
  { ticker: 'CPTS11', name: 'Capitânia Securities II FII', sector: 'Imobiliário', type: 'FII' },
  { ticker: 'IRDM11', name: 'Iridium Recebíveis Imobiliários FII', sector: 'Imobiliário', type: 'FII' },
  { ticker: 'RECT11', name: 'UBS (BR) Office FII', sector: 'Imobiliário', type: 'FII' },
  { ticker: 'BRCR11', name: 'BC Fund FII', sector: 'Imobiliário', type: 'FII' },
  { ticker: 'JSRE11', name: 'JS Real Estate Multigestão FII', sector: 'Imobiliário', type: 'FII' },
  { ticker: 'GGRC11', name: 'GGR Covepi Renda FII', sector: 'Imobiliário', type: 'FII' },
  { ticker: 'HGBS11', name: 'Hedge Brasil Shopping FII', sector: 'Imobiliário', type: 'FII' },
  { ticker: 'HGPO11', name: 'CSHG Prime Offices FII', sector: 'Imobiliário', type: 'FII' },
  { ticker: 'HGRU11', name: 'CSHG Renda Urbana FII', sector: 'Imobiliário', type: 'FII' },
  { ticker: 'TGAR11', name: 'TG Ativo Real FII', sector: 'Imobiliário', type: 'FII' },
  { ticker: 'DEVA11', name: 'Devant Recebíveis Imobiliários FII', sector: 'Imobiliário', type: 'FII' },
  { ticker: 'VSLH11', name: 'Versalhes Recebíveis Imobiliários FII', sector: 'Imobiliário', type: 'FII' },
  { ticker: 'TORD11', name: 'Tordesilhas EI FII', sector: 'Imobiliário', type: 'FII' },
  { ticker: 'GALG11', name: 'Guardian Logística FII', sector: 'Imobiliário', type: 'FII' },
  { ticker: 'MALL11', name: 'Malls Brasil Plural FII', sector: 'Imobiliário', type: 'FII' },
  { ticker: 'VRTA11', name: 'Fator Veritá FII', sector: 'Imobiliário', type: 'FII' },
];

/**
 * Heurística para classificar ativos brasileiros baseada no ticker
 */
export const classifyBrazilianAsset = (ticker: string): { type: 'STOCK' | 'FII' | 'ETF' | 'OTHER', sector: string } => {
  const t = ticker.toUpperCase().trim();
  
  // Se estiver na lista oficial, retorna os dados da lista
  const found = BRAZILIAN_STOCKS.find(s => s.ticker === t);
  if (found) return { type: found.type, sector: found.sector };

  // Heurísticas baseadas no sufixo da B3
  if (t.endsWith('11')) {
    // 11 costuma ser FII, ETF ou UNIT (Stock)
    // Na dúvida, se tem 4 letras + 11 e não é conhecido, probabilidade alta de FII
    if (/^[A-Z]{4}11$/.test(t)) {
      return { type: 'FII', sector: 'Imobiliário' };
    }
    return { type: 'ETF', sector: 'Índice' };
  }

  if (/[A-Z]{4}[3456]/.test(t)) {
    return { type: 'STOCK', sector: 'Outros' };
  }

  if (t.endsWith('34')) {
    return { type: 'STOCK', sector: 'BDR' };
  }

  return { type: 'OTHER', sector: 'Outros' };
};

export const searchBrazilianStocks = (query: string): BrazilianStock[] => {
  if (!query || query.length < 2) return [];
  const q = query.toUpperCase().trim();
  
  // Busca na lista
  const results = BRAZILIAN_STOCKS.filter(
    s => s.ticker.startsWith(q) || s.name.toUpperCase().includes(q)
  );

  // Se não encontrou nada na lista, mas o ticker parece válido, sugere classificação automática
  if (results.length === 0 && q.length >= 4) {
    const classification = classifyBrazilianAsset(q);
    if (classification.type !== 'OTHER') {
      return [{
        ticker: q,
        name: `Ativo detectado: ${q}`,
        sector: classification.sector,
        type: classification.type as any
      }];
    }
  }

  return results.slice(0, 8); // max 8 sugestões
};
