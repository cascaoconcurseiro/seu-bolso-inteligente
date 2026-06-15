export interface CryptoAsset {
  ticker: string;
  name: string;
  sector: string;
  type: 'CRYPTO';
}

export const CRYPTO_ASSETS: CryptoAsset[] = [
  { ticker: 'BTC', name: 'Bitcoin', sector: 'Criptomoedas', type: 'CRYPTO' },
  { ticker: 'ETH', name: 'Ethereum', sector: 'Criptomoedas', type: 'CRYPTO' },
  { ticker: 'USDT', name: 'Tether', sector: 'Stablecoin', type: 'CRYPTO' },
  { ticker: 'SOL', name: 'Solana', sector: 'Smart Contracts', type: 'CRYPTO' },
  { ticker: 'BNB', name: 'BNB', sector: 'Exchange Token', type: 'CRYPTO' },
  { ticker: 'XRP', name: 'XRP', sector: 'Pagamentos', type: 'CRYPTO' },
  { ticker: 'USDC', name: 'USD Coin', sector: 'Stablecoin', type: 'CRYPTO' },
  { ticker: 'ADA', name: 'Cardano', sector: 'Smart Contracts', type: 'CRYPTO' },
  { ticker: 'AVAX', name: 'Avalanche', sector: 'Smart Contracts', type: 'CRYPTO' },
  { ticker: 'DOGE', name: 'Dogecoin', sector: 'Meme', type: 'CRYPTO' },
  { ticker: 'DOT', name: 'Polkadot', sector: 'Infraestrutura', type: 'CRYPTO' },
  { ticker: 'MATIC', name: 'Polygon', sector: 'Layer 2', type: 'CRYPTO' },
  { ticker: 'LINK', name: 'Chainlink', sector: 'Oracles', type: 'CRYPTO' },
  { ticker: 'UNI', name: 'Uniswap', sector: 'DeFi', type: 'CRYPTO' },
  { ticker: 'LTC', name: 'Litecoin', sector: 'Criptomoedas', type: 'CRYPTO' },
  { ticker: 'ATOM', name: 'Cosmos', sector: 'Infraestrutura', type: 'CRYPTO' },
  { ticker: 'ETC', name: 'Ethereum Classic', sector: 'Criptomoedas', type: 'CRYPTO' },
  { ticker: 'XLM', name: 'Stellar', sector: 'Pagamentos', type: 'CRYPTO' },
  { ticker: 'NEAR', name: 'NEAR Protocol', sector: 'Smart Contracts', type: 'CRYPTO' },
  { ticker: 'AAVE', name: 'Aave', sector: 'DeFi', type: 'CRYPTO' },
];

export const searchCryptoAssets = (query: string): CryptoAsset[] => {
  if (!query || query.length < 1) return [];
  const q = query.toUpperCase().trim();
  
  const results = CRYPTO_ASSETS.filter(
    s => s.ticker.startsWith(q) || s.name.toUpperCase().includes(q)
  );

  if (results.length === 0 && q.length >= 2) {
    return [{
      ticker: q,
      name: `Cripto detectada: ${q}`,
      sector: 'Criptomoedas',
      type: 'CRYPTO'
    }];
  }

  return results.slice(0, 8);
};
