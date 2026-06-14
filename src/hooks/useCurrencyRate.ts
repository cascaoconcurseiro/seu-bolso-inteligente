import { useQuery } from "@tanstack/react-query";
import { getCurrencyRate, getMultipleCurrencyRates } from "@/services/currencyService";

export function useCurrencyRate(currencyCode: string, targetCode: string = "BRL") {
  return useQuery({
    queryKey: ["currency-rate", currencyCode, targetCode],
    queryFn: () => getCurrencyRate(currencyCode, targetCode),
    enabled: !!currencyCode && currencyCode !== targetCode,
    staleTime: 1000 * 60 * 15, // 15 minutos
    refetchInterval: 1000 * 60 * 15, // Refaz o fetch a cada 15 min automaticamente
  });
}

export function useMultipleCurrencyRates(currencyCodes: string[], targetCode: string = "BRL") {
  return useQuery({
    queryKey: ["currency-rates", currencyCodes.sort().join(","), targetCode],
    queryFn: () => getMultipleCurrencyRates(currencyCodes, targetCode),
    enabled: currencyCodes.length > 0,
    staleTime: 1000 * 60 * 15,
    refetchInterval: 1000 * 60 * 15,
  });
}
