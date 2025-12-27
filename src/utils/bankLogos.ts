// Logos dos bancos brasileiros baixados do Figma
// https://www.figma.com/design/L5GXVGy8GZrXTow73pl826/Brazilian-Banks-Logos--Community-

export const BANK_LOGOS = {
  agibank: '/bank-logos/agibank.png',
  bmg: '/bank-logos/banco-bmg.png',
  daycoval: '/bank-logos/banco-daycoval.png',
  bb: '/bank-logos/banco-do-brasil.png',
  banrisul: '/bank-logos/banco-do-estado-do-rio-grande-do-sul-banrisul.png',
  bnb: '/bank-logos/banco-do-nordeste-bnb.png',
  mercantil: '/bank-logos/banco-mercantil.png',
  pan: '/bank-logos/banco-pan.png',
  safra: '/bank-logos/banco-safra.png',
  btg: '/bank-logos/btg-pactual.png',
  caixa: '/bank-logos/caixa-econ-mica-federal.png',
  genial: '/bank-logos/genial.png',
  inter: '/bank-logos/inter.png',
  itau: '/bank-logos/ita-unibanco.png',
  iti: '/bank-logos/iti.png',
  mercadopago: '/bank-logos/mercado-pago.png',
  neon: '/bank-logos/neon.png',
  nubank: '/bank-logos/nubank.png',
  picpay: '/bank-logos/picpay.png',
  santander: '/bank-logos/santander.png',
  sicoob: '/bank-logos/sicoob.png',
  sicredi: '/bank-logos/sicredi.png',
  will: '/bank-logos/will-bank.png',
  xp: '/bank-logos/xp-investimentos.png',
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
  };
  
  const code = aliases[normalized] || normalized as BankCode;
  return BANK_LOGOS[code];
}
