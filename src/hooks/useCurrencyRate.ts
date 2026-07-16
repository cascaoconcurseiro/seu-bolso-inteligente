import { useQuery } from "@tanstack/react-query";
import { getCurrencyRate } from "@/services/currencyService";

export function useCurrencyRate(currencyCode: string, targetCode: string = "BRL") {
  return useQuery({
    queryKey: ["currency-rate", currencyCode, targetCode],
    queryFn: () => getCurrencyRate(currencyCode, targetCode),
    enabled: !!currencyCode && currencyCode !== targetCode,
    staleTime: 1000 * 60 * 15,
    refetchInterval: 1000 * 60 * 15,
    retry: 1,
    retryDelay: 3000,
  });
}
