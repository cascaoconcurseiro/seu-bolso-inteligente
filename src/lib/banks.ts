// Cores e logos reais de bancos brasileiros e bandeiras de cartão

export interface BankConfig {
  id: string;
  name: string;
  color: string;
  logoUrl: string;
}

export interface CardBrandConfig {
  id: string;
  name: string;
  logoUrl: string;
}

// Bancos brasileiros com cores e logos reais (via CDN clearbit/logo.dev)
export const banks: Record<string, BankConfig> = {
  nubank: {
    id: "nubank",
    name: "Nubank",
    color: "#820AD1",
    logoUrl: "https://logo.clearbit.com/nubank.com.br",
  },
  inter: {
    id: "inter",
    name: "Inter",
    color: "#FF7A00",
    logoUrl: "https://logo.clearbit.com/bancointer.com.br",
  },
  itau: {
    id: "itau",
    name: "Itaú",
    color: "#003A70",
    logoUrl: "https://logo.clearbit.com/itau.com.br",
  },
  bradesco: {
    id: "bradesco",
    name: "Bradesco",
    color: "#CC092F",
    logoUrl: "https://logo.clearbit.com/bradesco.com.br",
  },
  santander: {
    id: "santander",
    name: "Santander",
    color: "#EC0000",
    logoUrl: "https://logo.clearbit.com/santander.com.br",
  },
  bb: {
    id: "bb",
    name: "Banco do Brasil",
    color: "#FFCC00",
    logoUrl: "https://logo.clearbit.com/bb.com.br",
  },
  caixa: {
    id: "caixa",
    name: "Caixa",
    color: "#005CA9",
    logoUrl: "https://logo.clearbit.com/caixa.gov.br",
  },
  c6: {
    id: "c6",
    name: "C6 Bank",
    color: "#1A1A1A",
    logoUrl: "https://logo.clearbit.com/c6bank.com.br",
  },
  original: {
    id: "original",
    name: "Banco Original",
    color: "#00A651",
    logoUrl: "https://logo.clearbit.com/original.com.br",
  },
  next: {
    id: "next",
    name: "Next",
    color: "#00E676",
    logoUrl: "https://logo.clearbit.com/next.me",
  },
  picpay: {
    id: "picpay",
    name: "PicPay",
    color: "#21C25E",
    logoUrl: "https://logo.clearbit.com/picpay.com",
  },
  neon: {
    id: "neon",
    name: "Neon",
    color: "#00D6A3",
    logoUrl: "https://logo.clearbit.com/neon.com.br",
  },
  pan: {
    id: "pan",
    name: "Banco Pan",
    color: "#00529B",
    logoUrl: "https://logo.clearbit.com/bancopan.com.br",
  },
  sicredi: {
    id: "sicredi",
    name: "Sicredi",
    color: "#00573D",
    logoUrl: "https://logo.clearbit.com/sicredi.com.br",
  },
  sicoob: {
    id: "sicoob",
    name: "Sicoob",
    color: "#003E1E",
    logoUrl: "https://logo.clearbit.com/sicoob.com.br",
  },
  btg: {
    id: "btg",
    name: "BTG Pactual",
    color: "#001E50",
    logoUrl: "https://logo.clearbit.com/btgpactual.com",
  },
  xp: {
    id: "xp",
    name: "XP",
    color: "#FFD100",
    logoUrl: "https://logo.clearbit.com/xpi.com.br",
  },
  mercadopago: {
    id: "mercadopago",
    name: "Mercado Pago",
    color: "#009EE3",
    logoUrl: "https://logo.clearbit.com/mercadopago.com.br",
  },
  default: {
    id: "default",
    name: "Outro",
    color: "#6B7280",
    logoUrl: "",
  },
};

// Bandeiras de cartão com logos reais
export const cardBrands: Record<string, CardBrandConfig> = {
  visa: {
    id: "visa",
    name: "Visa",
    logoUrl: "https://logo.clearbit.com/visa.com",
  },
  mastercard: {
    id: "mastercard",
    name: "Mastercard",
    logoUrl: "https://logo.clearbit.com/mastercard.com",
  },
  elo: {
    id: "elo",
    name: "Elo",
    logoUrl: "https://logo.clearbit.com/elo.com.br",
  },
  amex: {
    id: "amex",
    name: "American Express",
    logoUrl: "https://logo.clearbit.com/americanexpress.com",
  },
  hipercard: {
    id: "hipercard",
    name: "Hipercard",
    logoUrl: "https://logo.clearbit.com/hipercard.com.br",
  },
  diners: {
    id: "diners",
    name: "Diners Club",
    logoUrl: "https://logo.clearbit.com/dinersclub.com",
  },
};

// Função para obter config do banco pelo nome
export function getBankByName(name: string): BankConfig {
  const normalizedName = name.toLowerCase().replace(/\s+/g, "");
  
  // Busca direta
  if (banks[normalizedName]) {
    return banks[normalizedName];
  }
  
  // Busca parcial
  const found = Object.values(banks).find(
    (bank) => bank.name.toLowerCase().includes(normalizedName) ||
              normalizedName.includes(bank.id)
  );
  
  return found || banks.default;
}

// Função para obter bandeira pelo nome
export function getCardBrand(name: string): CardBrandConfig | null {
  const normalizedName = name.toLowerCase().replace(/\s+/g, "");
  
  if (cardBrands[normalizedName]) {
    return cardBrands[normalizedName];
  }
  
  const found = Object.values(cardBrands).find(
    (brand) => brand.name.toLowerCase().includes(normalizedName) ||
               normalizedName.includes(brand.id)
  );
  
  return found || null;
}
