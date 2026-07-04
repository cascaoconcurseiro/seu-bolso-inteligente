// ============================================================
// CORRETORAS E INSTITUIÇÕES DE INVESTIMENTO
// BR: principais do mercado brasileiro
// ABROAD: principais para brasileiros investindo no exterior
// ============================================================

export interface Broker {
  id: string;
  name: string;
  shortName: string;
  color: string;
  textColor: string;
  icon: string; // emoji ou inicial
  location: "BR" | "ABROAD" | "BOTH";
  website?: string;
}

export const BR_BROKERS: Broker[] = [
  {
    id: "xp",
    name: "XP Investimentos",
    shortName: "XP",
    color: "#FF6B00",
    textColor: "#fff",
    icon: "XP",
    location: "BR",
  },
  {
    id: "clear",
    name: "Clear Corretora",
    shortName: "Clear",
    color: "#1A1A1A",
    textColor: "#fff",
    icon: "CL",
    location: "BR",
  },
  {
    id: "rico",
    name: "Rico Investimentos",
    shortName: "Rico",
    color: "#00C896",
    textColor: "#fff",
    icon: "RI",
    location: "BR",
  },
  {
    id: "inter",
    name: "Inter Invest",
    shortName: "Inter",
    color: "#FF6B00",
    textColor: "#fff",
    icon: "IN",
    location: "BR",
  },
  {
    id: "nu_invest",
    name: "Nu Invest (Easynvest)",
    shortName: "NuInvest",
    color: "#820AD1",
    textColor: "#fff",
    icon: "NU",
    location: "BR",
  },
  {
    id: "btg",
    name: "BTG Pactual Digital",
    shortName: "BTG",
    color: "#003087",
    textColor: "#fff",
    icon: "BT",
    location: "BR",
  },
  {
    id: "warren",
    name: "Warren Investimentos",
    shortName: "Warren",
    color: "#2D2D2D",
    textColor: "#fff",
    icon: "WA",
    location: "BR",
  },
  {
    id: "modal",
    name: "Modal Mais",
    shortName: "Modal",
    color: "#0066CC",
    textColor: "#fff",
    icon: "MD",
    location: "BR",
  },
  {
    id: "genial",
    name: "Genial Investimentos",
    shortName: "Genial",
    color: "#E8001C",
    textColor: "#fff",
    icon: "GN",
    location: "BR",
  },
  {
    id: "terra",
    name: "Terra Investimentos",
    shortName: "Terra",
    color: "#00703C",
    textColor: "#fff",
    icon: "TE",
    location: "BR",
  },
  {
    id: "ativa",
    name: "Ativa Investimentos",
    shortName: "Ativa",
    color: "#1B4F8A",
    textColor: "#fff",
    icon: "AT",
    location: "BR",
  },
  {
    id: "agora",
    name: "Ágora Investimentos",
    shortName: "Ágora",
    color: "#0075C9",
    textColor: "#fff",
    icon: "AG",
    location: "BR",
  },
  {
    id: "itau",
    name: "Itaú Corretora",
    shortName: "Itaú",
    color: "#003399",
    textColor: "#FF6600",
    icon: "IT",
    location: "BR",
  },
  {
    id: "bradesco",
    name: "Bradesco Corretora",
    shortName: "Bradesco",
    color: "#CC092F",
    textColor: "#fff",
    icon: "BD",
    location: "BR",
  },
  {
    id: "bb",
    name: "Banco do Brasil Corretora",
    shortName: "BB",
    color: "#FFCC00",
    textColor: "#003366",
    icon: "BB",
    location: "BR",
  },
  {
    id: "santander",
    name: "Santander Corretora",
    shortName: "Santander",
    color: "#CC0000",
    textColor: "#fff",
    icon: "ST",
    location: "BR",
  },
  {
    id: "caixa",
    name: "Caixa Econômica Corretora",
    shortName: "Caixa",
    color: "#006BB6",
    textColor: "#FF8C00",
    icon: "CE",
    location: "BR",
  },
  {
    id: "c6_invest",
    name: "C6 Invest",
    shortName: "C6",
    color: "#242424",
    textColor: "#fff",
    icon: "C6",
    location: "BR",
  },
  {
    id: "sicredi",
    name: "Sicredi Corretora",
    shortName: "Sicredi",
    color: "#00733E",
    textColor: "#fff",
    icon: "SC",
    location: "BR",
  },
  {
    id: "sofisa",
    name: "Sofisa Direto",
    shortName: "Sofisa",
    color: "#7B2D8B",
    textColor: "#fff",
    icon: "SO",
    location: "BR",
  },
  {
    id: "outros_br",
    name: "Outra corretora brasileira",
    shortName: "Outro",
    color: "#888",
    textColor: "#fff",
    icon: "?",
    location: "BR",
  },
];

export const ABROAD_BROKERS: Broker[] = [
  {
    id: "avenue",
    name: "Avenue Securities",
    shortName: "Avenue",
    color: "#1C3A7A",
    textColor: "#fff",
    icon: "AV",
    location: "ABROAD",
  },
  {
    id: "interactive_brokers",
    name: "Interactive Brokers",
    shortName: "IBKR",
    color: "#C8102E",
    textColor: "#fff",
    icon: "IB",
    location: "ABROAD",
  },
  {
    id: "td_ameritrade",
    name: "TD Ameritrade",
    shortName: "TD",
    color: "#00A651",
    textColor: "#fff",
    icon: "TD",
    location: "ABROAD",
  },
  {
    id: "charles_schwab",
    name: "Charles Schwab",
    shortName: "Schwab",
    color: "#00549F",
    textColor: "#fff",
    icon: "CS",
    location: "ABROAD",
  },
  {
    id: "fidelity",
    name: "Fidelity Investments",
    shortName: "Fidelity",
    color: "#4C7B1B",
    textColor: "#fff",
    icon: "FI",
    location: "ABROAD",
  },
  {
    id: "etoro",
    name: "eToro",
    shortName: "eToro",
    color: "#4CAF50",
    textColor: "#fff",
    icon: "ET",
    location: "ABROAD",
  },
  {
    id: "stake",
    name: "Stake",
    shortName: "Stake",
    color: "#00C853",
    textColor: "#fff",
    icon: "SK",
    location: "ABROAD",
  },
  {
    id: "passfolio",
    name: "Passfolio",
    shortName: "Passfolio",
    color: "#6C63FF",
    textColor: "#fff",
    icon: "PF",
    location: "ABROAD",
  },
  {
    id: "trading212",
    name: "Trading 212",
    shortName: "T212",
    color: "#00D09C",
    textColor: "#fff",
    icon: "T2",
    location: "ABROAD",
  },
  {
    id: "revolut",
    name: "Revolut",
    shortName: "Revolut",
    color: "#191C1F",
    textColor: "#fff",
    icon: "RV",
    location: "ABROAD",
  },
  {
    id: "outros_abroad",
    name: "Outra corretora estrangeira",
    shortName: "Outro",
    color: "#888",
    textColor: "#fff",
    icon: "?",
    location: "ABROAD",
  },
];

export const getBrokersByLocation = (location: "BR" | "ABROAD"): Broker[] => {
  return location === "BR" ? BR_BROKERS : ABROAD_BROKERS;
};

export const getBrokerById = (id: string): Broker | undefined => {
  return [...BR_BROKERS, ...ABROAD_BROKERS].find((b) => b.id === id);
};

export const isCustomBroker = (brokerId: string): boolean => {
  return brokerId === "outros_br" || brokerId === "outros_abroad" || brokerId === "custom";
};
