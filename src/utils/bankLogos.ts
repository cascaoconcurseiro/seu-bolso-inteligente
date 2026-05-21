// Logos dos bancos brasileiros baixados do repositório
// https://github.com/Tgentil/Bancos-em-SVG

// ============================================
// LOGOS DE BANCOS BRASILEIROS
// ============================================
export const BANK_LOGOS = {
  // Principais bancos digitais
  nubank: '/banks/nubank.svg',
  inter: '/banks/inter.svg',
  neon: '/banks/neon.svg',
  c6: '/banks/c6.svg',
  picpay: '/banks/picpay.svg',
  mercadopago: '/banks/mercadopago.svg',
  pagbank: '/banks/pagbank.svg',
  stone: '/banks/stone.svg',
  iti: '/banks/itau.svg', // Iti é do Itaú
  next: '/banks/bradesco.svg', // Next é do Bradesco
  original: '/banks/original.svg',
  
  // Grandes bancos tradicionais
  itau: '/banks/itau.svg',
  bradesco: '/banks/bradesco.svg',
  bb: '/banks/banco-do-brasil.svg',
  caixa: '/banks/caixa.svg',
  santander: '/banks/santander.svg',
  
  // Bancos de investimento
  btg: '/banks/btg.svg',
  safra: '/banks/safra.svg',
  xp: '/banks/xp.svg',
  
  // Bancos médios
  pan: '/banks/banco-do-brasil.svg', // Fallback
  bv: '/banks/banco-bv-logo.svg',
  bmg: '/banks/banco-bmg-logo.svg',
  daycoval: '/banks/logo-Daycoval.svg',
  mercantil: '/banks/banco-mercantil-novo-azul.svg',
  modal: '/banks/banco-do-brasil.svg', // Fallback
  sofisa: '/banks/logo-banco-sofisa.svg',
  pine: '/banks/banco-pine.svg',
  rendimento: '/banks/banco rendimento logo nova .svg',
  fibra: '/banks/banco-do-brasil.svg', // Fallback
  paulista: '/banks/banco-paulista.svg',
  topazio: '/banks/logo-banco-topazio.svg',
  votorantim: '/banks/banco-do-brasil.svg', // Fallback
  industrial: '/banks/banco-do-brasil.svg', // Fallback
  indusval: '/banks/banco-do-brasil.svg', // Fallback
  master: '/banks/banco-do-brasil.svg', // Fallback
  abc: '/banks/logoabc.svg',
  alfa: '/banks/banco-do-brasil.svg', // Fallback
  bs2: '/banks/Banco_BS2.svg',
  
  // Bancos regionais
  banrisul: '/banks/banrisul.svg',
  brb: '/banks/brb-logo.svg',
  bnb: '/banks/Logo_BNB.svg',
  parana: '/banks/Logo_do_Banpará.svg',
  banese: '/banks/logo banese.svg',
  banestes: '/banks/banestes.svg',
  banpara: '/banks/banpara-logo-sem-fundo.svg',
  
  // Cooperativas
  sicoob: '/banks/sicoob.svg',
  sicredi: '/banks/sicredi.svg',
  
  // Outros
  genial: '/banks/banco-do-brasil.svg', // Fallback
  agibank: '/banks/banco-do-brasil.svg', // Fallback
  bndes: '/banks/banco-do-brasil.svg', // Fallback
  citibank: '/banks/bankofamerica-logo.svg',
  hsbc: '/banks/banco-do-brasil.svg', // Fallback
  ef: '/banks/logo-efi-bank-laranja.svg',
  
  // Bancos adicionais encontrados nas logos
  cora: '/banks/icone-cora-rosa-2500px.svg',
  contasimples: '/banks/conta-simples_logo-novo.svg',
  infinitepay: '/banks/InfitePay.svg',
  omni: '/banks/logo-omni.svg',
  pagseguro: '/banks/pagseguro.svg',
  transfeera: '/banks/transfeera-logo-verde-nova.svg',
  unicred: '/banks/unicred-centralizada.svg',
  uniprime: '/banks/uniprime.svg',
  tribanco: '/banks/logotribanco.svg',
  bnp: '/banks/logo-bnp.svg',
  quality: '/banks/quality-logo-cinza.svg',
  grafeno: '/banks/grafeno.svg',
  credisis: '/banks/credisis.svg',
  ailos: '/banks/logo-ailos.svg',
  letsbank: '/banks/Logo Letsbank.svg',
  bees: '/banks/BEESBank_Horizontal.svg',
  bib: '/banks/BIB-logo.svg',
  bkbank: '/banks/bkBank.svg',
  duepay: '/banks/Duepay.svg',
  iugo: '/banks/Iugo.svg',
  recargapay: '/banks/RecargaPay.svg',
  arbi: '/banks/Banco_Arbi .svg',
  contaip: '/banks/conta-ip.svg',
  mufg: '/banks/mufg-seeklogo.svg',
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
    
    // Novos bancos adicionados
    'contasimples': 'contasimples',
    'infinitepay': 'infinitepay',
    'recargapay': 'recargapay',
    'transfeera': 'transfeera',
    'letsbank': 'letsbank',
    'bkbank': 'bkbank',
    'duepay': 'duepay',
    'contaip': 'contaip',
    'bancoarbi': 'arbi',
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
