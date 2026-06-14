import { useQuery } from "@tanstack/react-query";
import { bcbService, EconomicIndicator } from "@/services/bcbService";

export interface EconomicIndicatorsData {
  ipca: EconomicIndicator | null;
  selic: EconomicIndicator | null;
  cdi: EconomicIndicator | null;
}

export function useEconomicIndicators() {
  return useQuery({
    queryKey: ["economic-indicators"],
    queryFn: async (): Promise<EconomicIndicatorsData> => {
      const [ipca, selic, cdi] = await Promise.all([
        bcbService.getIPCA(),
        bcbService.getSelic(),
        bcbService.getCDI(),
      ]);

      // Fallbacks graciosos caso a API falhe, baseados na média histórica recente
      return {
        ipca: ipca || { date: "Atual", value: 4.5 },
        selic: selic || { date: "Atual", value: 10.5 },
        cdi: cdi || { date: "Atual", value: 10.4 },
      };
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 horas. Esses indicadores demoram dias/meses para mudar
    refetchOnWindowFocus: false, // Evita requisições à API pública desnecessariamente
  });
}
