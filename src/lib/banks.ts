// Cores e logos reais de bancos brasileiros e bandeiras de cartão
// Using SVG-based logos for reliability

export interface BankConfig {
  id: string;
  name: string;
  color: string;
  textColor: string;
  icon: string; // Emoji or letter fallback
  isInternational?: boolean;
  currency?: string;
}

export interface CardBrandConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
}

// Bancos brasileiros com cores reais
export const banks: Record<string, BankConfig> = {
  nubank: {
    id: "nubank",
    name: "Nubank",
    color: "#820AD1",
    textColor: "#FFFFFF",
    icon: "N",
  },
  inter: {
    id: "inter",
    name: "Inter",
    color: "#FF7A00",
    textColor: "#FFFFFF",
    icon: "I",
  },
  itau: {
    id: "itau",
    name: "Itaú",
    color: "#003A70",
    textColor: "#FFFFFF",
    icon: "I",
  },
  bradesco: {
    id: "bradesco",
    name: "Bradesco",
    color: "#CC092F",
    textColor: "#FFFFFF",
    icon: "B",
  },
  santander: {
    id: "santander",
    name: "Santander",
    color: "#EC0000",
    textColor: "#FFFFFF",
    icon: "S",
  },
  bb: {
    id: "bb",
    name: "Banco do Brasil",
    color: "#FFCC00",
    textColor: "#003882",
    icon: "BB",
  },
  caixa: {
    id: "caixa",
    name: "Caixa",
    color: "#005CA9",
    textColor: "#FFFFFF",
    icon: "C",
  },
  c6: {
    id: "c6",
    name: "C6 Bank",
    color: "#1A1A1A",
    textColor: "#FFFFFF",
    icon: "C6",
  },
  original: {
    id: "original",
    name: "Banco Original",
    color: "#00A651",
    textColor: "#FFFFFF",
    icon: "O",
  },
  next: {
    id: "next",
    name: "Next",
    color: "#00E676",
    textColor: "#000000",
    icon: "N",
  },
  picpay: {
    id: "picpay",
    name: "PicPay",
    color: "#21C25E",
    textColor: "#FFFFFF",
    icon: "P",
  },
  neon: {
    id: "neon",
    name: "Neon",
    color: "#00D6A3",
    textColor: "#FFFFFF",
    icon: "N",
  },
  pan: {
    id: "pan",
    name: "Banco Pan",
    color: "#00529B",
    textColor: "#FFFFFF",
    icon: "P",
  },
  sicredi: {
    id: "sicredi",
    name: "Sicredi",
    color: "#00573D",
    textColor: "#FFFFFF",
    icon: "S",
  },
  sicoob: {
    id: "sicoob",
    name: "Sicoob",
    color: "#003E1E",
    textColor: "#FFFFFF",
    icon: "S",
  },
  btg: {
    id: "btg",
    name: "BTG Pactual",
    color: "#001E50",
    textColor: "#FFFFFF",
    icon: "B",
  },
  xp: {
    id: "xp",
    name: "XP",
    color: "#000000",
    textColor: "#FFD100",
    icon: "XP",
  },
  mercadopago: {
    id: "mercadopago",
    name: "Mercado Pago",
    color: "#009EE3",
    textColor: "#FFFFFF",
    icon: "MP",
  },
  default: {
    id: "default",
    name: "Outro",
    color: "#6B7280",
    textColor: "#FFFFFF",
    icon: "$",
  },
};

