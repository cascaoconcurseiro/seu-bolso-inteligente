// Logos dos bancos brasileiros baixados do Figma
// https://www.figma.com/design/L5GXVGy8GZrXTow73pl826/Brazilian-Banks-Logos--Community-

export const BANK_LOGOS = {
  nubank: '/bank-logos/nubank.png',
  inter: '/bank-logos/inter.png',
  itau: '/bank-logos/ita-unibanco.png',
  bb: '/bank-logos/banco-do-brasil.png',
  caixa: '/bank-logos/caixa-econ-mica-federal.png',
  santander: '/bank-logos-all/santander-brasil.png',
  bradesco: '/bank-logos-all/bradesco.png',
  btg: '/bank-logos/btg-pactual.png',
  safra: '/bank-logos/banco-safra.png',
  pan: '/bank-logos/banco-pan.png',
  mercantil: '/bank-logos/banco-mercantil.png',
  daycoval: '/bank-logos/banco-daycoval.png',
  bmg: '/bank-logos/banco-bmg.png',
  bnb: '/bank-logos/banco-do-nordeste-bnb.png',
  banrisul: '/bank-logos/banco-do-estado-do-rio-grande-do-sul-banrisul.png',
  mercadopago: '/bank-logos/mercado-pago.png',
  picpay: '/bank-logos/picpay.png',
  neon: '/bank-logos/neon.png',
  iti: '/bank-logos/iti.png',
  c6: '/bank-logos-all/c6-bank.png',
  original: '/bank-logos-all/banco-original.png',
  next: '/bank-logos-all/banco-next.png',
  sicoob: '/bank-logos-all/sistema-de-cooperativas-de-cr-dito-do-brasil-sicoob.png',
  sicredi: '/bank-logos-all/sistema-de-cr-dito-cooperativo-sicredi.png',
  genial: '/bank-logos/genial.png',
  agibank: '/bank-logos/agibank.png',
  stone: '/bank-logos/stone.png',
  pagbank: '/bank-logos-all/pagbank.png',
  parana: '/bank-logos-all/paran-banco.png',
  brb: '/bank-logos-all/banco-de-bras-lia-brb.png',
  bv: '/bank-logos-all/banco-bv.png',
  digio: '/bank-logos-all/logo-digio.png',
  alfa: '/bank-logos-all/banco-alfa-1-1.png',
} as const;

export type BankCode = keyof typeof BANK_LOGOS;

// Helper para buscar logo por nome do banco
export function getBankLogo(bankName: string): string | undefined {
  const normalized = bankName.toLowerCase().replace(/\s+/g, '');
  
  // Mapeamento de nomes comuns
  const aliases: Record<string, BankCode> = {
    'bancodobrasil': 'bb',
    'caixaeconomica': 'caixa',
    'caixaeconomicafederal': 'caixa',
    'itauunibanco': 'itau',
    'itaú': 'itau',
    'btgpactual': 'btg',
    'bancopan': 'pan',
    'bancosafra': 'safra',
    'bancomercantil': 'mercantil',
    'bancodaycoval': 'daycoval',
    'bancointer': 'inter',
    'mercadopago': 'mercadopago',
    'xpinvestimentos': 'xp',
    'willbank': 'will',
    'c6bank': 'c6',
    'bancooriginal': 'original',
    'banconext': 'next',
    'paranabanco': 'parana',
  };
  
  const code = aliases[normalized] || normalized as BankCode;
  return BANK_LOGOS[code];
}
