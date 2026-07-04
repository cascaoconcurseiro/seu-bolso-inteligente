import { logger } from "@/utils/logger";

export interface EconomicIndicator {
  date: string;
  value: number;
}

const seriesCodes: Record<string, number> = { ipca: 13522, selic: 432, cdi: 4389 };

async function fetchIndicator(
  indicator: "ipca" | "selic" | "cdi"
): Promise<EconomicIndicator | null> {
  try {
    const code = seriesCodes[indicator];
    const response = await fetch(
      `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados/ultimos/1?formato=json`
    );
    if (!response.ok) throw new Error(`BCB HTTP ${response.status}`);
    const data = await response.json();
    if (data?.[0]) {
      return { date: data[0].data, value: parseFloat(data[0].valor.replace(",", ".")) };
    }
  } catch (error) {
    logger.error(`Falha ao buscar ${indicator} do BCB:`, error);
  }
  return null;
}

export const bcbService = {
  getIPCA: () => fetchIndicator("ipca"),
  getSelic: () => fetchIndicator("selic"),
  getCDI: () => fetchIndicator("cdi"),
};