// Bancos/Contas Internacionais
export const internationalBanks: Record<string, BankConfig> = {
  wise: {
    id: "wise",
    name: "Wise",
    color: "#9FE870",
    textColor: "#000000",
    icon: "W",
    isInternational: true,
  },
  nomad: {
    id: "nomad",
    name: "Nomad",
    color: "#00D4AA",
    textColor: "#FFFFFF",
    icon: "N",
    isInternational: true,
  },
  payoneer: {
    id: "payoneer",
    name: "Payoneer",
    color: "#FF4800",
    textColor: "#FFFFFF",
    icon: "P",
    isInternational: true,
  },
  revolut: {
    id: "revolut",
    name: "Revolut",
    color: "#0075EB",
    textColor: "#FFFFFF",
    icon: "R",
    isInternational: true,
  },
  paypal: {
    id: "paypal",
    name: "PayPal",
    color: "#003087",
    textColor: "#FFFFFF",
    icon: "PP",
    isInternational: true,
  },
  avenue: {
    id: "avenue",
    name: "Avenue",
    color: "#6C5CE7",
    textColor: "#FFFFFF",
    icon: "A",
    isInternational: true,
  },
  passfolio: {
    id: "passfolio",
    name: "Passfolio",
    color: "#00C853",
    textColor: "#FFFFFF",
    icon: "P",
    isInternational: true,
  },
  husky: {
    id: "husky",
    name: "Husky",
    color: "#1E3A5F",
    textColor: "#FFFFFF",
    icon: "H",
    isInternational: true,
  },
  remessa_online: {
    id: "remessa_online",
    name: "Remessa Online",
    color: "#00B4D8",
    textColor: "#FFFFFF",
    icon: "RO",
    isInternational: true,
  },
  bs2: {
    id: "bs2",
    name: "BS2",
    color: "#FF6B00",
    textColor: "#FFFFFF",
    icon: "BS",
    isInternational: true,
  },
  default_international: {
    id: "default_international",
    name: "Outra Conta Internacional",
    color: "#4A5568",
    textColor: "#FFFFFF",
    icon: "🌍",
    isInternational: true,
  },
};

// Bandeiras de cartão
export const cardBrands: Record<string, CardBrandConfig> = {
  visa: {
    id: "visa",
    name: "Visa",
    icon: "V",
    color: "#1A1F71",
  },
  mastercard: {
    id: "mastercard",
    name: "Mastercard",
    icon: "M",
    color: "#EB001B",
  },
  elo: {
    id: "elo",
    name: "Elo",
    icon: "E",
    color: "#FFCB05",
  },
  amex: {
    id: "amex",
    name: "American Express",
    icon: "A",
    color: "#006FCF",
  },
  hipercard: {
    id: "hipercard",
    name: "Hipercard",
    icon: "H",
    color: "#B3131B",
  },
  diners: {
    id: "diners",
    name: "Diners Club",
    icon: "D",
    color: "#0079BE",
  },
};

// Função para obter config do banco pelo nome ou ID
export function getBankByName(name: string): BankConfig {
  if (!name) return banks.default;
  
  const normalizedName = name.toLowerCase().replace(/\s+/g, "");
  
  // Busca direta pelo ID
  if (banks[normalizedName]) {
    return banks[normalizedName];
  }
  
  // Busca parcial pelo nome
  const found = Object.values(banks).find(
    (bank) => 
      bank.name.toLowerCase().includes(normalizedName) ||
      normalizedName.includes(bank.id) ||
      bank.name.toLowerCase().replace(/\s+/g, "") === normalizedName
  );
  
  return found || banks.default;
}

// Função para obter config do banco pelo ID
export function getBankById(id: string | null): BankConfig {
  if (!id) return banks.default;
  // Busca primeiro em bancos nacionais, depois em internacionais
  return banks[id] || internationalBanks[id] || banks.default;
}

// Função para obter banco internacional pelo ID
export function getInternationalBankById(id: string | null): BankConfig {
  if (!id) return internationalBanks.default_international;
  return internationalBanks[id] || internationalBanks.default_international;
}

// Função para obter bandeira pelo nome
export function getCardBrand(name: string): CardBrandConfig | null {
  if (!name) return null;
  
  const normalizedName = name.toLowerCase().replace(/\s+/g, "");
  
  if (cardBrands[normalizedName]) {
    return cardBrands[normalizedName];
  }
  
  const found = Object.values(cardBrands).find(
    (brand) => 
      brand.name.toLowerCase().includes(normalizedName) ||
      normalizedName.includes(brand.id)
  );
  
  return found || null;
}

// Componente de ícone do banco (para usar em JSX)
export function getBankIconStyles(bankId: string | null) {
  const bank = getBankById(bankId);
  return {
    backgroundColor: bank.color,
    color: bank.textColor,
    text: bank.icon,
  };
}
