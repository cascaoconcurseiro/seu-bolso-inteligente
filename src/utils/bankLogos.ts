// Logos dos bancos brasileiros baixados do Figma
// https://www.figma.com/design/PlaR6YeIs3ElRSx6NZeK7w/Brazilian-Banks-Logos--Community-

// ============================================
// LOGOS DE BANCOS BRASILEIROS
// ============================================
export const BANK_LOGOS = {
  // Principais bancos digitais
  nubank: '/bank-logos/nubank.png',
  inter: '/bank-logos/inter.png',
  neon: '/bank-logos/neon.png',
  c6: '/bank-logos/c6-bank.png',
  picpay: '/bank-logos/picpay.png',
  mercadopago: '/bank-logos/mercado-pago.png',
  pagbank: '/bank-logos/pagbank.png',
  stone: '/bank-logos/stone.png',
  iti: '/bank-logos/iti.png',
  next: '/bank-logos/banco-next.png',
  original: '/bank-logos/banco-original.png',
  
  // Grandes bancos tradicionais
  itau: '/bank-logos/itau-unibanco.svg',
  bradesco: '/bank-logos/bradesco.svg',
  bb: '/bank-logos/banco-do-brasil.png',
  caixa: '/bank-logos/caixa-economica-federal.png',
  santander: '/bank-logos/santander-brasil.svg',
  
  // Bancos de investimento
  btg: '/bank-logos/btg-pactual.svg',
  safra: '/bank-logos/banco-safra.svg',
  
  // Bancos médios
  pan: '/bank-logos/banco-pan.png',
  bv: '/bank-logos/banco-bv.png',
  bmg: '/bank-logos/banco-bmg.png',
  daycoval: '/bank-logos/banco-daycoval.png',
  mercantil: '/bank-logos/banco-mercantil.png',
  modal: '/bank-logos/banco-modal.png',
  sofisa: '/bank-logos/banco-sofisa.png',
  pine: '/bank-logos/banco-pine.png',
  rendimento: '/bank-logos/banco-rendimento.png',
  fibra: '/bank-logos/banco-fibra.png',
  paulista: '/bank-logos/banco-paulista.png',
  topazio: '/bank-logos/banco-topazio.png',
  votorantim: '/bank-logos/banco-votorantim.png',
  industrial: '/bank-logos/banco-industrial.png',
  indusval: '/bank-logos/banco-indusval.png',
  master: '/bank-logos/banco-master.png',
  abc: '/bank-logos/banco-abc.png',
  alfa: '/bank-logos/banco-alfa.png',
  bs2: '/bank-logos/banco-bs2.png',
  
  // Bancos regionais
  banrisul: '/bank-logos/banrisul.png',
  brb: '/bank-logos/brb.png',
  bnb: '/bank-logos/banco-do-nordeste.png',
  parana: '/bank-logos/parana-banco.png',
  banese: '/bank-logos/banco-banese.png',
  banestes: '/bank-logos/banco-banestes.png',
  banpara: '/bank-logos/banco-banpara.png',
  
  // Cooperativas
  sicoob: '/bank-logos/sicoob.png',
  sicredi: '/bank-logos/sicredi.png',
  
  // Outros
  genial: '/bank-logos/genial.png',
  agibank: '/bank-logos/agibank.png',
  bndes: '/bank-logos/bndes.png',
  citibank: '/bank-logos/citibank.png',
  hsbc: '/bank-logos/hsbc.png',
  ef: '/bank-logos/ef-bank.png',
} as const;

// ============================================
// LOGOS DE BANDEIRAS DE CARTÃO
// ============================================
export const CARD_BRAND_LOGOS = {
  visa: '/card-brands/visa.png',
  mastercard: '/card-brands/mastercard.png',
  elo: '/card-brands/elo.png',
  amex: '/card-brands/american-express.png',
  hipercard: '/card-brands/hipercard.png',
  diners: '/card-brands/diners.png',
  aura: '/card-brands/aura.png',
  discover: '/card-brands/discover.png',
  jcb: '/card-brands/jcb.png',
} as const;

export type BankCode = keyof typeof BANK_LOGOS;
export type CardBrandCode = keyof typeof CARD_BRAND_LOGOS;

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

// Helper para buscar logo de banco por nome ou ID
export function getBankLogo(bankName: string): string | undefined {
  if (!bankName) return undefined;
  
  const normalized = bankName.toLowerCase().replace(/\s+/g, '');
  
  // Mapeamento de nomes comuns e aliases
  const aliases: Record<string, BankCode> = {
    // Banco do Brasil
    'bancodobrasil': 'bb',
    'bb': 'bb',
    
    // Caixa
    'caixaeconomica': 'caixa',
    'caixaeconomicafederal': 'caixa',
    'cef': 'caixa',
    
    // Itaú
    'itauunibanco': 'itau',
    'itaú': 'itau',
    'itau': 'itau',
    
    // BTG
    'btgpactual': 'btg',
    'btg': 'btg',
    
    // Outros bancos
    'bancopan': 'pan',
    'bancosafra': 'safra',
    'bancomercantil': 'mercantil',
    'bancodaycoval': 'daycoval',
    'bancointer': 'inter',
    'bancobmg': 'bmg',
    'bancobv': 'bv',
    'bancooriginal': 'original',
    'banconext': 'next',
    'bancomodal': 'modal',
    'bancosofisa': 'sofisa',
    'bancopine': 'pine',
    'bancorendimento': 'rendimento',
    'bancofibra': 'fibra',
    'bancopaulista': 'paulista',
    'bancotopazio': 'topazio',
    'bancovotorantim': 'votorantim',
    'bancoindustrial': 'industrial',
    'bancoindusval': 'indusval',
    'bancomaster': 'master',
    'bancoabc': 'abc',
    'bancoalfa': 'alfa',
    'bancobs2': 'bs2',
    'bancobanese': 'banese',
    'bancobanestes': 'banestes',
    'bancobanpara': 'banpara',
    
    // Digitais
    'c6bank': 'c6',
    'mercadopago': 'mercadopago',
    'paranabanco': 'parana',
    
    // Regionais
    'bancodonordeste': 'bnb',
    'bancodoestadodoriograndedosul': 'banrisul',
    'bancodebrasilia': 'brb',
    
    // Cooperativas
    'sistemadecooperativasdecreditodobrasil': 'sicoob',
    'sistemadecreditocooperativo': 'sicredi',
  };
  
  // Busca direta
  if (BANK_LOGOS[normalized as BankCode]) {
    return BANK_LOGOS[normalized as BankCode];
  }
  
  // Busca por alias
  const code = aliases[normalized];
  if (code) {
    return BANK_LOGOS[code];
  }
  
  return undefined;
}

// Helper para buscar logo de bandeira de cartão
export function getCardBrandLogo(brandName: string): string | undefined {
  if (!brandName) return undefined;
  
  const normalized = brandName.toLowerCase().replace(/\s+/g, '');
  
  // Mapeamento de nomes comuns
  const aliases: Record<string, CardBrandCode> = {
    'americanexpress': 'amex',
    'dinersclub': 'diners',
    'diners': 'diners',
  };
  
  // Busca direta
  if (CARD_BRAND_LOGOS[normalized as CardBrandCode]) {
    return CARD_BRAND_LOGOS[normalized as CardBrandCode];
  }
  
  // Busca por alias
  const code = aliases[normalized];
  if (code) {
    return CARD_BRAND_LOGOS[code];
  }
  
  return undefined;
}
