import { QueryClient } from "@tanstack/react-query";

/**
 * Instância única do QueryClient compartilhada entre App e AuthContext.
 * Centralizada aqui para evitar dependência circular.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 60 * 24,
      refetchOnWindowFocus: false,
    },
  },
});
