/**
 * React Query Configuration Utilities
 * Centralized query configuration to ensure consistency
 *
 * AUDITORIA 2026-05-10: Corrigido staleTime de 0 para 30s.
 * Com staleTime: 0, toda troca de aba no app disparava refetch de TODAS as queries,
 * causando lentidão visível especialmente no módulo Compartilhados.
 * Com 30s, dados são reaproveitados por 30 segundos e invalidados explicitamente
 * após mutações (create/update/delete) via invalidateQueries.
 */

import { keepPreviousData } from "@tanstack/react-query";

/**
 * Default query configuration
 * staleTime: 30s — evita refetch desnecessário ao navegar entre abas.
 * refetchOnWindowFocus: false — evita refetch ao voltar ao app no celular.
 * retry: 1 — tenta uma vez em caso de falha de rede (ex: 3G instável).
 */
export const defaultQueryConfig = {
  staleTime: 30 * 1000, // 30 segundos
  refetchOnMount: true as const,
  refetchOnWindowFocus: false,
  retry: 1,
  placeholderData: keepPreviousData,
};
