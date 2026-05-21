export interface AbroadAsset {
  ticker: string;
  name: string;
  sector: string;
  type: 'STOCK' | 'REIT' | 'ETF' | 'OTHER';
}

export const ABROAD_ASSETS: AbroadAsset[] = [
  // Big Tech
  { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Tecnologia', type: 'STOCK' },
  { ticker: 'MSFT', name: 'Microsoft Corp.', sector: 'Tecnologia', type: 'STOCK' },
  { ticker: 'GOOGL', name: 'Alphabet Inc. (Google)', sector: 'Tecnologia', type: 'STOCK' },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', sector: 'Varejo', type: 'STOCK' },
  { ticker: 'META', name: 'Meta Platforms Inc. (Facebook)', sector: 'Tecnologia', type: 'STOCK' },
  { ticker: 'TSLA', name: 'Tesla Inc.', sector: 'Automobilístico', type: 'STOCK' },
  { ticker: 'NVDA', name: 'Nvidia Corp.', sector: 'Semicondutores', type: 'STOCK' },
  { ticker: 'NFLX', name: 'Netflix Inc.', sector: 'Entretenimento', type: 'STOCK' },
  
  // Financeiro
  { ticker: 'V', name: 'Visa Inc.', sector: 'Financeiro', type: 'STOCK' },
  { ticker: 'MA', name: 'Mastercard Inc.', sector: 'Financeiro', type: 'STOCK' },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Bancos', type: 'STOCK' },
  { ticker: 'BAC', name: 'Bank of America Corp.', sector: 'Bancos', type: 'STOCK' },
  { ticker: 'GS', name: 'Goldman Sachs Group', sector: 'Bancos', type: 'STOCK' },
  { ticker: 'BRK.B', name: 'Berkshire Hathaway Inc.', sector: 'Holdings', type: 'STOCK' },
  
  // REITs
  { ticker: 'O', name: 'Realty Income Corp.', sector: 'Imobiliário', type: 'REIT' },
  { ticker: 'AMT', name: 'American Tower Corp.', sector: 'Imobiliário', type: 'REIT' },
  { ticker: 'PLD', name: 'Prologis Inc.', sector: 'Imobiliário', type: 'REIT' },
  { ticker: 'CCI', name: 'Crown Castle Inc.', sector: 'Imobiliário', type: 'REIT' },
  { ticker: 'VICI', name: 'VICI Properties Inc.', sector: 'Imobiliário', type: 'REIT' },
  { ticker: 'EQIX', name: 'Equinix Inc.', sector: 'Imobiliário', type: 'REIT' },
  { ticker: 'DLR', name: 'Digital Realty Trust', sector: 'Imobiliário', type: 'REIT' },
  { ticker: 'PSA', name: 'Public Storage', sector: 'Imobiliário', type: 'REIT' },
  { ticker: 'SPG', name: 'Simon Property Group', sector: 'Imobiliário', type: 'REIT' },
  { ticker: 'STAG', name: 'STAG Industrial Inc.', sector: 'Imobiliário', type: 'REIT' },
  
  // ETFs
  { ticker: 'VOO', name: 'Vanguard S&P 500 ETF', sector: 'Índice EUA', type: 'ETF' },
  { ticker: 'IVV', name: 'iShares Core S&P 500 ETF', sector: 'Índice EUA', type: 'ETF' },
  { ticker: 'QQQ', name: 'Invesco QQQ Trust (Nasdaq 100)', sector: 'Tecnologia', type: 'ETF' },
  { ticker: 'VTI', name: 'Vanguard Total Stock Market ETF', sector: 'Índice EUA', type: 'ETF' },
  { ticker: 'VXUS', name: 'Vanguard Total International Stock ETF', sector: 'Global', type: 'ETF' },
  { ticker: 'SCHD', name: 'Schwab US Dividend Equity ETF', sector: 'Dividendos', type: 'ETF' },
  { ticker: 'VNQ', name: 'Vanguard Real Estate ETF', sector: 'Imobiliário', type: 'ETF' },
  { ticker: 'VYM', name: 'Vanguard High Dividend Yield ETF', sector: 'Dividendos', type: 'ETF' },
  { ticker: 'ARKK', name: 'ARK Innovation ETF', sector: 'Inovação', type: 'ETF' },
];

export const classifyAbroadAsset = (ticker: string): { type: 'STOCK' | 'REIT' | 'ETF' | 'OTHER', sector: string } => {
  const t = ticker.toUpperCase().trim();
  
  const found = ABROAD_ASSETS.find(s => s.ticker === t);
  if (found) return { type: found.type, sector: found.sector };

  // Heurísticas básicas para mercado americano
  if (t.length > 0 && t.length <= 4) {
    // A maioria das stocks tem 1-4 letras
    return { type: 'STOCK', sector: 'Outros' };
  }

  return { type: 'OTHER', sector: 'Outros' };
};

export const searchAbroadAssets = (query: string): AbroadAsset[] => {
  if (!query || query.length < 1) return [];
  const q = query.toUpperCase().trim();
  
  const results = ABROAD_ASSETS.filter(
    s => s.ticker.startsWith(q) || s.name.toUpperCase().includes(q)
  );

  if (results.length === 0 && q.length >= 1) {
    const classification = classifyAbroadAsset(q);
    if (classification.type !== 'OTHER') {
      return [{
        ticker: q,
        name: `Ativo detectado: ${q}`,
        sector: classification.sector,
        type: classification.type as any
      }];
    }
  }

  return results.slice(0, 8);
};
